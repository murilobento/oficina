import { z } from "zod";

import { movimentar } from "../estoque";
import { quantidadeApi, somarPorProduto } from "./itens-venda";

import { comItens } from "./documentos";
import { type Contexto, ErroApi, lerCorpo, violaChaveEstrangeira } from "./util";

const texto = (max: number) => z.string().trim().max(max, `No máximo ${max} caracteres.`);
const centavos = (rotulo: string) => z.number().int("Informe o valor em centavos.").min(0, `${rotulo} não pode ser negativo.`).max(2_000_000_000, "Valor alto demais.");

export const esquemaCompraApi = z
  .object({
    fornecedorId: z.uuid("Escolha o fornecedor."),
    notaFiscal: texto(20),
    itens: z
      .array(
        z.object({
          produtoId: z.uuid("Produto inválido."),
          descricao: texto(150),
          unidade: texto(5),
          quantidade: quantidadeApi,
          custo: centavos("O custo").min(1, "Informe o custo unitário."),
        }),
      )
      .min(1, "Adicione ao menos um produto.")
      .max(200, "Itens demais."),
    frete: centavos("O frete"),
    desconto: centavos("O desconto"),
    observacoes: texto(500),
  })
  .superRefine((v, ctx) => {
    const subtotal = v.itens.reduce((soma, i) => soma + Math.round(i.quantidade * i.custo), 0);
    if (v.desconto > subtotal + v.frete) ctx.addIssue({ code: "custom", path: ["desconto"], message: "O desconto não pode ser maior que o total da compra." });
  });

export function registrarRotasCompras({ app, banco, exigirSessao, exigirPermissao }: Contexto) {
  const ver = [exigirSessao, exigirPermissao("compras.ver")] as const;
  const editar = [exigirSessao, exigirPermissao("compras.editar")] as const;

  /** Compra é só de quem vê valores: não há compra sem custo. */
  const exigirValores = (permissoes: string[]) => {
    if (!permissoes.includes("valores.ver")) throw new ErroApi(403, "Você não tem permissão para esta ação.");
  };

  async function carregar(ids?: string) {
    const linhas = ids
      ? await banco.consultar("select * from compras where id = $1::uuid", [ids]).catch(() => [])
      : await banco.consultar("select * from compras order by criado_em desc");
    return comItens(banco.consultar, "compra_itens", "compra_id", linhas);
  }

  /** Sem `valores.ver`, custos, frete e desconto saem zerados. */
  const proteger = (compras: Record<string, unknown>[], verValores: boolean) =>
    verValores
      ? compras
      : compras.map((c) => ({ ...c, frete: 0, desconto: 0, itens: (c.itens as Record<string, unknown>[]).map((i) => ({ ...i, custo: 0 })) }));

  app.get("/compras", ...ver, async (c) => c.json(proteger(await carregar(), c.get("permissoes").includes("valores.ver"))));

  app.get("/compras/:id", ...ver, async (c) => {
    const [compra] = await carregar(c.req.param("id"));
    if (!compra) throw new ErroApi(404, "Compra não encontrada.");
    return c.json(proteger([compra], c.get("permissoes").includes("valores.ver"))[0]);
  });

  app.post("/compras", ...editar, async (c) => {
    exigirValores(c.get("permissoes"));
    const dados = await lerCorpo(c, esquemaCompraApi);
    const [fornecedor] = await banco.consultar("select 1 from pessoas where id = $1::uuid and papel = 'fornecedor'", [dados.fornecedorId]);
    if (!fornecedor) throw new ErroApi(400, "Fornecedor não encontrado.", { fornecedorId: "Fornecedor não encontrado." });
    try {
      const id = await banco.transacao(async (q) => {
        const [compra] = await q<{ id: string; numero: string }>(
          "insert into compras (fornecedor_id, nota_fiscal, frete, desconto, observacoes) values ($1, $2, $3, $4, $5) returning id, numero",
          [dados.fornecedorId, dados.notaFiscal, dados.frete, dados.desconto, dados.observacoes],
        );
        let posicao = 0;
        for (const item of dados.itens) {
          await q("insert into compra_itens (compra_id, posicao, produto_id, descricao, unidade, quantidade, custo) values ($1, $2, $3, $4, $5, $6, $7)", [
            compra.id, posicao++, item.produtoId, item.descricao, item.unidade, item.quantidade, item.custo,
          ]);
        }
        for (const [produtoId, quantidade] of somarPorProduto(dados.itens)) {
          await movimentar(q, { produtoId, delta: quantidade, origem: "compra", documento: compra.numero, motivo: "" });
        }
        // O custo do produto passa a ser o da compra (se houver itens repetidos, vale o último).
        for (const item of dados.itens) await q("update produtos set custo = $1 where id = $2::uuid", [item.custo, item.produtoId]);
        return compra.id;
      });
      return c.json((await carregar(id))[0], 201);
    } catch (erro) {
      if (violaChaveEstrangeira(erro) || (erro as Error).message?.startsWith("Produto não encontrado")) throw new ErroApi(400, "Produto não encontrado.");
      throw erro;
    }
  });

  app.post("/compras/:id/cancelar", ...editar, async (c) => {
    const id = c.req.param("id");
    const [existe] = await banco.consultar("select 1 from compras where id = $1::uuid", [id]).catch(() => []);
    if (!existe) throw new ErroApi(404, "Compra não encontrada.");
    await banco.transacao(async (q) => {
      const [compra] = await q<{ numero: string }>("update compras set status = 'cancelada' where id = $1::uuid and status = 'concluida' returning numero", [id]);
      if (!compra) throw new ErroApi(409, "Esta compra já foi cancelada.");
      const itens = await q<{ produto_id: string; descricao: string; quantidade: string }>(
        "select produto_id, max(descricao) as descricao, sum(quantidade) as quantidade from compra_itens where compra_id = $1::uuid group by produto_id",
        [id],
      );
      itens.sort((a, b) => (a.produto_id < b.produto_id ? -1 : 1));
      const faltas: string[] = [];
      for (const item of itens) {
        const [produto] = await q<{ saldo: string }>("select saldo from produtos where id = $1::uuid for update", [item.produto_id]);
        if (Number(produto.saldo) < Number(item.quantidade)) faltas.push(`${item.descricao} (saldo ${Number(produto.saldo)}, comprado ${Number(item.quantidade)})`);
      }
      if (faltas.length > 0) throw new ErroApi(409, `Parte das peças desta compra já foi usada e não dá para cancelar: ${faltas.join("; ")}. Use um acerto de estoque.`);
      for (const item of itens) {
        await movimentar(q, { produtoId: item.produto_id, delta: -Number(item.quantidade), origem: "compra", documento: compra.numero, motivo: "Cancelamento da compra" });
      }
    });
    return c.json((await carregar(id))[0]);
  });
}
