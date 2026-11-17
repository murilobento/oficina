import { beforeEach, describe, expect, it } from "vitest";

import { useMovimentosStore } from "@/features/estoque/store";
import { useOrcamentosStore } from "@/features/orcamentos/store";
import { useProdutosStore } from "@/features/produtos/store";

import { cancelarVenda, gerarVendaDoOrcamento, registrarVenda } from "./acoes";
import { useVendasStore } from "./store";

const saldo = (id: string) => useProdutosStore.getState().itens.find((p) => p.id === id)!.saldo;
const orcamento = (id: string) => useOrcamentosStore.getState().itens.find((o) => o.id === id)!;

beforeEach(() => {
  useProdutosStore.setState({ itens: useProdutosStore.getState().itens.map((p) => ({ ...p, saldo: 10 })) });
  useMovimentosStore.setState({ itens: [] });
  useVendasStore.setState({ itens: [] });
  useOrcamentosStore.setState({ itens: useOrcamentosStore.getState().itens.map((o) => (o.id === "o2" ? { ...o, status: "aprovado" } : o)) });
});

describe("registrarVenda", () => {
  it("numera em sequência e dá baixa só nos produtos cadastrados", () => {
    const venda = registrarVenda({
      clienteId: "",
      veiculoId: "",
      km: 0,
      orcamentoId: "",
      itens: [
        { id: "1", tipo: "produto", origemId: "p1", descricao: "Óleo", unidade: "L", quantidade: 4, valor: 5000 },
        { id: "2", tipo: "produto", origemId: "", descricao: "Peça avulsa", unidade: "UN", quantidade: 9, valor: 100 },
        { id: "3", tipo: "servico", origemId: "s1", descricao: "Troca", unidade: "UN", quantidade: 1, valor: 6000 },
      ],
      descontoTipo: "percentual",
      desconto: 0,
      formaPagamento: "pix",
      observacoes: "",
    });
    expect(venda).toMatchObject({ numero: "VND-0001", status: "concluida" });
    expect(saldo("p1")).toBe(6);
    expect(useMovimentosStore.getState().itens).toHaveLength(1);
  });
});

describe("orçamento aprovado vira venda", () => {
  it("copia os itens, dá baixa, marca o orçamento e cancelar devolve tudo", () => {
    const o2 = orcamento("o2");
    const venda = gerarVendaDoOrcamento(o2, "dinheiro");
    expect(venda).toMatchObject({ orcamentoId: "o2", clienteId: o2.clienteId, formaPagamento: "dinheiro" });
    expect(venda.itens).toHaveLength(o2.itens.length);
    expect(orcamento("o2").status).toBe("convertido");
    expect(saldo("p3")).toBe(9);

    cancelarVenda(venda);
    expect(useVendasStore.getState().itens[0].status).toBe("cancelada");
    expect(orcamento("o2").status).toBe("aprovado");
    expect(saldo("p3")).toBe(10);
  });
});
