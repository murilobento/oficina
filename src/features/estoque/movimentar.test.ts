import { beforeEach, describe, expect, it } from "vitest";

import { useProdutosStore } from "@/features/produtos/store";

import { diferencaAcerto, itensSemSaldo, movimentarEstoque, movimentarItens } from "./movimentar";
import { useMovimentosStore } from "./store";

const PRODUTO = "p1";
const saldoDe = (id: string) => useProdutosStore.getState().itens.find((p) => p.id === id)!.saldo;

beforeEach(() => {
  useProdutosStore.setState({
    itens: useProdutosStore.getState().itens.map((p) => (p.id === PRODUTO ? { ...p, saldo: 10 } : p)),
  });
  useMovimentosStore.setState({ itens: [] });
});

describe("movimentarEstoque", () => {
  it("entrada soma ao saldo e registra o saldo depois da movimentação", () => {
    const mov = movimentarEstoque({ produtoId: PRODUTO, delta: 5, origem: "manual", documento: "", motivo: "Devolução" });
    expect(saldoDe(PRODUTO)).toBe(15);
    expect(mov).toMatchObject({ tipo: "entrada", quantidade: 5, saldoApos: 15, origem: "manual", motivo: "Devolução" });
    expect(useMovimentosStore.getState().itens).toHaveLength(1);
  });

  it("saída subtrai e pode deixar o saldo negativo (peça vendida antes de dar entrada)", () => {
    const mov = movimentarEstoque({ produtoId: PRODUTO, delta: -12, origem: "venda", documento: "VND-0001", motivo: "" });
    expect(saldoDe(PRODUTO)).toBe(-2);
    expect(mov).toMatchObject({ tipo: "saida", quantidade: 12, saldoApos: -2, documento: "VND-0001" });
  });

  it("delta zero não registra nada", () => {
    expect(movimentarEstoque({ produtoId: PRODUTO, delta: 0, origem: "acerto", documento: "", motivo: "" })).toBeNull();
    expect(useMovimentosStore.getState().itens).toHaveLength(0);
  });

  it("produto inexistente é ignorado", () => {
    expect(movimentarEstoque({ produtoId: "nao-existe", delta: 1, origem: "manual", documento: "", motivo: "" })).toBeNull();
  });
});

describe("movimentarItens", () => {
  const itens = [
    { origemId: PRODUTO, quantidade: 3 },
    { origemId: "", quantidade: 9 }, // item avulso: não mexe no estoque
    { origemId: "servico-qualquer", quantidade: 1 }, // não é produto cadastrado
  ];

  it("dá baixa só nos produtos cadastrados (sinal -1) e devolve com +1", () => {
    movimentarItens(itens, -1, { origem: "venda", documento: "VND-0002", motivo: "" });
    expect(saldoDe(PRODUTO)).toBe(7);
    movimentarItens(itens, 1, { origem: "venda", documento: "VND-0002", motivo: "Cancelamento" });
    expect(saldoDe(PRODUTO)).toBe(10);
    expect(useMovimentosStore.getState().itens).toHaveLength(2);
  });
});

describe("itensSemSaldo", () => {
  it("lista os produtos cuja quantidade passa do saldo", () => {
    const faltando = itensSemSaldo([
      { origemId: PRODUTO, quantidade: 11 },
      { origemId: PRODUTO, quantidade: 1 },
    ]);
    expect(faltando.map((f) => f.produtoId)).toEqual([PRODUTO]);
    expect(faltando[0]).toMatchObject({ pedido: 12, saldo: 10 });
  });
});

describe("diferencaAcerto", () => {
  it("contagem menos o saldo do sistema", () => {
    expect(diferencaAcerto(10, 7)).toBe(-3);
    expect(diferencaAcerto(10, 12.5)).toBe(2.5);
    expect(diferencaAcerto(10, 10)).toBe(0);
  });
});
