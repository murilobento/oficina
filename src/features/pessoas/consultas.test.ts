import { afterEach, describe, expect, it, vi } from "vitest";

import { consultarCEP, consultarCNPJ, ErroConsulta } from "./consultas";

type Resposta = { status: number; corpo?: unknown } | "rede";

/** Simula o fetch: cada trecho de endereço responde com o status e o corpo dados. */
function simularFetch(rotas: Record<string, Resposta>) {
  const chamadas: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    chamadas.push(url);
    const chave = Object.keys(rotas).find((trecho) => url.includes(trecho));
    const resposta = chave ? rotas[chave] : "rede";
    if (resposta === "rede") throw new TypeError("Failed to fetch");
    return new Response(JSON.stringify(resposta.corpo ?? {}), { status: resposta.status });
  });
  return chamadas;
}

afterEach(() => vi.unstubAllGlobals());

const EMPRESA_BRASILAPI = {
  razao_social: "EMPRESA EXEMPLO LTDA",
  nome_fantasia: "EXEMPLO",
  cep: "01001000",
  descricao_tipo_de_logradouro: "PRAÇA",
  logradouro: "DA SE",
  numero: "100",
  complemento: "",
  bairro: "SE",
  municipio: "SAO PAULO",
  uf: "SP",
  ddd_telefone_1: "1133334444",
  email: "CONTATO@EXEMPLO.COM.BR",
  descricao_situacao_cadastral: "ATIVA",
  cnae_fiscal: 4520001,
  cnae_fiscal_descricao: "Serviços de manutenção e reparação mecânica de veículos automotores",
};

describe("consultarCNPJ", () => {
  it("usa a BrasilAPI e converte os campos", async () => {
    const chamadas = simularFetch({ "brasilapi.com.br/api/cnpj": { status: 200, corpo: EMPRESA_BRASILAPI } });
    const dados = await consultarCNPJ("11.222.333/0001-81");

    expect(chamadas).toEqual(["https://brasilapi.com.br/api/cnpj/v1/11222333000181"]);
    expect(dados).toMatchObject({
      nome: "EMPRESA EXEMPLO LTDA",
      nomeFantasia: "EXEMPLO",
      logradouro: "PRAÇA DA SE",
      cidade: "SAO PAULO",
      uf: "SP",
      email: "contato@exemplo.com.br",
      situacaoCadastral: "ATIVA",
      cnaePrincipal: "4520-0/01 - Serviços de manutenção e reparação mecânica de veículos automotores",
      fonte: "BrasilAPI",
    });
  });

  it("não tenta o fallback quando a BrasilAPI diz que o CNPJ não existe", async () => {
    const chamadas = simularFetch({ "brasilapi.com.br/api/cnpj": { status: 404 } });
    await expect(consultarCNPJ("11222333000181")).rejects.toMatchObject({ motivo: "nao_encontrado" });
    expect(chamadas).toHaveLength(1);
  });

  it("cai para a ReceitaWS quando a BrasilAPI está fora do ar", async () => {
    simularFetch({
      "brasilapi.com.br/api/cnpj": { status: 500 },
      "receitaws.com.br": {
        status: 200,
        corpo: {
          status: "OK",
          nome: "EMPRESA EXEMPLO LTDA",
          fantasia: "EXEMPLO",
          cep: "01.001-000",
          telefone: "(11) 3333-4444/ (11) 5555-6666",
          situacao: "ATIVA",
          atividade_principal: [{ code: "45.20-0-01", text: "Manutenção mecânica" }],
        },
      },
    });
    const dados = await consultarCNPJ("11222333000181");
    expect(dados).toMatchObject({ fonte: "ReceitaWS", cep: "01001000", telefone: "1133334444" });
    expect(dados.cnaePrincipal).toBe("4520-0/01 - Manutenção mecânica");
  });

  it("informa limite de consultas quando o fallback responde 429", async () => {
    simularFetch({ "brasilapi.com.br/api/cnpj": "rede", "receitaws.com.br": { status: 429 } });
    await expect(consultarCNPJ("11222333000181")).rejects.toMatchObject({ motivo: "limite" });
  });

  it("informa indisponibilidade quando os dois serviços falham", async () => {
    simularFetch({});
    const erro = await consultarCNPJ("11222333000181").catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroConsulta);
    expect((erro as ErroConsulta).motivo).toBe("indisponivel");
  });
});

describe("consultarCEP", () => {
  it("usa a BrasilAPI", async () => {
    simularFetch({
      "brasilapi.com.br/api/cep": {
        status: 200,
        corpo: { state: "SP", city: "São Paulo", neighborhood: "Sé", street: "Praça da Sé" },
      },
    });
    expect(await consultarCEP("01001-000")).toEqual({
      logradouro: "Praça da Sé",
      bairro: "Sé",
      cidade: "São Paulo",
      uf: "SP",
      fonte: "BrasilAPI",
    });
  });

  it("cai para o ViaCEP quando a BrasilAPI falha", async () => {
    simularFetch({
      "brasilapi.com.br/api/cep": { status: 404 },
      "viacep.com.br": {
        status: 200,
        corpo: { logradouro: "Praça da Sé", bairro: "Sé", localidade: "São Paulo", uf: "SP" },
      },
    });
    expect(await consultarCEP("01001000")).toMatchObject({ cidade: "São Paulo", fonte: "ViaCEP" });
  });

  it("só dá o CEP como inexistente quando o ViaCEP confirma", async () => {
    simularFetch({ "brasilapi.com.br/api/cep": { status: 404 }, "viacep.com.br": { status: 200, corpo: { erro: true } } });
    await expect(consultarCEP("99999999")).rejects.toMatchObject({ motivo: "nao_encontrado" });
  });
});
