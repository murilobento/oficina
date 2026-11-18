import { useMemo } from "react";

import { LOGIN_ATIVO, useSessao } from "@/features/auth/sessao";

import { filtrarModulos, navModules, permissaoDaRota } from "./sidebar-items";

/** Permissões de quem está logado; nulo quando o login está desativado (desenvolvimento: tudo liberado). */
export function usePermissoes() {
  const permissoes = useSessao((estado) => estado.eu?.permissoes ?? null);
  return LOGIN_ATIVO ? (permissoes ?? []) : null;
}

/** Os módulos do menu que o funcionário logado pode ver. */
export function useModulosPermitidos() {
  const permissoes = useSessao((estado) => estado.eu?.permissoes ?? null);
  return useMemo(() => filtrarModulos(navModules, LOGIN_ATIVO ? (permissoes ?? []) : null), [permissoes]);
}

/** O funcionário logado pode abrir a tela deste endereço? */
export function useAcessoLiberado(pathname: string): boolean {
  const permissoes = useSessao((estado) => estado.eu?.permissoes ?? null);
  if (!LOGIN_ATIVO) return true;
  const exigida = permissaoDaRota(pathname);
  return !exigida || (permissoes?.includes(exigida) ?? false);
}
