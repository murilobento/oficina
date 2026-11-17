import type { Context } from "hono";
import { z } from "zod";

import { comItens } from "./documentos";
import { camposItensEDesconto, conferirClienteEVeiculo, gravarItens, precificar, precificarEdicao, protegerValores, subirKm, validarDescontoApi } from "./itens-venda";
import { type Contexto, ErroApi, lerCorpo, type Variaveis, violaChaveEstrangeira } from "./util";

const texto = (max: number) => z.string().trim().max(max, `No máximo ${max} caracteres.`);

export const esquemaOrcamentoApi = z
  .object({
    clienteId: z.uuid("Escolha o cliente."),
    veiculoId: z.uuid("Escolha o veículo."),
    km: z.number().int("Informe km inteiros.").min(0, "A quilometragem não pode ser negativa.").max(9_999_999, "Quilometragem alta demais."),
    problema: texto(500),
    ...camposItensEDesconto,
    validadeDias: z.number().int().min(1, "Entre 1 e 90 dias.").max(90, "Entre 1 e 90 dias."),
    observacoes: texto(500),
  })
  .superRefine(validarDescontoApi);

type Status = "rascunho" | "enviado" | "aprovado" | "recusado" | "convertido";
/** Mudanças de status que o usuário pode fazer; "convertido" só acontece ao gerar a venda. */
const TRANSICOES: Record<Status, Status[]> = {
  rascunho: ["enviado"],
  enviado: ["recusado", "aprovado"],
  aprovado: ["enviado"],
  recusado: ["rascunho"],
  convertido: [],
};

export function registrarRotasOrcamentos({ app, banco, exigirSessao, exigirPermissao }: Contexto) {
  const ver = [exigirSessao, exigirPermissao("orcamentos.ver")] as const;
  const editar = [exigirSessao, exigirPermissao("orcamentos.editar")] as const;

  async function carregar(id?: string) {
    const linhas = id
      ? await banco.consultar("select * from orcamentos where id = $1::uuid", [id]).catch(() => [])
      : await banco.consultar("select * from orcamentos order by criado_em desc");
    return comItens(banco.consultar, "orcamento_itens", "orcamento_id", linhas);
  }

  async function buscar(id: string) {
    const [orcamento] = await carregar(id);
    if (!orcamento) throw new ErroApi(404, "Orçamento não encontrado.");
    return orcamento;
  }

  app.get("/orcamentos", ...ver, async (c) => c.json(protegerValores(await carregar(), c.get("permissoes").includes("valores.ver"))));
  app.get("/orcamentos/:id", ...ver, async (c) => c.json(protegerValores([await buscar(c.req.param("id"))], c.get("permissoes").includes("valores.ver"))[0]));

  async function gravar(c: Context<{ Variables: Variaveis }>, id: string | null) {
    const verValores = c.get("permissoes").includes("valores.ver");
    const bruto = await lerCorpo(c, esquemaOrcamentoApi);
    await conferirClienteEVeiculo(banco.consultar, bruto.clienteId, bruto.veiculoId);
    try {
      return await banco.transacao(async (q) => {
        let docId = id;
        let dados = bruto;
        if (id) {
          const [atual] = await q<{ status: Status; desconto_tipo: "valor" | "percentual"; desconto: string }>("select status, desconto_tipo, desconto from orcamentos where id = $1::uuid for update", [id]);
          if (!atual) throw new ErroApi(404, "Orçamento não encontrado.");
          if (atual.status !== "rascunho" && atual.status !== "enviado") throw new ErroApi(409, "Este orçamento já foi aprovado ou encerrado e não pode mais ser alterado.");
          if (!verValores) {
            const anteriores = await q<{ tipo: string; origem_id: string | null; descricao: string; valor: number }>("select tipo, origem_id, descricao, valor from orcamento_itens where orcamento_id = $1::uuid", [id]);
            dados = await precificarEdicao(q, bruto, anteriores, atual);
          }
          await q(
            "update orcamentos set cliente_id=$1, veiculo_id=$2, km=$3, problema=$4, desconto_tipo=$5, desconto=$6, validade_dias=$7, observacoes=$8 where id=$9::uuid",
            [dados.clienteId, dados.veiculoId, dados.km, dados.problema, dados.descontoTipo, dados.desconto, dados.validadeDias, dados.observacoes, id],
          );
          await q("delete from orcamento_itens where orcamento_id = $1::uuid", [id]);
        } else {
          dados = await precificar(q, bruto, verValores);
          const [novo] = await q<{ id: string }>(
            "insert into orcamentos (cliente_id, veiculo_id, km, problema, desconto_tipo, desconto, validade_dias, observacoes) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id",
            [dados.clienteId, dados.veiculoId, dados.km, dados.problema, dados.descontoTipo, dados.desconto, dados.validadeDias, dados.observacoes],
          );
          docId = novo.id;
        }
        await gravarItens(q, "orcamento_itens", "orcamento_id", docId as string, dados.itens);
        await subirKm(q, dados.veiculoId, dados.km);
        return docId as string;
      });
    } catch (erro) {
      if (violaChaveEstrangeira(erro)) throw new ErroApi(400, "Cliente ou veículo não encontrado.");
      throw erro;
    }
  }

  app.post("/orcamentos", ...editar, async (c) => {
    const id = await gravar(c, null);
    return c.json(protegerValores([await buscar(id)], c.get("permissoes").includes("valores.ver"))[0], 201);
  });

  app.put("/orcamentos/:id", ...editar, async (c) => {
    await buscar(c.req.param("id"));
    const id = await gravar(c, c.req.param("id"));
    return c.json(protegerValores([await buscar(id)], c.get("permissoes").includes("valores.ver"))[0]);
  });

  app.patch("/orcamentos/:id/status", ...editar, async (c) => {
    const { status } = await lerCorpo(c, z.object({ status: z.enum(["rascunho", "enviado", "aprovado", "recusado"]) }));
    const atual = (await buscar(c.req.param("id"))) as { id: string; status: Status };
    if (!TRANSICOES[atual.status].includes(status)) throw new ErroApi(409, "Esta mudança de status não é possível a partir do status atual.");
    const mudou = await banco.consultar("update orcamentos set status = $1 where id = $2::uuid and status = $3 returning id", [status, atual.id, atual.status]);
    if (mudou.length === 0) throw new ErroApi(409, "O orçamento mudou enquanto você mexia. Atualize a tela.");
    return c.json(protegerValores([await buscar(atual.id)], c.get("permissoes").includes("valores.ver"))[0]);
  });

  /** Recomeça a validade a partir de agora (orçamento vencido ou perto de vencer). */
  app.post("/orcamentos/:id/renovar", ...editar, async (c) => {
    const atual = (await buscar(c.req.param("id"))) as { id: string; status: Status };
    if (atual.status !== "rascunho" && atual.status !== "enviado") throw new ErroApi(409, "Só orçamentos em rascunho ou enviados têm validade a renovar.");
    await banco.consultar("update orcamentos set criado_em = now() where id = $1::uuid", [atual.id]);
    return c.json(protegerValores([await buscar(atual.id)], c.get("permissoes").includes("valores.ver"))[0]);
  });

  app.delete("/orcamentos/:id", ...editar, async (c) => {
    const atual = await buscar(c.req.param("id"));
    try {
      await banco.consultar("delete from orcamentos where id = $1::uuid", [String(atual.id)]);
    } catch (erro) {
      if (violaChaveEstrangeira(erro)) throw new ErroApi(409, "Este orçamento gerou uma venda e não pode ser excluído.");
      throw erro;
    }
    return c.body(null, 204);
  });
}
