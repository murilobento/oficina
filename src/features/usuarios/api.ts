import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSessao } from "@/features/auth/sessao";
import { api, type ApiErro } from "@/lib/api";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfilId: string;
  ativo: boolean;
  /** true enquanto a pessoa ainda não trocou a senha provisória. */
  trocarSenha: boolean;
  criadoEm: string;
  ultimoAcesso: string | null;
};

export type DadosUsuario = Pick<Usuario, "nome" | "email" | "perfilId">;
/** Resposta de criar e de redefinir: a senha provisória só existe nesta resposta. */
export type ComSenha = { funcionario: Usuario; senhaProvisoria: string };

const VAZIO: Usuario[] = [];

export const useUsuariosConsulta = () => useQuery({ queryKey: ["funcionarios"], queryFn: () => api<Usuario[]>("/funcionarios") });
export const useUsuarios = (): Usuario[] => useUsuariosConsulta().data ?? VAZIO;

function useRecarregar() {
  const cliente = useQueryClient();
  // A contagem de funcionários por perfil também muda.
  return async () => {
    await Promise.all([cliente.invalidateQueries({ queryKey: ["funcionarios"] }), cliente.invalidateQueries({ queryKey: ["perfis"] })]);
    void useSessao.getState().carregar(); // o próprio perfil ou e-mail pode ter mudado
  };
}

export function useCriarUsuario() {
  const recarregar = useRecarregar();
  return useMutation<ComSenha, ApiErro, DadosUsuario>({ mutationFn: (dados) => api<ComSenha>("/funcionarios", { corpo: dados }), onSuccess: recarregar });
}

export function useEditarUsuario() {
  const recarregar = useRecarregar();
  return useMutation<Usuario, ApiErro, { id: string; dados: DadosUsuario }>({
    mutationFn: ({ id, dados }) => api<Usuario>(`/funcionarios/${id}`, { metodo: "PUT", corpo: dados }),
    onSuccess: recarregar,
  });
}

export function useAlternarAtivoUsuario() {
  const recarregar = useRecarregar();
  return useMutation<Usuario, ApiErro, { id: string; ativo: boolean }>({
    mutationFn: ({ id, ativo }) => api<Usuario>(`/funcionarios/${id}/ativo`, { metodo: "PATCH", corpo: { ativo } }),
    onSuccess: recarregar,
  });
}

export function useRedefinirSenhaUsuario() {
  const recarregar = useRecarregar();
  return useMutation<ComSenha, ApiErro, string>({
    mutationFn: (id) => api<ComSenha>(`/funcionarios/${id}/redefinir-senha`, { corpo: {} }),
    onSuccess: recarregar,
  });
}
