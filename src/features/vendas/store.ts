import { criarCadastroStore } from "@/lib/cadastro-store";

import type { Venda } from "./tipos";

// DADOS DE EXEMPLO (fictícios): as duas vendas nasceram dos orçamentos de exemplo que já
// aparecem como "Virou venda" (ORC-0006 e ORC-0007). Não mexem no saldo dos produtos.
const iniciais: Venda[] = [
  {
    id: "vd1",
    numero: "VND-0001",
    clienteId: "c1",
    veiculoId: "v1",
    km: 38500,
    orcamentoId: "o7",
    itens: [
      { id: "vd1i1", tipo: "servico", origemId: "s3", descricao: "Troca de pastilhas de freio", unidade: "UN", quantidade: 1, valor: 12000 },
      { id: "vd1i2", tipo: "produto", origemId: "p3", descricao: "Pastilha de freio dianteira", unidade: "JG", quantidade: 1, valor: 16900 },
    ],
    descontoTipo: "percentual",
    desconto: 0,
    formaPagamento: "pix",
    observacoes: "",
    status: "concluida",
    criadoEm: "2026-06-10T16:00:00.000Z",
  },
  {
    id: "vd2",
    numero: "VND-0002",
    clienteId: "c1",
    veiculoId: "v1",
    km: 45000,
    orcamentoId: "o6",
    itens: [
      { id: "vd2i1", tipo: "servico", origemId: "s1", descricao: "Troca de óleo e filtro", unidade: "UN", quantidade: 1, valor: 6000 },
      { id: "vd2i2", tipo: "produto", origemId: "p1", descricao: "Óleo 5W30 sintético", unidade: "L", quantidade: 4, valor: 5290 },
      { id: "vd2i3", tipo: "produto", origemId: "p2", descricao: "Filtro de óleo", unidade: "UN", quantidade: 1, valor: 2490 },
    ],
    descontoTipo: "percentual",
    desconto: 0,
    formaPagamento: "credito",
    observacoes: "",
    status: "concluida",
    criadoEm: "2026-09-12T15:30:00.000Z",
  },
];

export const useVendasStore = criarCadastroStore<Venda>("vendas", iniciais);
