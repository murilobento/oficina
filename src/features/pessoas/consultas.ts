// Consultas a serviços públicos para preencher o cadastro (CNPJ e CEP), direto do navegador.
//
// ESTRATÉGIA DE FALLBACK
//
// CNPJ
//   1. BrasilAPI (principal): gratuita, sem chave e com CORS liberado.
//      - 404 = CNPJ não existe na base. É uma resposta definitiva: não tenta o fallback.
//      - 429, 5xx, tempo esgotado ou falha de rede = serviço indisponível: tenta o fallback.
//   2. ReceitaWS (secundário): o plano gratuito aceita só 3 consultas por minuto, por isso
//      só entra quando a BrasilAPI falha. Atenção: a ReceitaWS pode não liberar CORS para
//      chamadas feitas do navegador; nesse caso a chamada falha e o usuário vê o aviso de
//      serviço indisponível. Quando houver backend, esta consulta deve passar por ele.
//   Se as duas falharem, o erro informa se foi limite de consultas ou indisponibilidade.
//
// CEP
//   1. BrasilAPI (principal).
//   2. ViaCEP (fallback): entra em qualquer falha da BrasilAPI, inclusive "não encontrado",
//      porque a BrasilAPI às vezes responde 404 quando as fontes dela estão fora do ar.
//   O CEP só é dado como inexistente quando o ViaCEP confirma.
//
// CNPJ alfanumérico: o valor é sempre tratado como texto. Enquanto os serviços não aceitarem
// letras, a consulta de um CNPJ alfanumérico termina como "não encontrado" ou "indisponível"
// e o usuário preenche os dados à mão; nada mais precisa mudar aqui.

import { limparCNPJ, soDigitos } from "./documento";

export type MotivoErroConsulta = "nao_encontrado" | "limite" | "indisponivel";

export class ErroConsulta extends Error {
  readonly motivo: MotivoErroConsulta;

  constructor(motivo: MotivoErroConsulta, mensagem: string) {
    super(mensagem);
    this.name = "ErroConsulta";
    this.motivo = motivo;
  }
}

export type DadosCNPJ = {
  nome: string;
  nomeFantasia: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  situacaoCadastral: string;
  cnaePrincipal: string;
  fonte: "BrasilAPI" | "ReceitaWS";
};

export type DadosCEP = {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  fonte: "BrasilAPI" | "ViaCEP";
};

const TEMPO_LIMITE_MS = 8000;

type Json = Record<string, unknown>;

/** Lê um campo como texto, sem espaços nas pontas ("" quando não veio). */
function texto(valor: unknown): string {
  return typeof valor === "string" || typeof valor === "number" ? String(valor).trim() : "";
}

/** Faz a chamada com tempo limite. Devolve o status e o corpo (ou lança em falha de rede). */
async function buscarJson(url: string): Promise<{ status: number; corpo: Json | null }> {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(url, { signal: controle.signal, headers: { Accept: "application/json" } });
    const corpo = (await resposta.json().catch(() => null)) as Json | null;
    return { status: resposta.status, corpo };
  } finally {
    clearTimeout(relogio);
  }
}

function formatarCnae(codigo: string, descricao: string): string {
  const digitos = soDigitos(codigo);
  const formatado =
    digitos.length === 7 ? `${digitos.slice(0, 4)}-${digitos.slice(4, 5)}/${digitos.slice(5)}` : codigo;
  return [formatado, descricao].filter(Boolean).join(" - ");
}

async function cnpjNaBrasilAPI(cnpj: string): Promise<DadosCNPJ> {
  const { status, corpo } = await buscarJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  if (status === 404) throw new ErroConsulta("nao_encontrado", "CNPJ não encontrado.");
  if (status === 429) throw new ErroConsulta("limite", "Limite de consultas atingido.");
  if (status !== 200 || !corpo) throw new ErroConsulta("indisponivel", "BrasilAPI indisponível.");

  return {
    nome: texto(corpo.razao_social),
    nomeFantasia: texto(corpo.nome_fantasia),
    email: texto(corpo.email).toLowerCase(),
    telefone: soDigitos(texto(corpo.ddd_telefone_1)),
    cep: soDigitos(texto(corpo.cep)),
    logradouro: [texto(corpo.descricao_tipo_de_logradouro), texto(corpo.logradouro)].filter(Boolean).join(" "),
    numero: texto(corpo.numero),
    complemento: texto(corpo.complemento),
    bairro: texto(corpo.bairro),
    cidade: texto(corpo.municipio),
    uf: texto(corpo.uf).toUpperCase(),
    situacaoCadastral: texto(corpo.descricao_situacao_cadastral),
    cnaePrincipal: formatarCnae(texto(corpo.cnae_fiscal), texto(corpo.cnae_fiscal_descricao)),
    fonte: "BrasilAPI",
  };
}

