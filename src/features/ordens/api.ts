import { useMutation } from "@tanstack/react-query";

import { api, type ApiErro } from "@/lib/api";
import { criarCadastroApi } from "@/lib/cadastro-api";
import { invalidar } from "@/lib/invalidar";
import type { CorpoRecebimento } from "@/features/vendas/pagamentos";

import type { Ordem, StatusOrdem } from "./tipos";

const ordens = criarCadastroApi<Ordem, never>("ordens");

export const useOrdensConsulta = ordens.useConsulta;
export const useOrdens = ordens.useLista;

const atualizar = () => invalidar("ordens");

function mutacao<V>(caminho: (v: V) => string, corpo: (v: V) => unknown, metodo: string = "POST", depois: () => unknown = atualizar) {
  return () =>
    useMutation<Ordem, ApiErro, V>({
      mutationFn: (v) => api<Ordem>(caminho(v), { metodo, corpo: corpo(v) }),
      onSuccess: depois,
    });
}

export type DadosOrdemDireta = { clienteId: string; veiculoId: string; km: number; problema: string };
export const useAbrirOrdem = mutacao<DadosOrdemDireta>(() => "/ordens", (v) => v, "POST", () => invalidar("ordens", "veiculos"));
export const useAbrirOrdemDoOrcamento = mutacao<string>((id) => `/orcamentos/${id}/ordem`, () => undefined, "POST", () => invalidar("ordens", "orcamentos"));
export const useMudarEtapa = mutacao<{ id: string; status: StatusOrdem }>((v) => `/ordens/${v.id}/status`, (v) => ({ status: v.status }), "PATCH");
export const useSalvarLaudo = mutacao<{ id: string; laudo: string }>((v) => `/ordens/${v.id}/laudo`, (v) => ({ laudo: v.laudo }), "PUT");
export type NovoItemOrdem = { tipo: "produto" | "servico"; origemId: string; descricao: string; unidade: string; quantidade: number; valor: number };
export const useIncluirItem = mutacao<{ id: string; item: NovoItemOrdem }>((v) => `/ordens/${v.id}/itens`, (v) => v.item);
export const useDecidirExtra = mutacao<{ id: string; itemId: string; situacao: "aprovado" | "recusado"; valor?: number; quantidade?: number }>(
  (v) => `/ordens/${v.id}/itens/${v.itemId}`,
  ({ situacao, valor, quantidade }) => ({ situacao, valor, quantidade }),
  "PATCH",
);
export const useRemoverItem = mutacao<{ id: string; itemId: string }>((v) => `/ordens/${v.id}/itens/${v.itemId}`, () => undefined, "DELETE");
export const useEntregarOrdem = mutacao<{ id: string } & CorpoRecebimento>(
  (v) => `/ordens/${v.id}/entregar`,
  ({ id: _id, ...corpo }) => corpo,
  "POST",
  () => invalidar("ordens", "vendas", "produtos", "estoque/movimentos", "veiculos", "orcamentos"),
);
export const useCancelarOrdem = mutacao<{ id: string; motivo: string }>((v) => `/ordens/${v.id}/cancelar`, (v) => ({ motivo: v.motivo }));
