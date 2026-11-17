import { criarCadastroStore } from "@/lib/cadastro-store";

import type { Movimento } from "./tipos";

// DADOS DE EXEMPLO: o saldo de partida de cada produto de exemplo, para o histórico não abrir
// vazio. Os saldos vêm do cadastro de Produtos (p1 a p7).
const SALDOS_INICIAIS: [string, number][] = [
  ["p1", 48],
  ["p2", 4],
  ["p3", 5],
  ["p5", 3],
  ["p6", 9],
  ["p7", 2],
];

const iniciais: Movimento[] = SALDOS_INICIAIS.map(([produtoId, quantidade]) => ({
  id: `m-${produtoId}`,
  criadoEm: "2026-11-01T10:00:00.000Z",
  produtoId,
  tipo: "entrada",
  quantidade,
  saldoApos: quantidade,
  origem: "inicial",
  documento: "",
  motivo: "Saldo de partida",
}));

export const useMovimentosStore = criarCadastroStore<Movimento>("movimentos", iniciais);
