import { useMutation } from "@tanstack/react-query";

import { api, type ApiErro } from "@/lib/api";
import { criarCadastroApi } from "@/lib/cadastro-api";
import { invalidar } from "@/lib/invalidar";

import type { Venda } from "./tipos";

/** Corpo da venda na API (sem id, número, status e data; sem vínculo com orçamento, que tem rota própria). */
export type DadosVenda = Omit<Venda, "id" | "numero" | "status" | "criadoEm" | "orcamentoId" | "itens"> & { itens: Omit<Venda["itens"][number], "id">[] };

const vendas = criarCadastroApi<Venda, DadosVenda>("vendas");

export const useVendasConsulta = vendas.useConsulta;
export const useVendas = vendas.useLista;
export const vendasDoCache = vendas.doCache;

/** A venda baixa o estoque e pode subir o km do veículo: recarrega produtos, movimentos e veículos. */
const aposVenda = () => invalidar("vendas", "produtos", "estoque/movimentos", "veiculos", "orcamentos");

export function useRegistrarVenda() {
  return useMutation<Venda, ApiErro, DadosVenda>({ mutationFn: (dados) => api<Venda>("/vendas", { corpo: dados }), onSuccess: aposVenda });
}

/** Orçamento aprovado vira venda: a API copia itens e desconto e marca o orçamento como "Virou venda". */
export function useGerarVendaDoOrcamento() {
  return useMutation<Venda, ApiErro, { orcamentoId: string; formaPagamento: string }>({
    mutationFn: ({ orcamentoId, formaPagamento }) => api<Venda>(`/orcamentos/${orcamentoId}/venda`, { corpo: { formaPagamento } }),
    onSuccess: aposVenda,
  });
}

/** Cancela a venda, devolve as peças ao estoque e reabre o orçamento de origem como aprovado. */
export function useCancelarVenda() {
  return useMutation<Venda, ApiErro, string>({ mutationFn: (id) => api<Venda>(`/vendas/${id}/cancelar`, { metodo: "POST" }), onSuccess: aposVenda });
}
