import { describe, expect, it } from "vitest";

import { dividirParcelas, situacaoParcelas, somarDias } from "./parcelas";

describe("parcelas", () => {
  it("soma dias atravessando mês e ano", () => {
    expect(somarDias("2026-12-18", 30)).toBe("2027-01-17");
    expect(somarDias("2027-02-27", 2)).toBe("2027-03-01");
  });

  it("divide igual; sobra de centavos na 1ª; vencimentos de 30 em 30 dias", () => {
    expect(dividirParcelas(10000, 3, "2026-12-18")).toEqual([
      { numero: 1, vencimento: "2026-12-18", valor: 3334 },
      { numero: 2, vencimento: "2027-01-17", valor: 3333 },
      { numero: 3, vencimento: "2027-02-16", valor: 3333 },
    ]);
  });

  it("o recebido quita da mais antiga para a mais nova", () => {
    const p = dividirParcelas(10000, 2, "2026-12-18");
    expect(situacaoParcelas(p, 10000).map((x) => x.aberto)).toEqual([5000, 5000]);
    expect(situacaoParcelas(p, 7000).map((x) => x.aberto)).toEqual([2000, 5000]);
    expect(situacaoParcelas(p, 0).map((x) => x.aberto)).toEqual([0, 0]);
    // saldo maior que as parcelas (estorno de pagamento feito na hora): parcelas inteiras em aberto
    expect(situacaoParcelas(p, 12000).map((x) => x.aberto)).toEqual([5000, 5000]);
  });
});

describe("linhasAReceber", () => {
  it("uma linha por parcela aberta, ordenada por vencimento, marcando vencidas; saldo sem parcela vira linha avulsa", async () => {
    const { linhasAReceber } = await import("./parcelas");
    const parcelas = [
      { numero: 1, vencimento: "2026-11-10", valor: 5000, pago: 5000, aberto: 0 },
      { numero: 2, vencimento: "2026-12-10", valor: 5000, pago: 0, aberto: 5000 },
    ];
    const r = linhasAReceber(
      [
        { id: "a", status: "concluida", saldo: 5000, criadoEm: "2026-10-10T12:00:00", parcelas },
        { id: "b", status: "concluida", saldo: 3000, criadoEm: "2026-11-01T12:00:00", parcelas: [] },
        { id: "c", status: "cancelada", saldo: 0, criadoEm: "2026-11-01T12:00:00", parcelas: [] },
      ],
      "2026-11-18",
    );
    expect(r).toEqual([
      { vendaId: "b", numero: 0, de: 0, vencimento: "2026-11-01", aberto: 3000, vencida: true },
      { vendaId: "a", numero: 2, de: 2, vencimento: "2026-12-10", aberto: 5000, vencida: false },
    ]);
  });
});
