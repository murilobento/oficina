import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type ApiErro } from "@/lib/api";

import { EMPRESA_PADRAO, type Empresa } from "./tipos";

const CHAVE = ["empresa"] as const;

/** Consulta da empresa (com estado de carregamento), para telas que precisam esperar os dados. */
export function useEmpresaConsulta() {
  return useQuery({ queryKey: CHAVE, queryFn: () => api<Empresa>("/empresa"), staleTime: 5 * 60_000 });
}

/** Dados da empresa para qualquer tela ou documento; enquanto carrega, vale o padrão. */
export function useEmpresa(): Empresa {
  return useEmpresaConsulta().data ?? EMPRESA_PADRAO;
}

export function useSalvarEmpresa() {
  const cliente = useQueryClient();
  return useMutation<Empresa, ApiErro, Empresa>({
    mutationFn: (empresa) => api<Empresa>("/empresa", { metodo: "PUT", corpo: empresa }),
    onSuccess: (salva) => cliente.setQueryData(CHAVE, salva),
  });
}
