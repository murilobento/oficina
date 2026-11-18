import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSessao } from "@/features/auth/sessao";
import { api, type ApiErro } from "@/lib/api";

import type { PerfilAcesso } from "./data";

/** Perfil como a API devolve: com a quantidade de funcionários que o usam. */
export type PerfilApi = PerfilAcesso & { funcionarios: number };
export type DadosPerfil = Pick<PerfilAcesso, "nome" | "descricao" | "permissoes">;

const VAZIO: PerfilApi[] = [];

export const usePerfisConsulta = () => useQuery({ queryKey: ["perfis"], queryFn: () => api<PerfilApi[]>("/perfis") });
export const usePerfis = (): PerfilApi[] => usePerfisConsulta().data ?? VAZIO;

export function useSalvarPerfil() {
  const cliente = useQueryClient();
  return useMutation<PerfilApi, ApiErro, { id?: string; dados: DadosPerfil }>({
    mutationFn: ({ id, dados }) => (id ? api<PerfilApi>(`/perfis/${id}`, { metodo: "PUT", corpo: dados }) : api<PerfilApi>("/perfis", { corpo: dados })),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ["perfis"] });
      void useSessao.getState().carregar(); // as permissões de quem está logado podem ter mudado
    },
  });
}

export function useExcluirPerfil() {
  const cliente = useQueryClient();
  return useMutation<void, ApiErro, string>({
    mutationFn: (id) => api<void>(`/perfis/${id}`, { metodo: "DELETE" }),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ["perfis"] });
      void useSessao.getState().carregar(); // as permissões de quem está logado podem ter mudado
    },
  });
}
