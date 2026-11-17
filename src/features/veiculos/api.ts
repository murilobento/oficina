import { api } from "@/lib/api";
import { criarCadastroApi } from "@/lib/cadastro-api";
import { queryClient } from "@/lib/query-client";

import type { Veiculo } from "./tipos";

export type DadosVeiculo = Omit<Veiculo, "id" | "criadoEm">;

const veiculos = criarCadastroApi<Veiculo, DadosVeiculo>("veiculos");

export const useVeiculosConsulta = veiculos.useConsulta;
export const useVeiculos = veiculos.useLista;
export const veiculosDoCache = veiculos.doCache;
export const useSalvarVeiculo = veiculos.useSalvar;
export const useAlternarAtivoVeiculo = veiculos.useAlternarAtivo;
export const useExcluirVeiculo = veiculos.useExcluir;

/** Sobe a quilometragem do veículo quando um documento registra um km maior. Falha em silêncio: é só uma conveniência. */
export async function subirKmDoVeiculo(veiculoId: string, km: number): Promise<void> {
  const veiculo = veiculos.doCache().find((item) => item.id === veiculoId);
  if (!veiculo || km <= veiculo.km) return;
  const { id, criadoEm: _criadoEm, ...dados } = veiculo;
  try {
    await api<Veiculo>(`/veiculos/${id}`, { metodo: "PUT", corpo: { ...dados, km } });
    await queryClient.invalidateQueries({ queryKey: ["veiculos"] });
  } catch {
    // O documento já foi salvo; o km do veículo pode ser ajustado à mão.
  }
}
