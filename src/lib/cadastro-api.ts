import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type ApiErro } from "@/lib/api";
import { queryClient } from "@/lib/query-client";

/**
 * Hooks de um cadastro simples (produtos, serviços, veículos) sobre a API: lista, criar/atualizar,
 * ativar/inativar e excluir. `recurso` é o caminho da API ("produtos") e também a chave da consulta.
 */
export function criarCadastroApi<T extends { id: string }, Dados>(recurso: string) {
  const chave = [recurso] as const;
  const VAZIO: T[] = [];

  const useConsulta = () => useQuery({ queryKey: chave, queryFn: () => api<T[]>(`/${recurso}`) });

  return {
    /** Consulta completa (carregando e erro), para as listagens. */
    useConsulta,
    /** Só a lista (vazia enquanto carrega). */
    useLista: (): T[] => useConsulta().data ?? VAZIO,
    /** Lista já carregada no cache, para código que não é componente (regras de venda e compra). */
    doCache: (): T[] => queryClient.getQueryData<T[]>(chave) ?? VAZIO,
    useSalvar: () => {
      const cliente = useQueryClient();
      return useMutation<T, ApiErro, { id?: string; dados: Dados }>({
        mutationFn: ({ id, dados }) => (id ? api<T>(`/${recurso}/${id}`, { metodo: "PUT", corpo: dados }) : api<T>(`/${recurso}`, { corpo: dados })),
        onSuccess: () => cliente.invalidateQueries({ queryKey: chave }),
      });
    },
    useAlternarAtivo: () => {
      const cliente = useQueryClient();
      return useMutation<T, ApiErro, { id: string; ativo: boolean }>({
        mutationFn: ({ id, ativo }) => api<T>(`/${recurso}/${id}/ativo`, { metodo: "PATCH", corpo: { ativo } }),
        onSuccess: () => cliente.invalidateQueries({ queryKey: chave }),
      });
    },
    useExcluir: () => {
      const cliente = useQueryClient();
      return useMutation<void, ApiErro, string>({
        mutationFn: (id) => api<void>(`/${recurso}/${id}`, { metodo: "DELETE" }),
        onSuccess: () => cliente.invalidateQueries({ queryKey: chave }),
      });
    },
  };
}
