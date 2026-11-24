import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

import type { PaginaAuditoria } from "./tipos";

export type FiltrosAuditoria = { de?: string; categoria?: string; usuario?: string; busca?: string };

function montarCaminho(filtros: FiltrosAuditoria, antesDe?: string) {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries({ ...filtros, antesDe })) if (valor) parametros.set(chave, valor);
  const texto = parametros.toString();
  return `/auditoria${texto ? `?${texto}` : ""}`;
}

/** Registros mais recentes primeiro, 50 por vez ("Carregar mais" pede a próxima leva). */
export function useAuditoria(filtros: FiltrosAuditoria) {
  return useInfiniteQuery({
    queryKey: ["auditoria", filtros],
    queryFn: ({ pageParam }) => api<PaginaAuditoria>(montarCaminho(filtros, pageParam)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.proximo ?? undefined,
  });
}

/** Funcionários que aparecem na auditoria (inclusive os já excluídos), para o filtro. */
export function useUsuariosAuditoria() {
  return useQuery({ queryKey: ["auditoria", "usuarios"], queryFn: () => api<{ id: string; nome: string }[]>("/auditoria/usuarios") });
}
