import { criarCadastroStore } from "@/lib/cadastro-store";

import type { Compra } from "./tipos";

// DADOS DE EXEMPLO (fictícios): uma compra já recebida, que não mexe no saldo dos produtos.
const iniciais: Compra[] = [
  {
    id: "cp1",
    numero: "CMP-0001",
    fornecedorId: "f1",
    notaFiscal: "48213",
    itens: [
      { id: "cp1i1", produtoId: "p1", descricao: "Óleo 5W30 sintético", unidade: "L", quantidade: 24, custo: 3400 },
      { id: "cp1i2", produtoId: "p2", descricao: "Filtro de óleo", unidade: "UN", quantidade: 10, custo: 1300 },
    ],
    frete: 4500,
    desconto: 0,
    observacoes: "",
    status: "concluida",
    criadoEm: "2026-10-28T14:00:00.000Z",
  },
];

export const useComprasStore = criarCadastroStore<Compra>("compras", iniciais);
