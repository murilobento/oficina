import { describe, expect, it } from "vitest";

import { diferencaAcerto } from "./movimentar";

describe("diferencaAcerto", () => {
  it("é a contagem menos o saldo, sem sobra de ponto flutuante", () => {
    expect(diferencaAcerto(10, 8.5)).toBe(-1.5);
    expect(diferencaAcerto(0.1, 0.3)).toBe(0.2);
    expect(diferencaAcerto(5, 5)).toBe(0);
  });
});
