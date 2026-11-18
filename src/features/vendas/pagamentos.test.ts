import { describe, expect, it } from "vitest";

import { corpoPagamento, estadoInicial, novaLinha, resumoPagamento, validarPagamento, type EstadoPagamento } from "./pagamentos";

const estado = (linhas: [string, string][], divergencia: EstadoPagamento["divergencia"] = ""): EstadoPagamento => ({
  linhas: linhas.map(([forma, valor]) => novaLinha(forma, valor)),
  divergencia,
});

describe("pagamentos da venda", () => {
  it("uma linha em branco vale o total", () => {
    const e = estadoInicial();
    e.linhas[0].forma = "pix";
    expect(resumoPagamento(e, 50000)).toEqual({ pago: 50000, falta: 0, excesso: 0 });
    expect(validarPagamento(e, 50000, true)).toBe("");
    expect(corpoPagamento(e, 50000)).toEqual({ pagamentos: [{ forma: "pix", valor: 50000 }] });
  });

  it("exige a forma de pagamento", () => {
    expect(validarPagamento(estadoInicial(), 50000, true)).toMatch(/forma/i);
  });

  it("500 com 400 pagos: falta 100 e pede a decisão", () => {
    const e = estado([["pix", "400,00"]]);
    expect(resumoPagamento(e, 50000)).toEqual({ pago: 40000, falta: 10000, excesso: 0 });
    expect(validarPagamento(e, 50000, true)).toMatch(/Faltam/);
  });

  it("ficar devendo exige cliente; desconto exige algum valor pago", () => {
    expect(validarPagamento(estado([["pix", "400,00"]], "saldo"), 50000, true)).toBe("");
    expect(validarPagamento(estado([["pix", "400,00"]], "saldo"), 50000, false)).toMatch(/cliente/);
    expect(validarPagamento(estado([["pix", "400,00"]], "desconto"), 50000, false)).toBe("");
    expect(validarPagamento(estado([["pix", ""], ["dinheiro", ""]], "desconto"), 50000, true)).toMatch(/Informe/);
  });

  it("envia a divergência só quando falta valor", () => {
    expect(corpoPagamento(estado([["pix", "400,00"]], "saldo"), 50000)).toEqual({ pagamentos: [{ forma: "pix", valor: 40000 }], divergencia: "saldo" });
    expect(corpoPagamento(estado([["pix", "500,00"]], "saldo"), 50000)).toEqual({ pagamentos: [{ forma: "pix", valor: 50000 }] });
  });

  it("várias formas somam; troco só em dinheiro", () => {
    expect(validarPagamento(estado([["pix", "300,00"], ["dinheiro", "200,00"]]), 50000, true)).toBe("");
    expect(validarPagamento(estado([["dinheiro", "600,00"]]), 50000, true)).toBe("");
    expect(validarPagamento(estado([["pix", "600,00"]]), 50000, true)).toMatch(/troco/);
  });
});
