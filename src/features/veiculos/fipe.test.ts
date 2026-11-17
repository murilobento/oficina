import { describe, expect, it } from "vitest";

import { anosModelo, combustivelDoModelo, limparMarca, modeloCompleto, motorDoModelo } from "./fipe";

describe("anosModelo", () => {
  it("vai do ano que vem até 1970, do mais novo para o mais antigo", () => {
    const anos = anosModelo(2026);
    expect(anos[0]).toBe("2027");
    expect(anos[1]).toBe("2026");
    expect(anos.at(-1)).toBe("1970");
  });
});

describe("motorDoModelo", () => {
  it.each([
    ["HB20 1.0 Comfort 12V Flex", "1.0"],
    ["Gol 1.6 16V Total Flex", "1.6 16V"],
    ["Hilux CD 2.8 TDI Diesel 4x4", "2.8"],
    ["Uno Mille", ""],
    ["Fusca 1300", ""],
  ])("%s → %s", (nome, motor) => expect(motorDoModelo(nome)).toBe(motor));
});

describe("combustivelDoModelo", () => {
  it.each([
    ["HB20 1.0 Comfort 12V Flex", "flex"],
    ["Hilux CD 2.8 TDI Diesel 4x4", "diesel"],
    ["Prius 1.8 Híbrido", "hibrido"],
    ["Uno Mille Gasolina", "gasolina"],
    ["Palio 1.0 8V", ""],
  ])("%s → %s", (nome, combustivel) => expect(combustivelDoModelo(nome)).toBe(combustivel));
});

describe("limparMarca e modeloCompleto", () => {
  it("tira prefixos como 'GM - ' e 'VW - '", () => {
    expect(limparMarca("GM - Chevrolet")).toBe("Chevrolet");
    expect(limparMarca("VW - VolksWagen")).toBe("VolksWagen");
    expect(limparMarca("Fiat")).toBe("Fiat");
  });
  it("junta marca e modelo e respeita o limite de 100 caracteres", () => {
    expect(modeloCompleto("Hyundai", "HB20 1.0 Comfort")).toBe("Hyundai HB20 1.0 Comfort");
    expect(modeloCompleto("X", "y".repeat(200))).toHaveLength(100);
  });
});
