import { describe, expect, it } from "vitest";

import {
  centavosParaTexto,
  formatarQuantidade,
  margemSobreCusto,
  mascararMoeda,
  mascararQuantidade,
  numeroParaTexto,
  proximoCodigo,
  textoParaCentavos,
  textoParaNumero,
} from "./numeros";

describe("moeda", () => {
  it("mascara conforme digita", () => {
    expect(mascararMoeda("")).toBe("");
    expect(mascararMoeda("5")).toBe("0,05");
    expect(mascararMoeda("123456")).toBe("1.234,56");
    expect(mascararMoeda("1.234,567")).toBe("12.345,67");
    expect(mascararMoeda("abc")).toBe("");
  });
  it("converte texto <-> centavos", () => {
    expect(textoParaCentavos("1.234,56")).toBe(123456);
    expect(textoParaCentavos("")).toBe(0);
    expect(centavosParaTexto(123456)).toBe("1.234,56");
    expect(centavosParaTexto(0)).toBe("");
    expect(centavosParaTexto(5)).toBe("0,05");
  });
});

describe("quantidade", () => {
  it("limita a 3 casas e só aceita números e vírgula", () => {
    expect(mascararQuantidade("1,2345")).toBe("1,234");
    expect(mascararQuantidade("a1b")).toBe("1");
    expect(mascararQuantidade("1,2,3")).toBe("1,23");
  });
  it("converte texto <-> número", () => {
    expect(textoParaNumero("1,5")).toBe(1.5);
    expect(textoParaNumero("")).toBe(0);
    expect(Number.isNaN(textoParaNumero(","))).toBe(true);
    expect(numeroParaTexto(1.5)).toBe("1,5");
    expect(numeroParaTexto(0)).toBe("");
    expect(formatarQuantidade(1234.5)).toBe("1.234,5");
  });
});

describe("margem e código", () => {
  it("calcula a margem sobre o custo", () => {
    expect(margemSobreCusto(10000, 14500)).toBe(45);
    expect(margemSobreCusto(0, 14500)).toBeNull();
    expect(margemSobreCusto(10000, 0)).toBeNull();
  });
  it("gera o próximo código", () => {
    expect(proximoCodigo("PRD", [])).toBe("PRD-0001");
    expect(proximoCodigo("PRD", ["PRD-0007", "x", "prd-0002"])).toBe("PRD-0008");
    expect(proximoCodigo("SRV", ["SRV-009"], 3)).toBe("SRV-010");
  });
});
