import type { Context } from "hono";
import { z } from "zod";

import type { Consulta } from "../banco";
import { movimentar } from "../estoque";

import { comItens } from "./documentos";
import { camposPagamentos, conferirPagamentos, contaDaVenda, esquemaNovoPagamento, gravarPagamentos, type PagamentoEntrada, totalDaVenda } from "./pagamentos-venda";
import { camposItensEDesconto, conferirClienteEVeiculo, gravarItens, type ItemVendaApi, precificar, protegerValores, somarPorProduto, subirKm, validarDescontoApi } from "./itens-venda";
import { type Contexto, ErroApi, lerCorpo, type Variaveis, violaChaveEstrangeira } from "./util";

const texto = (max: number) => z.string().trim().max(max, `No máximo ${max} caracteres.`);

export const esquemaVendaApi = z
  .object({
    /** Vazio = consumidor final (venda de balcão). */
    clienteId: z.union([z.literal(""), z.uuid("Cliente inválido.")]),
    veiculoId: z.union([z.literal(""), z.uuid("Veículo inválido.")]),
    km: z.number().int("Informe km inteiros.").min(0, "A quilometragem não pode ser negativa.").max(9_999_999, "Quilometragem alta demais."),
    ...camposItensEDesconto,
    ...camposPagamentos,
    observacoes: texto(500),
  })
  .superRefine(validarDescontoApi)
  .refine((v) => v.clienteId !== "" || v.veiculoId === "", { path: ["veiculoId"], message: "Escolha o cliente do veículo." });

type DadosVenda = {
  clienteId: string;
  veiculoId: string;
  km: number;
  orcamentoId: string;
  itens: ItemVendaApi[];
  descontoTipo: "valor" | "percentual";
  desconto: number;
  pagamentos: PagamentoEntrada[];
  divergencia?: "saldo" | "desconto";
  observacoes: string;
};

