import { z } from "zod";

import {
  limparDocumento,
  mascararCEP,
  mascararDocumento,
  mascararTelefone,
  soDigitos,
  type TipoPessoa,
  validarDocumento,
} from "./documento";

/**
 * Cadastro de pessoa (cliente ou fornecedor). Documento, CEP e telefones ficam guardados
 * sem máscara e sempre como texto: o CNPJ pode ter letras (formato alfanumérico).
 */
export type Pessoa = {
  id: string;
  tipo: TipoPessoa;
  /** CPF (PF) ou CNPJ (PJ), sem máscara. Vazio quando não informado. */
  documento: string;
  /** Nome (PF) ou razão social (PJ). */
  nome: string;
  nomeFantasia: string;
  email: string;
  telefone: string;
  celular: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  observacoes: string;
  /** Vêm da consulta do CNPJ; só fazem sentido para PJ. */
  situacaoCadastral: string;
  cnaePrincipal: string;
  ativo: boolean;
  /** Campos próprios de cada cadastro (ver `camposExtras` em entidades.ts). */
  extras: Record<string, string>;
  criadoEm: string;
};

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const telefoneOpcional = z.string().refine((valor) => [0, 10, 11].includes(soDigitos(valor).length), {
  message: "Informe o telefone com DDD, por exemplo (11) 3333-4444.",
});

// No formulário os valores ficam com máscara; `paraPessoa` tira a máscara ao salvar.
// O mesmo esquema deve validar a entrada no servidor quando houver backend.
export const esquemaPessoa = z
  .object({
    tipo: z.enum(["PF", "PJ"]),
    documento: z.string(),
    nome: z.string().trim().min(2, { message: "Informe o nome." }),
    nomeFantasia: z.string().trim(),
    email: z.union([z.literal(""), z.email({ message: "Informe um e-mail válido, como nome@exemplo.com.br." })]),
    telefone: telefoneOpcional,
    celular: telefoneOpcional,
    cep: z.string().refine((valor) => [0, 8].includes(soDigitos(valor).length), {
      message: "O CEP tem 8 números, por exemplo 01001-000.",
    }),
    logradouro: z.string().trim(),
    numero: z.string().trim(),
    complemento: z.string().trim(),
    bairro: z.string().trim(),
    cidade: z.string().trim(),
    uf: z.string(),
    observacoes: z.string().trim(),
    situacaoCadastral: z.string().trim(),
    cnaePrincipal: z.string().trim(),
    ativo: z.boolean(),
    extras: z.record(z.string(), z.string()),
  })
  .superRefine((valores, contexto) => {
    // O documento não é obrigatório; se foi preenchido, precisa ser válido.
    const documento = limparDocumento(valores.tipo, valores.documento);
    if (documento === "" || validarDocumento(valores.tipo, documento)) return;

    const esperado = valores.tipo === "PF" ? 11 : 14;
    const nome = valores.tipo === "PF" ? "CPF" : "CNPJ";
    contexto.addIssue({
      code: "custom",
      path: ["documento"],
      message:
        documento.length < esperado
          ? `${nome} incompleto: faltam ${esperado - documento.length} de ${esperado} caracteres.`
          : `${nome} inválido. Confira os números digitados ou deixe o campo em branco.`,
    });
  });

export type PessoaFormValores = z.infer<typeof esquemaPessoa>;

export const FORM_VAZIO: PessoaFormValores = {
  tipo: "PF",
  documento: "",
  nome: "",
  nomeFantasia: "",
  email: "",
  telefone: "",
  celular: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  observacoes: "",
  situacaoCadastral: "",
  cnaePrincipal: "",
  ativo: true,
  extras: {},
};

/** Valores do formulário (com máscara) a partir de um cadastro salvo. */
export function paraFormulario(pessoa: Pessoa): PessoaFormValores {
  const { id: _id, criadoEm: _criadoEm, ...dados } = pessoa;
  return {
    ...dados,
    documento: mascararDocumento(pessoa.tipo, pessoa.documento),
    telefone: mascararTelefone(pessoa.telefone),
    celular: mascararTelefone(pessoa.celular),
    cep: mascararCEP(pessoa.cep),
  };
}

/** Dados prontos para salvar (sem máscara) a partir dos valores do formulário. */
export function paraPessoa(valores: PessoaFormValores): Omit<Pessoa, "id" | "criadoEm"> {
  const pessoaFisica = valores.tipo === "PF";
  return {
    ...valores,
    documento: limparDocumento(valores.tipo, valores.documento),
    telefone: soDigitos(valores.telefone),
    celular: soDigitos(valores.celular),
    cep: soDigitos(valores.cep),
    email: valores.email.toLowerCase(),
    // Situação cadastral e CNAE só existem para empresa.
    situacaoCadastral: pessoaFisica ? "" : valores.situacaoCadastral,
    cnaePrincipal: pessoaFisica ? "" : valores.cnaePrincipal,
  };
}

export function rotuloDocumento(tipo: TipoPessoa): string {
  return tipo === "PF" ? "CPF" : "CNPJ";
}

export function rotuloTipo(tipo: TipoPessoa): string {
  return tipo === "PF" ? "Pessoa física" : "Pessoa jurídica";
}

/** "Rua X, 10, sala 2 · Centro · São Paulo/SP · 01001-000", só com as partes preenchidas. */
export function enderecoEmLinha(pessoa: Pessoa): string {
  const rua = [pessoa.logradouro, pessoa.numero, pessoa.complemento].filter(Boolean).join(", ");
  const cidade = [pessoa.cidade, pessoa.uf].filter(Boolean).join("/");
  return [rua, pessoa.bairro, cidade, mascararCEP(pessoa.cep)].filter(Boolean).join(" · ");
}
