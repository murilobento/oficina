import { criarCadastroStore } from "@/lib/cadastro-store";

import type { Servico } from "./tipos";

// DADOS DE EXEMPLO (fictícios), só para a tela não abrir vazia no protótipo.
function exemplo(id: number, descricao: string, dados: Partial<Servico>): Servico {
  return {
    id: `s${id}`,
    codigo: `SRV-${String(id).padStart(3, "0")}`,
    descricao,
    categoria: "outros",
    valor: 0,
    tempoHoras: 0,
    garantiaDias: 0,
    garantiaKm: 0,
    observacoes: "",
    ativo: true,
    criadoEm: "2026-11-01T10:00:00.000Z",
    ...dados,
  };
}

const iniciais: Servico[] = [
  exemplo(1, "Troca de óleo e filtro", {
    categoria: "revisao",
    valor: 6000,
    tempoHoras: 0.5,
    garantiaDias: 30,
    observacoes: "Óleo e filtro cobrados à parte, como produtos.",
  }),
  exemplo(2, "Revisão completa", {
    categoria: "revisao",
    valor: 35000,
    tempoHoras: 3,
    garantiaDias: 90,
    garantiaKm: 3000,
  }),
  exemplo(3, "Troca de pastilhas de freio", {
    categoria: "freios",
    valor: 12000,
    tempoHoras: 1,
    garantiaDias: 90,
    garantiaKm: 5000,
  }),
  exemplo(4, "Alinhamento e balanceamento", {
    categoria: "alinhamento",
    valor: 9000,
    tempoHoras: 1,
  }),
  exemplo(5, "Diagnóstico com scanner", {
    categoria: "diagnostico",
    valor: 15000,
    tempoHoras: 1,
    observacoes: "Abatido do valor do reparo se o cliente aprovar o serviço.",
  }),
  exemplo(6, "Recarga de gás do ar-condicionado", {
    categoria: "arcondicionado",
    valor: 18000,
    tempoHoras: 1.5,
    garantiaDias: 60,
  }),
  exemplo(7, "Troca de correia dentada", {
    categoria: "motor",
    valor: 45000,
    tempoHoras: 4,
    garantiaDias: 180,
    garantiaKm: 10000,
    ativo: false,
  }),
];

export const useServicosStore = criarCadastroStore<Servico>("servicos", iniciais);
