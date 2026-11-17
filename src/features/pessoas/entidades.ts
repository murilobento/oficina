import type { Papel } from "./api";

/** Campo próprio de um cadastro (texto livre), além dos campos comuns. */
export type CampoExtra = {
  /** Chave gravada em `pessoa.extras`. */
  nome: string;
  rotulo: string;
  descricao?: string;
};

/**
 * Tudo o que muda entre Clientes e Fornecedores. As telas (lista, formulário e visualização)
 * são as mesmas e recebem uma destas configurações.
 *
 * Para criar um campo só de um cadastro, acrescente um item em `camposExtras`: ele aparece
 * no formulário e na visualização, sem mexer nos componentes.
 */
export type EntidadeConfig = {
  chave: "clientes" | "fornecedores";
  /** "Clientes" */
  titulo: string;
  /** "cliente" */
  singular: string;
  /** "clientes" */
  plural: string;
  descricao: string;
  camposExtras: CampoExtra[];
  papel: Papel;
};

export const CLIENTES: EntidadeConfig = {
  chave: "clientes",
  titulo: "Clientes",
  singular: "cliente",
  plural: "clientes",
  descricao: "Pessoas e empresas atendidas pela oficina.",
  camposExtras: [],
  papel: "cliente",
};

export const FORNECEDORES: EntidadeConfig = {
  chave: "fornecedores",
  titulo: "Fornecedores",
  singular: "fornecedor",
  plural: "fornecedores",
  descricao: "De quem a oficina compra peças, produtos e serviços.",
  camposExtras: [],
  papel: "fornecedor",
};

/** "cliente" -> "Cliente" */
export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
