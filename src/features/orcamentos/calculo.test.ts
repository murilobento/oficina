import { describe, expect, it } from "vitest";

import { calcularTotais, subtotalItem, validoAte } from "./calculo";

const itens = [
  { tipo: "servico" as const, quantidade: 1, valor: 6000 },
  { tipo: "produto" as const, quantidade: 4, valor: 5290 },
  { tipo: "produto" as const, quantidade: 1.5, valor: 333 },
];

describe("calcularTotais", () => {
  it("separa peças e mão de obra e arredonda ao centavo", () => {
    expect(subtotalItem({ quantidade: 1.5, valor: 333 })).toBe(500); // 499,5 -> 500
    const t = calcularTotais(itens, "valor", 0);
    expect(t.maoDeObra).toBe(6000);
    expect(t.pecas).toBe(21160 + 500);
    expect(t.subtotal).toBe(27660);
    expect(t.total).toBe(27660);
  });
  it("desconto em percentual", () => {
    const t = calcularTotais(itens, "percentual", 10);
    expect(t.desconto).toBe(2766);
    expect(t.total).toBe(24894);
  });
  it("desconto em valor, limitado ao subtotal", () => {
    expect(calcularTotais(itens, "valor", 1000).total).toBe(26660);
    const t = calcularTotais(itens, "valor", 999999);
    expect(t.desconto).toBe(27660);
    expect(t.total).toBe(0);
  });
  it("percentual acima de 100 vale 100, e negativo vale 0", () => {
    expect(calcularTotais(itens, "percentual", 150).total).toBe(0);
    expect(calcularTotais(itens, "percentual", -5).total).toBe(27660);
  });
  it("sem itens, tudo zero", () => {
    expect(calcularTotais([], "percentual", 10)).toEqual({ pecas: 0, maoDeObra: 0, subtotal: 0, desconto: 0, total: 0 });
  });
});

describe("validoAte", () => {
  it("vale até o fim do último dia", () => {
    const fim = validoAte("2026-11-10T15:00:00", 7);
    expect([fim.getFullYear(), fim.getMonth() + 1, fim.getDate(), fim.getHours()]).toEqual([2026, 11, 17, 23]);
  });
});
