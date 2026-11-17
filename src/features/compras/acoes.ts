import { type FaltaDeSaldo, movimentarItens } from "@/features/estoque/movimentar";
import { useProdutosStore } from "@/features/produtos/store";
import { proximoCodigo } from "@/lib/numeros";

import { useComprasStore } from "./store";
import type { Compra } from "./tipos";

type DadosCompra = Omit<Compra, "id" | "numero" | "status" | "criadoEm">;

const comoItensDeEstoque = (itens: Compra["itens"]) => itens.map((item) => ({ origemId: item.produtoId, quantidade: item.quantidade }));

/** Lança a compra, dá entrada no estoque e atualiza o custo de cada produto para o preço pago. */
export function registrarCompra(dados: DadosCompra): Compra {
  const compras = useComprasStore.getState();
  const numero = proximoCodigo("CMP", compras.itens.map((item) => item.numero));
  const compra = compras.adicionar({ ...dados, numero, status: "concluida" });
  movimentarItens(comoItensDeEstoque(dados.itens), 1, { origem: "compra", documento: numero, motivo: "" });
  const produtos = useProdutosStore.getState();
  for (const item of dados.itens) produtos.atualizar(item.produtoId, { custo: item.custo });
  return compra;
}

/** Peças da compra que já saíram do estoque e por isso impedem o cancelamento. */
export function faltasParaCancelar(compra: Compra): FaltaDeSaldo[] {
  const produtos = useProdutosStore.getState().itens;
  return compra.itens.flatMap((item) => {
    const produto = produtos.find((p) => p.id === item.produtoId);
    return produto && produto.saldo < item.quantidade
      ? [{ produtoId: produto.id, descricao: produto.descricao, pedido: item.quantidade, saldo: produto.saldo }]
      : [];
  });
}

/**
 * Cancela a compra e retira do estoque o que ela havia colocado. Se parte das peças já foi
 * usada (saldo menor que a quantidade comprada), não cancela e devolve as faltas.
 */
export function cancelarCompra(compra: Compra): { ok: true } | { ok: false; faltas: FaltaDeSaldo[] } {
  const faltas = faltasParaCancelar(compra);
  if (faltas.length > 0) return { ok: false, faltas };
  useComprasStore.getState().atualizar(compra.id, { status: "cancelada" });
  movimentarItens(comoItensDeEstoque(compra.itens), -1, { origem: "compra", documento: compra.numero, motivo: "Cancelamento da compra" });
  return { ok: true };
}
