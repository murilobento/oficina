import { useMutation } from "@tanstack/react-query";

import { api, type ApiErro } from "@/lib/api";
import { criarCadastroApi } from "@/lib/cadastro-api";
import { invalidar } from "@/lib/invalidar";

import type { Acerto } from "./acerto";
import type { Movimento } from "./tipos";

const movimentos = criarCadastroApi<Movimento, never>("estoque/movimentos");
const acertos = criarCadastroApi<Acerto, never>("estoque/acertos");

export const useMovimentosConsulta = movimentos.useConsulta;
export const useMovimentos = movimentos.useLista;
export const useAcertosConsulta = acertos.useConsulta;
export const useAcertos = acertos.useLista;

/** O acerto leva o saldo de cada produto à contagem; a API guarda o saldo do sistema no momento. */
export type DadosAcerto = { motivo: string; observacoes: string; itens: { produtoId: string; contado: number }[] };

export function useRegistrarAcerto() {
  return useMutation<Acerto, ApiErro, DadosAcerto>({
    mutationFn: (dados) => api<Acerto>("/estoque/acertos", { corpo: dados }),
    onSuccess: () => invalidar("estoque/acertos", "produtos", "estoque/movimentos"),
  });
}
