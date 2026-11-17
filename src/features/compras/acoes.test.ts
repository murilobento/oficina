import { beforeEach, describe, expect, it } from "vitest";

import { useMovimentosStore } from "@/features/estoque/store";
import { useProdutosStore } from "@/features/produtos/store";

import { cancelarCompra, registrarCompra } from "./acoes";
import { useComprasStore } from "./store";
import { totaisDaCompra } from "./tipos";

const produto = (id: string) => useProdutosStore.getState().itens.find((p) => p.id === id)!;

const dados = {
  fornecedorId: "f1",
  notaFiscal: "1",
  itens: [{ id: "i", produtoId: "p1", descricao: "Óleo", unidade: "L", quantidade: 10, custo: 3000 }],
  frete: 1000,
  desconto: 500,
  observacoes: "",
};

beforeEach(() => {
  useProdutosStore.setState({ itens: useProdutosStore.getState().itens.map((p) => ({ ...p, saldo: 5, custo: 100 })) });
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
  it("dá entrada no estoque e atualiza o custo do produto", () => {
    const compra = registrarCompra(dados);
    expect(compra).toMatchObject({ numero: "CMP-0001", status: "concluida" });
    expect(produto("p1")).toMatchObject({ saldo: 15, custo: 3000 });
    expect(useMovimentosStore.getState().itens[0]).toMatchObject({ tipo: "entrada", origem: "compra", documento: "CMP-0001" });
  });
});

describe("cancelarCompra", () => {
  it("retira do estoque o que a compra colocou", () => {
    const compra = registrarCompra(dados);
    expect(cancelarCompra(compra)).toEqual({ ok: true });
    expect(produto("p1").saldo).toBe(5);
    expect(useComprasStore.getState().itens[0].status).toBe("cancelada");
  });

  it("não cancela se as peças já foram usadas", () => {
    const compra = registrarCompra(dados);
    useProdutosStore.getState().atualizar("p1", { saldo: 4 });
    const resultado = cancelarCompra(compra);
    expect(resultado.ok).toBe(false);
    expect(useComprasStore.getState().itens[0].status).toBe("concluida");
  });
});
