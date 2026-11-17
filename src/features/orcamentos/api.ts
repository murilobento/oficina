import { useMutation } from "@tanstack/react-query";

import { api, type ApiErro } from "@/lib/api";
import { criarCadastroApi } from "@/lib/cadastro-api";
import { invalidar } from "@/lib/invalidar";

import type { Orcamento, StatusOrcamento } from "./tipos";

/** Corpo do orçamento na API (sem id, número, status e data; os itens não precisam de id). */
export type DadosOrcamento = Omit<Orcamento, "id" | "numero" | "status" | "criadoEm" | "itens"> & { itens: Omit<Orcamento["itens"][number], "id">[] };

const orcamentos = criarCadastroApi<Orcamento, DadosOrcamento>("orcamentos");

export const useOrcamentosConsulta = orcamentos.useConsulta;
export const useOrcamentos = orcamentos.useLista;
export const orcamentosDoCache = orcamentos.doCache;

/** Criar/editar. O km do veículo pode subir junto, por isso recarrega os veículos. */
export function useSalvarOrcamento() {
  return useMutation<Orcamento, ApiErro, { id?: string; dados: DadosOrcamento }>({
    mutationFn: ({ id, dados }) => (id ? api<Orcamento>(`/orcamentos/${id}`, { metodo: "PUT", corpo: dados }) : api<Orcamento>("/orcamentos", { corpo: dados })),
    onSuccess: () => invalidar("orcamentos", "veiculos"),
  });
}

export function useMudarStatusOrcamento() {
  return useMutation<Orcamento, ApiErro, { id: string; status: Exclude<StatusOrcamento, "convertido"> }>({
    mutationFn: ({ id, status }) => api<Orcamento>(`/orcamentos/${id}/status`, { metodo: "PATCH", corpo: { status } }),
    onSuccess: () => invalidar("orcamentos"),
  });
}

export function useRenovarOrcamento() {
  return useMutation<Orcamento, ApiErro, string>({
    mutationFn: (id) => api<Orcamento>(`/orcamentos/${id}/renovar`, { metodo: "POST" }),
    onSuccess: () => invalidar("orcamentos"),
  });
}

export const useExcluirOrcamento = orcamentos.useExcluir;
