import { useProdutosStore } from "@/features/produtos/store";

import { useMovimentosStore } from "./store";
import type { Movimento, OrigemMovimento } from "./tipos";

type Contexto = { origem: OrigemMovimento; documento: string; motivo: string };

/**
 * Único caminho para mexer no saldo: atualiza o produto e grava a movimentação no histórico.
 * `delta` positivo = entrada, negativo = saída. O saldo pode ficar negativo (peça vendida antes
 * de dar entrada); as telas avisam quando isso vai acontecer. Devolve nulo se não mexeu em nada.
 */
export function movimentarEstoque({ produtoId, delta, ...contexto }: { produtoId: string; delta: number } & Contexto): Movimento | null {
  if (delta === 0) return null;
  const produtos = useProdutosStore.getState();
  const produto = produtos.itens.find((item) => item.id === produtoId);
  if (!produto) return null;

  // Soma em milésimos para não acumular erro de ponto flutuante (0,1 + 0,2).
  const saldoApos = Math.round((produto.saldo + delta) * 1000) / 1000;
  produtos.atualizar(produtoId, { saldo: saldoApos });
  return useMovimentosStore.getState().adicionar({
    produtoId,
    tipo: delta > 0 ? "entrada" : "saida",
    quantidade: Math.abs(delta),
    saldoApos,
    ...contexto,
  });
}

type ItemDeEstoque = { origemId: string; quantidade: number };

/**
 * Movimenta os itens de um documento (venda, compra...). `sinal` -1 dá baixa, +1 dá entrada.
 * Só mexe em itens ligados a um produto cadastrado: serviços e itens avulsos são ignorados.
 */
export function movimentarItens(itens: ItemDeEstoque[], sinal: 1 | -1, contexto: Contexto): Movimento[] {
  const existentes = new Set(useProdutosStore.getState().itens.map((produto) => produto.id));
  return itens
    .filter((item) => item.origemId !== "" && existentes.has(item.origemId))
    .flatMap((item) => movimentarEstoque({ produtoId: item.origemId, delta: sinal * item.quantidade, ...contexto }) ?? []);
}

export type FaltaDeSaldo = { produtoId: string; descricao: string; pedido: number; saldo: number };

/** Produtos cuja soma das quantidades pedidas passa do saldo atual (para avisar antes de vender). */
export function itensSemSaldo(itens: ItemDeEstoque[]): FaltaDeSaldo[] {
  const produtos = useProdutosStore.getState().itens;
  const pedido = new Map<string, number>();
  for (const item of itens) {
    if (item.origemId === "") continue;
    pedido.set(item.origemId, (pedido.get(item.origemId) ?? 0) + item.quantidade);
  }
  return [...pedido.entries()].flatMap(([produtoId, qtd]) => {
    const produto = produtos.find((item) => item.id === produtoId);
    return produto && qtd > produto.saldo ? [{ produtoId, descricao: produto.descricao, pedido: qtd, saldo: produto.saldo }] : [];
  });
}

/** Quanto o acerto muda no saldo: contagem física menos o saldo do sistema. */
export function diferencaAcerto(saldoSistema: number, contado: number): number {
  return Math.round((contado - saldoSistema) * 1000) / 1000;
}
