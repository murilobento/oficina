import { z } from "zod";

import { auditar } from "../auditoria";
import { movimentar } from "../estoque";
import { quantidadeApi } from "./itens-venda";

import { comItens } from "./documentos";
import { type Contexto, ErroApi, lerCorpo, paraCamel, violaChaveEstrangeira } from "./util";

const texto = (max: number) => z.string().trim().max(max, `No máximo ${max} caracteres.`);

export const esquemaAcertoApi = z
  .object({
    motivo: texto(100).min(1, "Escolha o motivo."),
    observacoes: texto(500),
    itens: z
      .array(z.object({ produtoId: z.uuid("Produto inválido."), contado: z.union([z.literal(0), quantidadeApi], "A contagem não pode ser negativa.") }))
      .min(1, "Inclua ao menos um produto.")
      .max(5000, "Produtos demais."),
  })
  .refine((v) => new Set(v.itens.map((i) => i.produtoId)).size === v.itens.length, { path: ["itens"], message: "Há produtos repetidos." });

export function registrarRotasEstoque({ app, banco, exigirSessao, exigirPermissao }: Contexto) {
  const ver = [exigirSessao, exigirPermissao("estoque.ver")] as const;
  const editar = [exigirSessao, exigirPermissao("estoque.editar")] as const;

  app.get("/estoque/movimentos", ...ver, async (c) => {
    const produtoId = c.req.query("produtoId");
    const linhas = produtoId
      ? await banco.consultar("select * from movimentos_estoque where produto_id = $1::uuid order by criado_em desc, id limit 1000", [produtoId]).catch(() => [])
      : await banco.consultar("select * from movimentos_estoque order by criado_em desc, id limit 1000");
    return c.json(linhas.map((l) => paraCamel(l)));
  });

  async function carregar(id?: string) {
    const linhas = id
      ? await banco.consultar("select * from acertos where id = $1::uuid", [id]).catch(() => [])
      : await banco.consultar("select * from acertos order by criado_em desc");
    return comItens(banco.consultar, "acerto_itens", "acerto_id", linhas);
  }

  app.get("/estoque/acertos", ...ver, async (c) => c.json(await carregar()));

  app.get("/estoque/acertos/:id", ...ver, async (c) => {
    const [acerto] = await carregar(c.req.param("id"));
    if (!acerto) throw new ErroApi(404, "Acerto não encontrado.");
    return c.json(acerto);
  });

  app.post("/estoque/acertos", ...editar, async (c) => {
    const dados = await lerCorpo(c, esquemaAcertoApi);
    try {
      const id = await banco.transacao(async (q) => {
        const [acerto] = await q<{ id: string; numero: string }>("insert into acertos (motivo, observacoes) values ($1, $2) returning id, numero", [dados.motivo, dados.observacoes]);
        // Ordem fixa de produto: travar as linhas sempre na mesma ordem evita deadlock entre documentos simultâneos.
        const ordenados = [...dados.itens].sort((a, b) => (a.produtoId < b.produtoId ? -1 : 1));
        let posicao = 0;
        const conferidos: { produto: string; sistema: number; contado: number; diferenca: number }[] = [];
        for (const item of ordenados) {
          // Trava a linha: o saldo do sistema gravado é o que de fato foi corrigido.
          const [produto] = await q<{ descricao: string; unidade: string; saldo: string }>("select descricao, unidade, saldo from produtos where id = $1::uuid for update", [item.produtoId]);
          if (!produto) throw new ErroApi(400, "Produto não encontrado.");
          const saldoSistema = Number(produto.saldo);
          await q("insert into acerto_itens (acerto_id, posicao, produto_id, descricao, unidade, saldo_sistema, contado) values ($1, $2, $3, $4, $5, $6, $7)", [
            acerto.id, posicao++, item.produtoId, produto.descricao, produto.unidade, saldoSistema, item.contado,
          ]);
          const delta = Math.round((item.contado - saldoSistema) * 1000) / 1000;
          await movimentar(q, { produtoId: item.produtoId, delta, origem: "acerto", documento: acerto.numero, motivo: dados.motivo });
          conferidos.push({ produto: produto.descricao, sistema: saldoSistema, contado: item.contado, diferenca: delta });
        }
        const comDiferenca = conferidos.filter((item) => item.diferenca !== 0);
        const resumo = comDiferenca.length === 0 ? "sem diferenças" : `${comDiferenca.length} com diferença`;
        await auditar(q, c, {
          categoria: "estoque",
          acao: "estoque.acerto",
          descricao: `Fez o acerto ${acerto.numero} (${dados.motivo}): ${conferidos.length} ${conferidos.length === 1 ? "produto" : "produtos"}, ${resumo}.`,
          alvo: { tipo: "acerto", id: acerto.id },
          detalhes: { motivo: dados.motivo, observacoes: dados.observacoes, itens: comDiferenca },
        });
        return acerto.id;
      });
      return c.json((await carregar(id))[0], 201);
    } catch (erro) {
      if (violaChaveEstrangeira(erro)) throw new ErroApi(400, "Produto não encontrado.");
      throw erro;
    }
  });
}
