import { describe, expect, it } from "vitest";

import {
  limparCNPJ,
  mascararCEP,
  mascararCNPJ,
  mascararCPF,
  mascararTelefone,
  validarCNPJ,
  validarCPF,
} from "./documento";

describe("validarCPF", () => {
  it("aceita CPF válido com ou sem máscara", () => {
    expect(validarCPF("111.444.777-35")).toBe(true);
    expect(validarCPF("11144477735")).toBe(true);
    expect(validarCPF("529.982.247-25")).toBe(true);
  });

  it("recusa dígito verificador errado, tamanho errado e dígitos repetidos", () => {
    expect(validarCPF("111.444.777-36")).toBe(false);
    expect(validarCPF("1114447773")).toBe(false);
    expect(validarCPF("111.111.111-11")).toBe(false);
    expect(validarCPF("")).toBe(false);
  });
});

describe("validarCNPJ", () => {
  it("aceita CNPJ numérico válido com ou sem máscara", () => {
    expect(validarCNPJ("11.222.333/0001-81")).toBe(true);
    expect(validarCNPJ("11222333000181")).toBe(true);
  });

  it("aceita CNPJ alfanumérico válido (exemplo da Receita Federal)", () => {
    expect(validarCNPJ("12.ABC.345/01DE-35")).toBe(true);
    expect(validarCNPJ("12abc34501de35")).toBe(true);
  });

  it("recusa dígito verificador errado, letras nos verificadores e dígitos repetidos", () => {
    expect(validarCNPJ("11.222.333/0001-82")).toBe(false);
    expect(validarCNPJ("12.ABC.345/01DE-36")).toBe(false);
    expect(validarCNPJ("12.ABC.345/01DE-3A")).toBe(false);
    expect(validarCNPJ("00.000.000/0000-00")).toBe(false);
    expect(validarCNPJ("1122233300018")).toBe(false);
  });
});

describe("máscaras", () => {
  it("formata valores completos e parciais", () => {
    expect(mascararCPF("11144477735")).toBe("111.444.777-35");
    expect(mascararCPF("1114")).toBe("111.4");
    expect(mascararCNPJ("11222333000181")).toBe("11.222.333/0001-81");
    expect(mascararCNPJ("12abc34501de35")).toBe("12.ABC.345/01DE-35");
    expect(mascararCEP("01001000")).toBe("01001-000");
    expect(mascararTelefone("1133334444")).toBe("(11) 3333-4444");
    expect(mascararTelefone("11933334444")).toBe("(11) 93333-4444");
  });

  it("limpa o CNPJ mantendo letras em maiúsculas", () => {
    expect(limparCNPJ("12.abc.345/01de-35")).toBe("12ABC34501DE35");
  });
});
