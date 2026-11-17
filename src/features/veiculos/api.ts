import { criarCadastroApi } from "@/lib/cadastro-api";

import type { Veiculo } from "./tipos";

export type DadosVeiculo = Omit<Veiculo, "id" | "criadoEm">;

const veiculos = criarCadastroApi<Veiculo, DadosVeiculo>("veiculos");

export const useVeiculosConsulta = veiculos.useConsulta;
export const useVeiculos = veiculos.useLista;
export const veiculosDoCache = veiculos.doCache;
export const useSalvarVeiculo = veiculos.useSalvar;
export const useAlternarAtivoVeiculo = veiculos.useAlternarAtivo;
export const useExcluirVeiculo = veiculos.useExcluir;
