import { criarCadastroStore } from "@/lib/cadastro-store";

import type { Veiculo } from "./tipos";

// DADOS DE EXEMPLO (fictícios). Os clientes são os dos dados de exemplo de Clientes; os
// orçamentos de exemplo (features/orcamentos/store.ts) usam estes ids de veículo.
function exemplo(id: string, clienteId: string, modelo: string, dados: Partial<Veiculo>): Veiculo {
  return {
    id,
    clienteId,
    placa: "",
    modelo,
    ano: "",
    cor: "",
    km: 0,
    combustivel: "",
    cambio: "",
    motor: "",
    observacoes: "",
    ativo: true,
    criadoEm: "2026-05-20T10:00:00.000Z",
    ...dados,
  };
}

const iniciais: Veiculo[] = [
  exemplo("v1", "c1", "Hyundai HB20 1.0", {
    placa: "ABC1D23",
    ano: "2019",
    cor: "Prata",
    km: 48200,
    combustivel: "flex",
    cambio: "manual",
    motor: "1.0",
    observacoes: "Pneu dianteiro direito com desgaste irregular.",
  }),
  exemplo("v2", "c1", "Chevrolet Onix", {
    placa: "KLM2N34",
    ano: "2021",
    cor: "Vermelho",
    km: 30500,
    combustivel: "flex",
    cambio: "automatico",
    motor: "1.0 Turbo",
  }),
  exemplo("v3", "c3", "Fiat Fiorino", {
    placa: "FRT4G56",
    ano: "2017",
    cor: "Branca",
    km: 132000,
    combustivel: "flex",
    cambio: "manual",
    motor: "1.4",
  }),
  exemplo("v4", "c2", "VW Gol 1.6", { ano: "2012", cor: "Preto", combustivel: "flex", cambio: "manual", motor: "1.6" }),
  exemplo("v5", "c2", "Renault Sandero", {
    placa: "QWE5R67",
    ano: "2015",
    cor: "Cinza",
    km: 98000,
    combustivel: "flex",
    cambio: "manual",
    motor: "1.6",
  }),
];

export const useVeiculosStore = criarCadastroStore<Veiculo>("veiculos", iniciais);
