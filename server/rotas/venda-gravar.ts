import type { Context } from "hono";

import type { Consulta } from "../banco";
import { movimentar } from "../estoque";

import { gravarItens, type ItemVendaApi, somarPorProduto, subirKm } from "./itens-venda";
import { conferirPagamentos, gravarPagamentos, gravarParcelas, type PagamentoEntrada, totalDaVenda } from "./pagamentos-venda";
import { ErroApi, type Variaveis } from "./util";

/** Dados de uma venda já precificada, prontos para gravar. */
export type VendaParaGravar = {
  clienteId: string;
  veiculoId: string;
  km: number;
  orcamentoId: string;
  itens: ItemVendaApi[];
  descontoTipo: "valor" | "percentual";
  desconto: number;
  observacoes: string;
  pagamentos: PagamentoEntrada[];
  divergencia?: "saldo" | "desconto";
  parcelamento?: { parcelas: number; primeiroVencimento: string };
};

export const quemSou = (c: Context<{ Variables: Variaveis }>) => String((c.get("sessao") as { user?: { name?: string } } | null)?.user?.name ?? "");

/** Quem vê valores informa os pagamentos; quem não vê só escolhe a forma e a API paga o total. */
export function acertarPagamentos(
  itens: ItemVendaApi[],
  tipo: "valor" | "percentual",
  desconto: number,
  pagamentos: PagamentoEntrada[],
  divergencia: "saldo" | "desconto" | undefined,
  temCliente: boolean,
  verValores: boolean,
) {
  const total = totalDaVenda(itens, tipo, desconto, 0);
  if (!verValores) {
    if (pagamentos.length === 0) throw new ErroApi(400, "Escolha a forma de pagamento.", { pagamentos: "Escolha a forma de pagamento." });
    return { pagamentos: total > 0 ? [{ forma: pagamentos[0].forma, valor: total, parcelasCartao: pagamentos[0].parcelasCartao }] : [], ajuste: 0, saldo: 0 };
  }
  const r = conferirPagamentos(total, pagamentos, divergencia, temCliente);
  return { ...r, saldo: total - r.ajuste - r.pagamentos.reduce((s, p) => s + p.valor, 0) };
}

/** Baixa o estoque das peças do cadastro (serviços e itens avulsos não mexem no estoque), em ordem fixa de produto. */
async function baixar(q: Consulta, itens: ItemVendaApi[], documento: string) {
  const pecas = itens.filter((i) => i.tipo === "produto" && i.origemId !== "").map((i) => ({ produtoId: i.origemId, quantidade: i.quantidade }));
  for (const [produtoId, quantidade] of somarPorProduto(pecas)) await movimentar(q, { produtoId, delta: -quantidade, origem: "venda", documento, motivo: "" });
}

/**
 * Grava a venda dentro de uma transação já aberta: confere os pagamentos, grava itens, pagamentos e
 * parcelas, baixa o estoque e sobe o km do veículo. Usada pela venda de balcão, pelo orçamento → venda e pela entrega da OS.
 */
export async function gravarVenda(q: Consulta, d: VendaParaGravar, verValores: boolean, quem: string): Promise<{ id: string; numero: string }> {
  const acerto = acertarPagamentos(d.itens, d.descontoTipo, d.desconto, d.pagamentos, d.divergencia, d.clienteId !== "", verValores);
  const [venda] = await q<{ id: string; numero: string }>(
    "insert into vendas (cliente_id, veiculo_id, km, orcamento_id, desconto_tipo, desconto, ajuste, observacoes) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id, numero",
    [d.clienteId || null, d.veiculoId || null, d.km, d.orcamentoId || null, d.descontoTipo, d.desconto, acerto.ajuste, d.observacoes],
  );
  await gravarPagamentos(q, venda.id, acerto.pagamentos, quem);
  await gravarParcelas(q, venda.id, acerto.saldo, d.parcelamento);
  await gravarItens(q, "venda_itens", "venda_id", venda.id, d.itens);
  await baixar(q, d.itens, venda.numero);
  await subirKm(q, d.veiculoId || null, d.km);
  return venda;
}
