import type { Context } from "hono";
import { auditar } from "../auditoria";
import { z } from "zod";

import type { Consulta } from "../banco";

import { comItens } from "./documentos";
import { conferirClienteEVeiculo, esquemaItemVendaApi, quantidadeApi, type ItemVendaApi, precificar, protegerValores, subirKm } from "./itens-venda";
import { camposPagamentos } from "./pagamentos-venda";
import { type Contexto, ErroApi, lerCorpo, type Variaveis, violaChaveEstrangeira } from "./util";
import { gravarVenda, quemSou } from "./venda-gravar";

const texto = (max: number) => z.string().trim().max(max, `No máximo ${max} caracteres.`);

/** Etapas que o carro percorre no pátio (entregue e cancelada são finais, com rota própria). */
export const ETAPAS = ["fila", "execucao", "aguardando_peca", "pronto"] as const;
type Etapa = (typeof ETAPAS)[number];
const ROTULO: Record<Etapa, string> = { fila: "Na fila", execucao: "Em execução", aguardando_peca: "Aguardando peça", pronto: "Pronto" };

const esquemaOrdemDireta = z.object({
  clienteId: z.uuid("Escolha o cliente."),
  veiculoId: z.uuid("Escolha o veículo."),
  km: z.number().int("Informe km inteiros.").min(0, "A quilometragem não pode ser negativa.").max(9_999_999, "Quilometragem alta demais."),
  problema: texto(500).min(1, "Conte o problema relatado pelo cliente."),
});

