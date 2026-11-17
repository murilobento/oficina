import { useMutation } from "@tanstack/react-query";

import { api, type ApiErro } from "@/lib/api";
import { criarCadastroApi } from "@/lib/cadastro-api";
import { invalidar } from "@/lib/invalidar";

import type { Compra } from "./tipos";

export type DadosCompra = Omit<Compra, "id" | "numero" | "status" | "criadoEm" | "itens"> & { itens: Omit<Compra["itens"][number], "id">[] };

const compras = criarCadastroApi<Compra, DadosCompra>("compras");

export const useComprasConsulta = compras.useConsulta;
export const useCompras = compras.useLista;

/** A compra dá entrada no estoque e atualiza o custo dos produtos. */
const aposCompra = () => invalidar("compras", "produtos", "estoque/movimentos");

export function useRegistrarCompra() {
  return useMutation<Compra, ApiErro, DadosCompra>({ mutationFn: (dados) => api<Compra>("/compras", { corpo: dados }), onSuccess: aposCompra });
}

/** A API recusa (409) se parte das peças já saiu do estoque. */
export function useCancelarCompra() {
  return useMutation<Compra, ApiErro, string>({ mutationFn: (id) => api<Compra>(`/compras/${id}/cancelar`, { metodo: "POST" }), onSuccess: aposCompra });
}
