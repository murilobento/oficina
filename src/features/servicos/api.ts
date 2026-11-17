import { criarCadastroApi } from "@/lib/cadastro-api";

import type { Servico } from "./tipos";

export type DadosServico = Omit<Servico, "id" | "criadoEm">;

const servicos = criarCadastroApi<Servico, DadosServico>("servicos");

export const useServicosConsulta = servicos.useConsulta;
export const useServicos = servicos.useLista;
export const servicosDoCache = servicos.doCache;
export const useSalvarServico = servicos.useSalvar;
export const useAlternarAtivoServico = servicos.useAlternarAtivo;
export const useExcluirServico = servicos.useExcluir;