export function registrarRotasOrdens({ app, banco, exigirSessao, exigirPermissao }: Contexto) {
  const ver = [exigirSessao, exigirPermissao("ordens.ver")] as const;
  const editar = [exigirSessao, exigirPermissao("ordens.editar")] as const;
  // Trabalho no pátio (mecânico): etapa, peças usadas, laudo.
  const executar = [exigirSessao, exigirPermissao("ordens.executar")] as const;
  const pode = (c: Context<{ Variables: Variaveis }>, permissao: string) => (c.get("permissoes") as string[]).includes(permissao);

  async function carregar(id?: string) {
    const linhas = id
      ? await banco.consultar("select * from ordens where id = $1::uuid", [id]).catch(() => [])
      : await banco.consultar("select * from ordens order by criado_em desc");
    const docs = await comItens(banco.consultar, "ordem_itens", "ordem_id", linhas);
    const ids = docs.map((d) => String(d.id));
    const eventos = ids.length === 0 ? [] : await banco.consultar("select ordem_id, texto, quem, criado_em from ordem_eventos where ordem_id = any($1::uuid[]) order by criado_em, id", [ids]);
    return docs.map((d) => ({
      ...d,
      orcamentoId: d.orcamentoId ?? "",
      vendaId: d.vendaId ?? "",
      eventos: eventos.filter((e) => e.ordem_id === d.id).map((e) => ({ texto: e.texto, quem: e.quem, criadoEm: new Date(e.criado_em as string).toISOString() })),
    }));
  }
  async function buscar(id: string) {
    const [ordem] = await carregar(id);
    if (!ordem) throw new ErroApi(404, "Ordem de serviço não encontrada.");
    return ordem;
  }
  const enviar = (c: Context<{ Variables: Variaveis }>, ordens: Record<string, unknown>[]) => protegerValores(ordens, pode(c, "valores.ver"));
  const responder = async (c: Context<{ Variables: Variaveis }>, id: string, status: 200 | 201 = 200) => c.json(enviar(c, [await buscar(id)])[0], status);

  const registrar = (q: Consulta, ordemId: string, textoEvento: string, quem: string) =>
    q("insert into ordem_eventos (ordem_id, texto, quem) values ($1::uuid, $2, $3)", [ordemId, textoEvento, quem]);

  /** Trava a OS e confere que ainda está no pátio (não entregue nem cancelada). */
  async function travarAberta(q: Consulta, id: string) {
    const [ordem] = await q<{ id: string; numero: string; status: string; cliente_id: string; veiculo_id: string; km: number; orcamento_id: string | null; desconto_tipo: "valor" | "percentual"; desconto: string }>(
      "select * from ordens where id = $1::uuid for update",
      [id],
    );
    if (!ordem) throw new ErroApi(404, "Ordem de serviço não encontrada.");
    if (ordem.status === "entregue" || ordem.status === "cancelada") throw new ErroApi(409, `Esta OS já foi ${ordem.status === "entregue" ? "entregue" : "cancelada"}.`);
    return ordem;
  }
  const tocar = (q: Consulta, id: string) => q("update ordens set atualizado_em = now() where id = $1::uuid", [id]);

  app.get("/ordens", ...ver, async (c) => c.json(enviar(c, await carregar())));
  app.get("/ordens/:id", ...ver, async (c) => responder(c, c.req.param("id")));

  /** OS direta, sem orçamento (urgência): os itens entram depois e o valor sai no fim. */
  app.post("/ordens", ...editar, async (c) => {
    const dados = await lerCorpo(c, esquemaOrdemDireta);
    await conferirClienteEVeiculo(banco.consultar, dados.clienteId, dados.veiculoId);
    const id = await banco.transacao(async (q) => {
      const [nova] = await q<{ id: string }>("insert into ordens (cliente_id, veiculo_id, km, problema) values ($1, $2, $3, $4) returning id", [dados.clienteId, dados.veiculoId, dados.km, dados.problema]);
      await subirKm(q, dados.veiculoId, dados.km);
      await registrar(q, nova.id, "OS aberta sem orçamento.", quemSou(c));
      return nova.id;
    });
    return responder(c, id, 201);
  });

  /** Orçamento aprovado vira OS: copia cliente, veículo, km, problema, desconto e itens (aprovados). */
  app.post("/orcamentos/:id/ordem", ...editar, async (c) => {
    const orcamentoId = c.req.param("id");
    const id = await banco
      .transacao(async (q) => {
        const [orc] = await q<Record<string, unknown>>("select * from orcamentos where id = $1::uuid for update", [orcamentoId]).catch(() => []);
        if (!orc) throw new ErroApi(404, "Orçamento não encontrado.");
        if (orc.status !== "aprovado") throw new ErroApi(409, "Só orçamentos aprovados viram OS.");
        const [ativa] = await q<{ numero: string }>("select numero from ordens where orcamento_id = $1::uuid and status <> 'cancelada'", [orcamentoId]);
        if (ativa) throw new ErroApi(409, `Este orçamento já está na ${ativa.numero}.`);
        const [nova] = await q<{ id: string; numero: string }>(
          "insert into ordens (cliente_id, veiculo_id, km, problema, orcamento_id, desconto_tipo, desconto) values ($1, $2, $3, $4, $5, $6, $7) returning id, numero",
          [orc.cliente_id, orc.veiculo_id, orc.km, orc.problema, orcamentoId, orc.desconto_tipo, orc.desconto],
        );
        await q(
          `insert into ordem_itens (ordem_id, posicao, tipo, origem_id, descricao, unidade, quantidade, valor, situacao)
           select $1::uuid, posicao, tipo, origem_id, descricao, unidade, quantidade, valor, 'aprovado' from orcamento_itens where orcamento_id = $2::uuid`,
          [nova.id, orcamentoId],
        );
        await registrar(q, nova.id, `OS aberta a partir do orçamento ${String(orc.numero)}.`, quemSou(c));
        return nova.id;
      })
      .catch((erro) => {
        if ((erro as { code?: string }).code === "23505") throw new ErroApi(409, "Este orçamento já tem uma OS em andamento.");
        throw erro;
      });
    return responder(c, id, 201);
  });

  /** Mudança de etapa no pátio (o mecânico usa no celular). */
  app.patch("/ordens/:id/status", ...executar, async (c) => {
    const { status } = await lerCorpo(c, z.object({ status: z.enum(ETAPAS, "Etapa inválida.") }));
    const id = c.req.param("id");
    await banco.transacao(async (q) => {
      const ordem = await travarAberta(q, id);
      if (ordem.status === status) return;
      await q("update ordens set status = $1, atualizado_em = now() where id = $2::uuid", [status, id]);
      await registrar(q, id, `${ROTULO[ordem.status as Etapa] ?? ordem.status} → ${ROTULO[status]}.`, quemSou(c));
    });
    return responder(c, id);
  });

  app.put("/ordens/:id/laudo", ...executar, async (c) => {
    const { laudo } = await lerCorpo(c, z.object({ laudo: texto(2000) }));
    const id = c.req.param("id");
    await banco.transacao(async (q) => {
      await travarAberta(q, id);
      await q("update ordens set laudo = $1, atualizado_em = now() where id = $2::uuid", [laudo, id]);
      await registrar(q, id, "Laudo atualizado.", quemSou(c));
    });
    return responder(c, id);
  });

  /**
   * Peça ou serviço apontado na OS. Quem pode mexer em orçamento (recepção, gerência) já entra aprovado;
   * o que o mecânico aponta entra como extra pendente, até a recepção falar com o cliente.
   */
  app.post("/ordens/:id/itens", ...executar, async (c) => {
    const item = await lerCorpo(c, esquemaItemVendaApi);
    const id = c.req.param("id");
    const aprovaDireto = pode(c, "orcamentos.editar");
    try {
      await banco.transacao(async (q) => {
        await travarAberta(q, id);
        const [precificado] = (await precificar(q, { itens: [item], desconto: 0 }, pode(c, "valores.ver"))).itens as ItemVendaApi[];
        const [{ proxima }] = await q<{ proxima: number }>("select coalesce(max(posicao) + 1, 0) as proxima from ordem_itens where ordem_id = $1::uuid", [id]);
        await q(
          "insert into ordem_itens (ordem_id, posicao, tipo, origem_id, descricao, unidade, quantidade, valor, situacao, criado_por) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
          [id, proxima, precificado.tipo, precificado.origemId || null, precificado.descricao, precificado.unidade, precificado.quantidade, precificado.valor, aprovaDireto ? "aprovado" : "pendente", quemSou(c)],
        );
        await tocar(q, id);
        await registrar(q, id, `${aprovaDireto ? "Item incluído" : "Extra apontado (aguarda aprovação)"}: ${precificado.descricao}.`, quemSou(c));
      });
    } catch (erro) {
      if (violaChaveEstrangeira(erro)) throw new ErroApi(400, "Item não encontrado.");
      throw erro;
    }
    return responder(c, id, 201);
  });

  /** A recepção liga para o cliente e marca o extra como aprovado ou recusado. */
  app.patch("/ordens/:id/itens/:itemId", ...editar, async (c) => {
    if (!pode(c, "orcamentos.editar")) throw new ErroApi(403, "Só quem negocia com o cliente aprova extras.");
    const { situacao, valor, quantidade } = await lerCorpo(
      c,
      z.object({
        situacao: z.enum(["aprovado", "recusado"]),
        // Preço combinado com o cliente (o mecânico pode ter apontado avulso sem preço).
        valor: z.number().int("Informe o valor em centavos.").min(0).max(2_000_000_000).optional(),
        quantidade: quantidadeApi.optional(),
      }),
    );
    if (valor !== undefined && !pode(c, "valores.ver")) throw new ErroApi(403, "Sem permissão para definir valores.");
    const id = c.req.param("id");
    await banco.transacao(async (q) => {
      await travarAberta(q, id);
      const [item] = await q<{ descricao: string }>(
        "update ordem_itens set situacao = $1, valor = coalesce($4, valor), quantidade = coalesce($5, quantidade) where id = $2::uuid and ordem_id = $3::uuid returning descricao",
        [situacao, c.req.param("itemId"), id, valor ?? null, quantidade ?? null],
      ).catch(() => []);
      if (!item) throw new ErroApi(404, "Item não encontrado.");
      await tocar(q, id);
      await registrar(q, id, `${situacao === "aprovado" ? "Cliente aprovou" : "Cliente recusou"}: ${item.descricao}.`, quemSou(c));
    });
    return responder(c, id);
  });

  /** Tira um item: extra pendente pode ser tirado por quem apontou; item aprovado, só por quem negocia com o cliente. */
  app.delete("/ordens/:id/itens/:itemId", ...executar, async (c) => {
    const id = c.req.param("id");
    await banco.transacao(async (q) => {
      await travarAberta(q, id);
      const [item] = await q<{ situacao: string; descricao: string; criado_por: string }>("select situacao, descricao, criado_por from ordem_itens where id = $1::uuid and ordem_id = $2::uuid", [c.req.param("itemId"), id]).catch(() => []);
      if (!item) throw new ErroApi(404, "Item não encontrado.");
      const apontouEle = item.situacao === "pendente" && item.criado_por === quemSou(c);
      if (!apontouEle && !pode(c, "orcamentos.editar")) throw new ErroApi(403, "Só quem negocia com o cliente tira itens (o mecânico tira só o extra que ele mesmo apontou).");
      await q("delete from ordem_itens where id = $1::uuid", [c.req.param("itemId")]);
      await tocar(q, id);
      await registrar(q, id, `Item removido: ${item.descricao}.`, quemSou(c));
    });
    return responder(c, id);
  });

  /** Entrega: só com a OS pronta e sem extras pendentes. Gera a venda com os itens aprovados (o estoque baixa aqui). */
  app.post("/ordens/:id/entregar", ...editar, async (c) => {
    if (!pode(c, "vendas.editar")) throw new ErroApi(403, "Sem permissão para lançar a venda da entrega.");
    const corpo = await lerCorpo(c, z.object(camposPagamentos));
    const id = c.req.param("id");
    await banco
      .transacao(async (q) => {
        const ordem = await travarAberta(q, id);
        if (ordem.status !== "pronto") throw new ErroApi(409, "Marque a OS como pronta antes de entregar.");
        const itens = await q<Record<string, unknown>>("select * from ordem_itens where ordem_id = $1::uuid order by posicao", [id]);
        if (itens.some((i) => i.situacao === "pendente")) throw new ErroApi(409, "Há extras aguardando aprovação do cliente. Aprove ou recuse antes de entregar.");
        const aprovados: ItemVendaApi[] = itens
          .filter((i) => i.situacao === "aprovado")
          .map((i) => ({ tipo: i.tipo as "produto" | "servico", origemId: (i.origem_id as string | null) ?? "", descricao: String(i.descricao), unidade: String(i.unidade), quantidade: Number(i.quantidade), valor: Number(i.valor) }));
        if (aprovados.length === 0) throw new ErroApi(409, "A OS não tem itens aprovados para cobrar.");
        // Desconto em R$ vindo do orçamento não pode passar do que sobrou de itens (extras recusados, itens tirados).
        const subtotal = aprovados.reduce((s, i) => s + Math.round(i.quantidade * i.valor), 0);
        const desconto = ordem.desconto_tipo === "valor" ? Math.min(Number(ordem.desconto), subtotal) : Number(ordem.desconto);
        const venda = await gravarVenda(
          q,
          {
            clienteId: ordem.cliente_id, veiculoId: ordem.veiculo_id, km: Number(ordem.km), orcamentoId: ordem.orcamento_id ?? "",
            itens: aprovados, descontoTipo: ordem.desconto_tipo, desconto, observacoes: `Ordem de serviço ${ordem.numero}.`,
            pagamentos: corpo.pagamentos, divergencia: corpo.divergencia, parcelamento: corpo.parcelamento,
          },
          pode(c, "valores.ver"),
          quemSou(c),
        );
        await q("update ordens set status = 'entregue', venda_id = $1, entregue_em = now(), atualizado_em = now() where id = $2::uuid", [venda.id, id]);
        if (ordem.orcamento_id) await q("update orcamentos set status = 'convertido' where id = $1::uuid and status = 'aprovado'", [ordem.orcamento_id]);
        await registrar(q, id, `Entregue ao cliente. Venda ${venda.numero}.`, quemSou(c));
      })
      .catch((erro) => {
        if ((erro as Error).message?.startsWith("Produto não encontrado")) throw new ErroApi(400, "Um dos produtos da OS não existe mais no cadastro.");
        throw erro;
      });
    return responder(c, id);
  });

  app.post("/ordens/:id/cancelar", ...editar, async (c) => {
    const { motivo } = await lerCorpo(c, z.object({ motivo: texto(300) }));
    const id = c.req.param("id");
    await banco.transacao(async (q) => {
      const ordem = await travarAberta(q, id);
      await q("update ordens set status = 'cancelada', atualizado_em = now() where id = $1::uuid", [id]);
      await registrar(q, id, motivo ? `OS cancelada: ${motivo}` : "OS cancelada.", quemSou(c));
      await auditar(q, c, {
        categoria: "documentos",
        acao: "ordem.cancelada",
        descricao: `Cancelou a ${ordem.numero}${motivo ? `: ${motivo}` : "."}`,
        alvo: { tipo: "ordem", id },
        detalhes: { motivo, etapa: ordem.status },
      });
    });
    return responder(c, id);
  });
}
