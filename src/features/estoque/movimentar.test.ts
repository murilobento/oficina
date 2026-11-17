import { beforeEach, describe, expect, it } from "vitest";

import { queryClient } from "@/lib/query-client";

import { diferencaAcerto, itensSemSaldo, movimentarEstoque, movimentarItens } from "./movimentar";
import { useMovimentosStore } from "./store";

const PRODUTO = "p1";

beforeEach(() => {
  queryClient.setQueryData(["produtos"], [{ id: PRODUTO, descricao: "Óleo", saldo: 10 }]);
  useMovimentosStore.setState({ itens: [] });
});

describe("movimentarEstoque e movimentarItens (etapa 1: sem efeito)", () => {
  it("não registra nada nem altera o saldo em cache", () => {
    expect(movimentarEstoque({ produtoId: PRODUTO, delta: 5, origem: "acerto", documento: "", motivo: "" })).toBeNull();
    expect(movimentarItens([{ origemId: PRODUTO, quantidade: 3 }], -1, { origem: "venda", documento: "VND-0001", motivo: "" })).toEqual([]);
    expect(useMovimentosStore.getState().itens).toHaveLength(0);
    expect(queryClient.getQueryData<{ saldo: number }[]>(["produtos"])![0].saldo).toBe(10);
  });
});

describe("itensSemSaldo", () => {
  it("na etapa 1 não avisa (o saldo no banco não é movimentado por vendas e compras)", () => {
    expect(itensSemSaldo([{ origemId: PRODUTO, quantidade: 11 }])).toEqual([]);
  });
});

describe("diferencaAcerto", () => {
  it("contagem menos o saldo do sistema", () => {
    expect(diferencaAcerto(10, 12)).toBe(2);
    expect(diferencaAcerto(10, 7.5)).toBe(-2.5);
    expect(diferencaAcerto(0.3, 0.1)).toBe(-0.2);
  });
});