async function cnpjNaReceitaWS(cnpj: string): Promise<DadosCNPJ> {
  const { status, corpo } = await buscarJson(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
  if (status === 429) throw new ErroConsulta("limite", "Limite de consultas atingido.");
  if (status !== 200 || !corpo) throw new ErroConsulta("indisponivel", "ReceitaWS indisponível.");
  // A ReceitaWS responde 200 com status "ERROR" quando o CNPJ não existe.
  if (texto(corpo.status) === "ERROR") throw new ErroConsulta("nao_encontrado", "CNPJ não encontrado.");

  const atividades = Array.isArray(corpo.atividade_principal) ? (corpo.atividade_principal as Json[]) : [];
  const principal = atividades[0] ?? {};

  return {
    nome: texto(corpo.nome),
    nomeFantasia: texto(corpo.fantasia),
    email: texto(corpo.email).toLowerCase(),
    // Pode vir mais de um telefone separado por "/": fica o primeiro.
    telefone: soDigitos(texto(corpo.telefone).split("/")[0]),
    cep: soDigitos(texto(corpo.cep)),
    logradouro: texto(corpo.logradouro),
    numero: texto(corpo.numero),
    complemento: texto(corpo.complemento),
    bairro: texto(corpo.bairro),
    cidade: texto(corpo.municipio),
    uf: texto(corpo.uf).toUpperCase(),
    situacaoCadastral: texto(corpo.situacao),
    cnaePrincipal: formatarCnae(texto(principal.code), texto(principal.text)),
    fonte: "ReceitaWS",
  };
}

/** Converte qualquer falha (rede, tempo esgotado, resposta inesperada) em ErroConsulta. */
function comoErroConsulta(erro: unknown): ErroConsulta {
  return erro instanceof ErroConsulta ? erro : new ErroConsulta("indisponivel", "Serviço indisponível.");
}

/** Busca os dados de uma empresa pelo CNPJ. Lança ErroConsulta com mensagem pronta para a tela. */
export async function consultarCNPJ(valor: string): Promise<DadosCNPJ> {
  const cnpj = limparCNPJ(valor);

  let erroPrincipal: ErroConsulta;
  try {
    return await cnpjNaBrasilAPI(cnpj);
  } catch (erro) {
    erroPrincipal = comoErroConsulta(erro);
  }

  if (erroPrincipal.motivo !== "nao_encontrado") {
    try {
      return await cnpjNaReceitaWS(cnpj);
    } catch (erro) {
      const erroFallback = comoErroConsulta(erro);
      if (erroFallback.motivo === "nao_encontrado") erroPrincipal = erroFallback;
      else if (erroFallback.motivo === "limite") erroPrincipal = erroFallback;
    }
  }

  switch (erroPrincipal.motivo) {
    case "nao_encontrado":
      throw new ErroConsulta(
        "nao_encontrado",
        "Não encontramos empresa com este CNPJ. Confira o número ou preencha os dados à mão.",
      );
    case "limite":
      throw new ErroConsulta(
        "limite",
        "Muitas consultas em pouco tempo. Aguarde um minuto e tente de novo, ou preencha os dados à mão.",
      );
    default:
      throw new ErroConsulta(
        "indisponivel",
        "A consulta de CNPJ está fora do ar no momento. Tente de novo mais tarde ou preencha os dados à mão.",
      );
  }
}

async function cepNaBrasilAPI(cep: string): Promise<DadosCEP> {
  const { status, corpo } = await buscarJson(`https://brasilapi.com.br/api/cep/v1/${cep}`);
  if (status === 404) throw new ErroConsulta("nao_encontrado", "CEP não encontrado.");
  if (status !== 200 || !corpo) throw new ErroConsulta("indisponivel", "BrasilAPI indisponível.");
  return {
    logradouro: texto(corpo.street),
    bairro: texto(corpo.neighborhood),
    cidade: texto(corpo.city),
    uf: texto(corpo.state).toUpperCase(),
    fonte: "BrasilAPI",
  };
}

async function cepNoViaCEP(cep: string): Promise<DadosCEP> {
  const { status, corpo } = await buscarJson(`https://viacep.com.br/ws/${cep}/json/`);
  if (status !== 200 || !corpo) throw new ErroConsulta("indisponivel", "ViaCEP indisponível.");
  // O ViaCEP responde 200 com { erro: true } quando o CEP não existe.
  if (corpo.erro) throw new ErroConsulta("nao_encontrado", "CEP não encontrado.");
  return {
    logradouro: texto(corpo.logradouro),
    bairro: texto(corpo.bairro),
    cidade: texto(corpo.localidade),
    uf: texto(corpo.uf).toUpperCase(),
    fonte: "ViaCEP",
  };
}

/** Busca o endereço de um CEP. Lança ErroConsulta com mensagem pronta para a tela. */
export async function consultarCEP(valor: string): Promise<DadosCEP> {
  const cep = soDigitos(valor);
  try {
    return await cepNaBrasilAPI(cep);
  } catch {
    // Qualquer falha da principal passa para o ViaCEP (ver estratégia no topo do arquivo).
  }

  try {
    return await cepNoViaCEP(cep);
  } catch (erro) {
    if (comoErroConsulta(erro).motivo === "nao_encontrado") {
      throw new ErroConsulta("nao_encontrado", "CEP não encontrado. Confira o número ou preencha o endereço à mão.");
    }
    throw new ErroConsulta(
      "indisponivel",
      "A consulta de CEP está fora do ar no momento. Preencha o endereço à mão.",
    );
  }
}
