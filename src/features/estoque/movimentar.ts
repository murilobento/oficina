import type { Produto } from "@/features/produtos/tipos";

type ItemDeEstoque = { origemId: string; quantidade: number };

export type FaltaDeSaldo = { produtoId: string; descricao: string; pedido: number; saldo: number };

/**
 * Produtos cuja soma das quantidades pedidas passa do saldo atual (para avisar antes de vender).
 * É só um aviso: a API deixa o saldo ficar negativo. Quem altera o saldo é a API (compra, venda, acerto).
 */
export function itensSemSaldo(itens: ItemDeEstoque[], produtos: Pick<Produto, "id" | "descricao" | "saldo">[]): FaltaDeSaldo[] {
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
