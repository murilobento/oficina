import { type FaltaDeSaldo, movimentarItens } from "@/features/estoque/movimentar";
import { proximoCodigo } from "@/lib/numeros";

import { useComprasStore } from "./store";
import type { Compra } from "./tipos";

type DadosCompra = Omit<Compra, "id" | "numero" | "status" | "criadoEm">;

const comoItensDeEstoque = (itens: Compra["itens"]) => itens.map((item) => ({ origemId: item.produtoId, quantidade: item.quantidade }));

/** Lança a compra e dá entrada no estoque. (Etapa 1: entrada de saldo e atualização de custo ficam para a etapa 2.) */
export function registrarCompra(dados: DadosCompra): Compra {
  const compras = useComprasStore.getState();
  const numero = proximoCodigo("CMP", compras.itens.map((item) => item.numero));
  const compra = compras.adicionar({ ...dados, numero, status: "concluida" });
  movimentarItens(comoItensDeEstoque(dados.itens), 1, { origem: "compra", documento: numero, motivo: "" });
  return compra;
}

/** Peças da compra que já saíram do estoque e por isso impedem o cancelamento (etapa 1: o saldo não muda, nada impede). */
export function faltasParaCancelar(_compra: Compra): FaltaDeSaldo[] {
  return [];
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
