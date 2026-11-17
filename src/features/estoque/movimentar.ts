import { produtosDoCache } from "@/features/produtos/api";

import type { Movimento, OrigemMovimento } from "./tipos";

/** Etapa 1: vendas, compras e acertos ainda não alteram o saldo. Vira `true` quando o estoque for ligado à API. */
export const ESTOQUE_MOVIMENTADO = false;

type Contexto = { origem: OrigemMovimento; documento: string; motivo: string };

/**
 * ETAPA 1 DA LIGAÇÃO COM O BANCO: o saldo dos produtos mora no Neon e só a API de estoque
 * (etapa 2, junto com vendas e compras) poderá alterá-lo. Até lá, vendas, compras e acertos não
 * mexem no saldo: estas funções não fazem nada e devolvem nulo/lista vazia.
 */
export function movimentarEstoque(_pedido: { produtoId: string; delta: number } & Contexto): Movimento | null {
  return null;
}

type ItemDeEstoque = { origemId: string; quantidade: number };

/** Ver `movimentarEstoque`: sem efeito na etapa 1. */
export function movimentarItens(_itens: ItemDeEstoque[], _sinal: 1 | -1, _contexto: Contexto): Movimento[] {
  return [];
}

export type FaltaDeSaldo = { produtoId: string; descricao: string; pedido: number; saldo: number };

/**
 * Produtos cuja soma das quantidades pedidas passa do saldo atual (para avisar antes de vender).
 * Etapa 1: o saldo no banco não é movimentado por vendas e compras, então o aviso ficaria sempre
 * falso (todo produto com saldo 0): fica desligado até o estoque ir para a API.
 */
export function itensSemSaldo(itens: ItemDeEstoque[]): FaltaDeSaldo[] {
  if (!ESTOQUE_MOVIMENTADO) return [];
  const produtos = produtosDoCache();
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
