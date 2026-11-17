import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type ApiErro } from "@/lib/api";

import type { Pessoa } from "./tipos";

export type Papel = "cliente" | "fornecedor";
export type DadosPessoa = Omit<Pessoa, "id" | "criadoEm">;

const VAZIO: Pessoa[] = [];

/** Consulta completa (carregando e erro), para as listagens. */
export function usePessoasConsulta(papel: Papel) {
  return useQuery({ queryKey: ["pessoas", papel], queryFn: () => api<Pessoa[]>(`/pessoas?papel=${papel}`) });
}

/** Só a lista (vazia enquanto carrega), para quem precisa apenas procurar um nome ou escolher. */
export function usePessoas(papel: Papel): Pessoa[] {
  return usePessoasConsulta(papel).data ?? VAZIO;
}

/** Cria (sem `id`) ou atualiza (com `id`) um cadastro. */
export function useSalvarPessoa(papel: Papel) {
  const cliente = useQueryClient();
  return useMutation<Pessoa, ApiErro, { id?: string; dados: DadosPessoa }>({
    mutationFn: ({ id, dados }) =>
      id ? api<Pessoa>(`/pessoas/${id}`, { metodo: "PUT", corpo: dados }) : api<Pessoa>(`/pessoas?papel=${papel}`, { corpo: dados }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["pessoas", papel] }),
  });
}

export function useAlternarAtivoPessoa(papel: Papel) {
  const cliente = useQueryClient();
  return useMutation<Pessoa, ApiErro, { id: string; ativo: boolean }>({
    mutationFn: ({ id, ativo }) => api<Pessoa>(`/pessoas/${id}/ativo`, { metodo: "PATCH", corpo: { ativo } }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["pessoas", papel] }),
  });
}

export function useExcluirPessoa(papel: Papel) {
  const cliente = useQueryClient();
  return useMutation<void, ApiErro, string>({
    mutationFn: (id) => api<void>(`/pessoas/${id}`, { metodo: "DELETE" }),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ["pessoas", papel] });
      // Excluir um fornecedor limpa o fornecedor dos produtos dele (no banco): atualiza a lista de produtos.
      if (papel === "fornecedor") await cliente.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
}
