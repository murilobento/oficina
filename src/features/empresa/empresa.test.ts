import { describe, expect, it } from "vitest";

import { dimensoesReduzidas } from "./logo";
import { contatosEmLista, EMPRESA_PADRAO, enderecoEmLinha, esquemaEmpresa, paraEmpresa, paraFormulario, siglaEmpresa } from "./tipos";

describe("dimensoesReduzidas", () => {
  it("limita o maior lado e mantém a proporção", () => {
    expect(dimensoesReduzidas(2000, 1000)).toEqual({ largura: 512, altura: 256 });
    expect(dimensoesReduzidas(600, 1200)).toEqual({ largura: 256, altura: 512 });
  });
  it("não amplia imagem pequena", () => {
    expect(dimensoesReduzidas(200, 100)).toEqual({ largura: 200, altura: 100 });
  });
  it("nunca devolve lado zero", () => {
    expect(dimensoesReduzidas(10000, 1).altura).toBe(1);
  });
});

describe("siglaEmpresa", () => {
  it("usa a primeira e a última palavra", () => {
    expect(siglaEmpresa("Auto Center Silva")).toBe("AS");
    expect(siglaEmpresa("Oficina do Zé")).toBe("OZ");
  });
  it("uma palavra só usa as duas primeiras letras", () => {
    expect(siglaEmpresa("Mecânica")).toBe("ME");
  });
  it("sem nome cai em OF", () => {
    expect(siglaEmpresa("  ")).toBe("OF");
  });
});

describe("esquemaEmpresa e conversões", () => {
  const valido = paraFormulario({ ...EMPRESA_PADRAO, nomeFantasia: "Auto Center Silva" });

  it("aceita o mínimo: só o nome fantasia", () => {
    expect(esquemaEmpresa.safeParse(valido).success).toBe(true);
  });
  it("exige o nome fantasia", () => {
    expect(esquemaEmpresa.safeParse({ ...valido, nomeFantasia: "  " }).success).toBe(false);
  });
  it("CNPJ opcional, mas válido se preenchido", () => {
    expect(esquemaEmpresa.safeParse({ ...valido, cnpj: "11.222.333/0001-81" }).success).toBe(true);
    expect(esquemaEmpresa.safeParse({ ...valido, cnpj: "11.222.333/0001-82" }).success).toBe(false);
    expect(esquemaEmpresa.safeParse({ ...valido, cnpj: "11.222" }).success).toBe(false);
  });
  it("valida telefone, e-mail e validade", () => {
    expect(esquemaEmpresa.safeParse({ ...valido, telefone: "(11) 123" }).success).toBe(false);
    expect(esquemaEmpresa.safeParse({ ...valido, email: "x@" }).success).toBe(false);
    expect(esquemaEmpresa.safeParse({ ...valido, validadeOrcamentoDias: "0" }).success).toBe(false);
    expect(esquemaEmpresa.safeParse({ ...valido, validadeOrcamentoDias: "91" }).success).toBe(false);
  });
  it("tira a máscara ao salvar e põe de volta ao editar", () => {
    const salvo = paraEmpresa({ ...valido, cnpj: "11.222.333/0001-81", cep: "01001-000", telefone: "(11) 3333-4444", email: "A@B.COM" });
    expect(salvo).toMatchObject({ cnpj: "11222333000181", cep: "01001000", telefone: "1133334444", email: "a@b.com", validadeOrcamentoDias: 7 });
    expect(paraFormulario(salvo)).toMatchObject({ cnpj: "11.222.333/0001-81", cep: "01001-000", telefone: "(11) 3333-4444" });
  });
});

describe("textos para documentos", () => {
  it("monta endereço só com o que existe", () => {
    expect(enderecoEmLinha({ ...EMPRESA_PADRAO, logradouro: "Rua A", numero: "10", cidade: "Osasco", uf: "SP" })).toBe("Rua A, 10 · Osasco/SP");
    expect(enderecoEmLinha(EMPRESA_PADRAO)).toBe("");
  });
  it("lista contatos preenchidos", () => {
    expect(contatosEmLista({ ...EMPRESA_PADRAO, telefone: "1133334444", site: "oficina.com.br" })).toEqual(["Tel. (11) 3333-4444", "oficina.com.br"]);
  });
});
