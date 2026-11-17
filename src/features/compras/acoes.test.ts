import { beforeEach, describe, expect, it } from "vitest";

import { useMovimentosStore } from "@/features/estoque/store";

import { cancelarCompra, registrarCompra } from "./acoes";
import { useComprasStore } from "./store";
import { totaisDaCompra } from "./tipos";

const dados = {
  fornecedorId: "f1",
  notaFiscal: "1",
  itens: [{ id: "i", produtoId: "p1", descricao: "Óleo", unidade: "L", quantidade: 10, custo: 3000 }],
  frete: 1000,
  desconto: 500,
  observacoes: "",
};

beforeEach(() => {
  useMovimentosStore.setState({ itens: [] });
  useComprasStore.setState({ itens: [] });
});

describe("totaisDaCompra", () => {
  it("soma itens e frete e subtrai o desconto", () => {
    expect(totaisDaCompra(dados).total).toBe(30000 + 1000 - 500);
  });
  it("nunca fica negativo", () => {
    expect(totaisDaCompra({ ...dados, desconto: 999999 }).total).toBe(0);
  });
});

describe("registrarCompra", () => {
  it("lança a compra com número e, na etapa 1, não mexe no estoque", () => {
    const compra = registrarCompra(dados);
    expect(compra).toMatchObject({ numero: "CMP-0001", status: "concluida" });
    expect(useMovimentosStore.getState().itens).toHaveLength(0);
  });
});

describe("cancelarCompra", () => {
  it("cancela a compra (o saldo ainda não é alterado na etapa 1)", () => {
    const compra = registrarCompra(dados);
    expect(cancelarCompra(compra)).toEqual({ ok: true });
    expect(useComprasStore.getState().itens[0].status).toBe("cancelada");
  });
});