export function registrarRotasVendas({ app, banco, exigirSessao, exigirPermissao }: Contexto) {
  const ver = [exigirSessao, exigirPermissao("vendas.ver")] as const;
  const editar = [exigirSessao, exigirPermissao("vendas.editar")] as const;

  async function carregar(id?: string) {
    const linhas = id
      ? await banco.consultar("select * from vendas where id = $1::uuid", [id]).catch(() => [])
      : await banco.consultar("select * from vendas order by criado_em desc");
    const docs = await comItens(banco.consultar, "venda_itens", "venda_id", linhas);
    const ids = docs.map((d) => String(d.id));
    const todos = ids.length === 0 ? [] : await banco.consultar("select id, venda_id, forma, valor, criado_em, criado_por, estornado_em from venda_pagamentos where venda_id = any($1::uuid[]) order by criado_em, id", [ids]);
    return docs.map((d) => {
      const pagamentos = todos
        .filter((p) => p.venda_id === d.id)
        .map((p) => ({ id: p.id, forma: p.forma, valor: Number(p.valor), criadoEm: new Date(p.criado_em as string).toISOString(), criadoPor: p.criado_por ?? "", estornadoEm: p.estornado_em ? new Date(p.estornado_em as string).toISOString() : null }));
      const ativos = pagamentos.filter((p) => p.estornadoEm === null);
      const totalPago = ativos.reduce((soma, p) => soma + p.valor, 0);
      const total = totalDaVenda(d.itens as { tipo: "produto" | "servico"; quantidade: number; valor: number }[], d.descontoTipo as "valor" | "percentual", Number(d.desconto), Number(d.ajuste));
      const formas = [...new Set(ativos.map((p) => p.forma as string))];
      return {
        ...d, clienteId: d.clienteId ?? "", veiculoId: d.veiculoId ?? "", orcamentoId: d.orcamentoId ?? "",
        pagamentos, totalPago, temPagamento: ativos.length > 0, saldo: d.status === "concluida" ? Math.max(0, total - totalPago) : 0,
        formaPagamento: formas.length === 0 ? "" : formas.length === 1 ? formas[0] : "varias",
      };
    });
  }
  async function buscar(id: string) {
    const [venda] = await carregar(id);
    if (!venda) throw new ErroApi(404, "Venda não encontrada.");
    return venda;
  }
  const enviar = (c: Context<{ Variables: Variaveis }>, vendas: Record<string, unknown>[]) => {
    const ver = c.get("permissoes").includes("valores.ver");
    const protegidas = protegerValores(vendas, ver);
    return ver ? protegidas : protegidas.map((v) => ({ ...v, ajuste: 0, pagamentos: [], totalPago: 0, saldo: 0 }));
  };

  /** Quem vê valores informa os pagamentos; quem não vê só escolhe a forma e a API paga o total. */
  function acertarPagamentos(itens: ItemVendaApi[], tipo: "valor" | "percentual", desconto: number, pagamentos: PagamentoEntrada[], divergencia: "saldo" | "desconto" | undefined, temCliente: boolean, verValores: boolean) {
    const total = totalDaVenda(itens, tipo, desconto, 0);
    if (!verValores) {
      if (pagamentos.length === 0) throw new ErroApi(400, "Escolha a forma de pagamento.", { pagamentos: "Escolha a forma de pagamento." });
      return { pagamentos: total > 0 ? [{ forma: pagamentos[0].forma, valor: total }] : [], ajuste: 0 };
    }
    return conferirPagamentos(total, pagamentos, divergencia, temCliente);
  }
  const quemSou = (c: Context<{ Variables: Variaveis }>) => String((c.get("sessao") as { user?: { name?: string } } | null)?.user?.name ?? "");

  /** Baixa o estoque das peças do cadastro (serviços e itens avulsos não mexem no estoque), em ordem fixa de produto. */
  async function baixar(q: Consulta, itens: ItemVendaApi[], documento: string) {
    const pecas = itens.filter((i) => i.tipo === "produto" && i.origemId !== "").map((i) => ({ produtoId: i.origemId, quantidade: i.quantidade }));
    for (const [produtoId, quantidade] of somarPorProduto(pecas)) await movimentar(q, { produtoId, delta: -quantidade, origem: "venda", documento, motivo: "" });
  }

  /** Lança a venda: grava, baixa o estoque dos produtos do cadastro e sobe o km do veículo. Tudo numa transação. */
  async function lancar(dados: DadosVenda, verValores: boolean, quem: string): Promise<string> {
    try {
      return await banco.transacao(async (q) => {
        const d = await precificar(q, dados, verValores);
        const acerto = acertarPagamentos(d.itens, d.descontoTipo, d.desconto, d.pagamentos, d.divergencia, d.clienteId !== "", verValores);
        const [venda] = await q<{ id: string; numero: string }>(
          "insert into vendas (cliente_id, veiculo_id, km, orcamento_id, desconto_tipo, desconto, ajuste, observacoes) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id, numero",
          [d.clienteId || null, d.veiculoId || null, d.km, d.orcamentoId || null, d.descontoTipo, d.desconto, acerto.ajuste, d.observacoes],
        );
        await gravarPagamentos(q, venda.id, acerto.pagamentos, quem);
        await gravarItens(q, "venda_itens", "venda_id", venda.id, d.itens);
        await baixar(q, d.itens, venda.numero);
        await subirKm(q, d.veiculoId || null, d.km);
        return venda.id;
      });
    } catch (erro) {
      if (violaChaveEstrangeira(erro) || (erro as Error).message?.startsWith("Produto não encontrado")) throw new ErroApi(400, "Cliente, veículo ou produto não encontrado.");
      throw erro;
    }
  }

  app.get("/vendas", ...ver, async (c) => c.json(enviar(c, await carregar())));
  app.get("/vendas/:id", ...ver, async (c) => c.json(enviar(c, [await buscar(c.req.param("id"))])[0]));

  app.post("/vendas", ...editar, async (c) => {
    const dados = await lerCorpo(c, esquemaVendaApi);
    if (dados.clienteId !== "") await conferirClienteEVeiculo(banco.consultar, dados.clienteId, dados.veiculoId);
    const id = await lancar({ ...dados, orcamentoId: "" }, c.get("permissoes").includes("valores.ver"), quemSou(c));
    return c.json(enviar(c, [await buscar(id)])[0], 201);
  });

  /** Orçamento aprovado vira venda: copia itens e desconto e o orçamento passa a "convertido". */
  app.post("/orcamentos/:id/venda", ...editar, async (c) => {
    const verValores = c.get("permissoes").includes("valores.ver");
    const corpo = await lerCorpo(c, z.object(camposPagamentos));
    const orcamentoId = c.req.param("id");
    const [existe] = await banco.consultar("select 1 from orcamentos where id = $1::uuid", [orcamentoId]).catch(() => []);
    if (!existe) throw new ErroApi(404, "Orçamento não encontrado.");
    // `valores.ver` não importa aqui: os valores vêm do orçamento já aprovado.
    const id = await banco
      .transacao(async (q) => {
        // O cabeçalho vem da própria linha travada pelo update, então não mistura versões do orçamento.
        const [orc] = await q<Record<string, unknown>>("update orcamentos set status = 'convertido' where id = $1::uuid and status = 'aprovado' returning *", [orcamentoId]);
        if (!orc) throw new ErroApi(409, "Só orçamentos aprovados viram venda (e cada um só uma vez).");
        const itens = await q<Record<string, unknown>>("select * from orcamento_itens where orcamento_id = $1::uuid order by posicao", [orcamentoId]);
        const lista0: ItemVendaApi[] = itens.map((i) => ({
          tipo: i.tipo as "produto" | "servico", origemId: (i.origem_id as string | null) ?? "", descricao: String(i.descricao), unidade: String(i.unidade),
          quantidade: Number(i.quantidade), valor: Number(i.valor),
        }));
        const acerto = acertarPagamentos(lista0, orc.desconto_tipo as "valor" | "percentual", Number(orc.desconto), corpo.pagamentos, corpo.divergencia, orc.cliente_id !== null, verValores);
        const [venda] = await q<{ id: string; numero: string }>(
          "insert into vendas (cliente_id, veiculo_id, km, orcamento_id, desconto_tipo, desconto, ajuste) values ($1,$2,$3,$4,$5,$6,$7) returning id, numero",
          [orc.cliente_id, orc.veiculo_id, orc.km, orcamentoId, orc.desconto_tipo, orc.desconto, acerto.ajuste],
        );
        await gravarPagamentos(q, venda.id, acerto.pagamentos, quemSou(c));
        const lista = lista0;
        await gravarItens(q, "venda_itens", "venda_id", venda.id, lista);
        await baixar(q, lista, venda.numero);
        await subirKm(q, orc.veiculo_id as string, Number(orc.km));
        return venda.id;
      })
      .catch((erro) => {
        if ((erro as Error).message?.startsWith("Produto não encontrado")) throw new ErroApi(400, "Um dos produtos do orçamento não existe mais no cadastro.");
        throw erro;
      });
    return c.json(enviar(c, [await buscar(id)])[0], 201);
  });

  /** Recebe (parte do) saldo em aberto de uma venda concluída. */
  app.post("/vendas/:id/pagamentos", ...editar, async (c) => {
    if (!c.get("permissoes").includes("valores.ver")) throw new ErroApi(403, "Sem permissão para registrar valores.");
    const id = c.req.param("id");
    const dados = await lerCorpo(c, esquemaNovoPagamento);
    await buscar(id);
    await banco.transacao(async (q) => {
      const [venda] = await q<{ status: string }>("select status from vendas where id = $1::uuid for update", [id]);
      if (venda.status !== "concluida") throw new ErroApi(409, "Esta venda está cancelada.");
      const { total, pago } = await contaDaVenda(q, id);
      if (dados.valor > total - pago) throw new ErroApi(400, "O valor passa do saldo em aberto.", { valor: "O valor passa do saldo em aberto." });
      await gravarPagamentos(q, id, [dados], quemSou(c));
    });
    return c.json(enviar(c, [await buscar(id)])[0], 201);
  });

  /** Desfaz um pagamento (o saldo da venda volta a abrir). */
  app.post("/vendas/:id/pagamentos/:pagamentoId/estornar", ...editar, async (c) => {
    if (!c.get("permissoes").includes("valores.ver")) throw new ErroApi(403, "Sem permissão para registrar valores.");
    const id = c.req.param("id");
    await buscar(id);
    const [feito] = await banco.consultar("update venda_pagamentos set estornado_em = now() where id = $1::uuid and venda_id = $2::uuid and estornado_em is null returning id", [c.req.param("pagamentoId"), id]).catch(() => []);
    if (!feito) throw new ErroApi(409, "Pagamento não encontrado ou já estornado.");
    return c.json(enviar(c, [await buscar(id)])[0]);
  });

  /** Cancela a venda, devolve as peças ao estoque e reabre o orçamento de origem como aprovado. */
  app.post("/vendas/:id/cancelar", ...editar, async (c) => {
    const id = c.req.param("id");
    await buscar(id);
    await banco.transacao(async (q) => {
      // Trava a venda antes de conferir: um recebimento simultâneo espera e depois vê a venda cancelada.
      const [atual] = await q<{ status: string }>("select status from vendas where id = $1::uuid for update", [id]);
      if (atual.status !== "concluida") throw new ErroApi(409, "Esta venda já foi cancelada.");
      const [recebido] = await q("select 1 from venda_pagamentos where venda_id = $1::uuid and estornado_em is null limit 1", [id]);
      if (recebido) throw new ErroApi(409, "Esta venda tem pagamento recebido. Estorne os pagamentos antes de cancelar.");
      const [venda] = await q<{ numero: string; orcamento_id: string | null }>("update vendas set status = 'cancelada' where id = $1::uuid and status = 'concluida' returning numero, orcamento_id", [id]);
      if (!venda) throw new ErroApi(409, "Esta venda já foi cancelada.");
      const pecas = await q<{ origem_id: string; quantidade: string }>(
        "select origem_id, sum(quantidade) as quantidade from venda_itens where venda_id = $1::uuid and tipo = 'produto' and origem_id is not null group by origem_id",
        [id],
      );
      pecas.sort((a, b) => (a.origem_id < b.origem_id ? -1 : 1));
      for (const peca of pecas) {
        const [existe] = await q("select 1 from produtos where id = $1::uuid", [peca.origem_id]);
        if (existe) await movimentar(q, { produtoId: peca.origem_id, delta: Number(peca.quantidade), origem: "venda", documento: venda.numero, motivo: "Cancelamento da venda" });
      }
      if (venda.orcamento_id) await q("update orcamentos set status = 'aprovado' where id = $1::uuid and status = 'convertido'", [venda.orcamento_id]);
    });
    return c.json(enviar(c, [await buscar(id)])[0]);
  });
}
