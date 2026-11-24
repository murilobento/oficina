import { useMutation, useQuery } from "@tanstack/react-query";

import { api, type ApiErro } from "@/lib/api";
import { invalidar } from "@/lib/invalidar";

import type { Agendamento, DadosAgendamento } from "./tipos";

/** Agendamentos do período (inclusive), por dia e hora. */
export function useAgendamentos(de: string, ate: string) {
  return useQuery({ queryKey: ["agendamentos", de, ate], queryFn: () => api<Agendamento[]>(`/agendamentos?de=${de}&ate=${ate}`) });
}

const atualizar = () => invalidar("agendamentos");

export function useSalvarAgendamento() {
  return useMutation<Agendamento, ApiErro, { id?: string; dados: DadosAgendamento }>({
    mutationFn: ({ id, dados }) => (id ? api<Agendamento>(`/agendamentos/${id}`, { metodo: "PUT", corpo: dados }) : api<Agendamento>("/agendamentos", { corpo: dados })),
    onSuccess: atualizar,
  });
}

export function useMudarSituacao() {
  return useMutation<Agendamento, ApiErro, { id: string; status: "faltou" | "cancelado" }>({
    mutationFn: ({ id, status }) => api<Agendamento>(`/agendamentos/${id}/status`, { corpo: { status } }),
    onSuccess: atualizar,
  });
}

/** O carro chegou: abre a OS a partir do agendamento. */
export function useRegistrarChegada() {
  return useMutation<Agendamento, ApiErro, { id: string; km: number }>({
    mutationFn: ({ id, km }) => api<Agendamento>(`/agendamentos/${id}/ordem`, { corpo: { km } }),
    onSuccess: () => invalidar("agendamentos", "ordens", "veiculos"),
  });
}

// ---------- Links da TV ----------

export type AcessoTv = { id: string; nome: string; criadoPor: string; criadoEm: string; ultimoUso: string | null; revogadoEm: string | null };

export function useAcessosTv(habilitado: boolean) {
  return useQuery({ queryKey: ["tv-acessos"], queryFn: () => api<AcessoTv[]>("/tv-acessos"), enabled: habilitado });
}

export function useCriarAcessoTv() {
  return useMutation<{ id: string; nome: string; token: string }, ApiErro, string>({
    mutationFn: (nome) => api("/tv-acessos", { corpo: { nome } }),
    onSuccess: () => invalidar("tv-acessos"),
  });
}

export function useRevogarAcessoTv() {
  return useMutation<void, ApiErro, string>({
    mutationFn: (id) => api<void>(`/tv-acessos/${id}`, { metodo: "DELETE" }),
    onSuccess: () => invalidar("tv-acessos"),
  });
}
