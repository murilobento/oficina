import type { TipoPessoa } from "./documento";
import { criarPessoasStore } from "./store";
import type { Pessoa } from "./tipos";

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
  useStore: ReturnType<typeof criarPessoasStore>;
};

// DADOS DE EXEMPLO (fictícios), só para as telas não abrirem vazias no protótipo.
function exemplo(id: string, tipo: TipoPessoa, nome: string, dados: Partial<Pessoa> = {}): Pessoa {
  return {
    id,
    tipo,
    documento: "",
    nome,
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
    criadoEm: "2026-11-02T09:00:00",
    ...dados,
  };
}

const CLIENTES_EXEMPLO: Pessoa[] = [
  exemplo("c1", "PF", "Ana Exemplo Souza", {
    documento: "11144477735",
    celular: "11955550101",
    email: "ana.souza@exemplo.com.br",
    cidade: "São Paulo",
    uf: "SP",
  }),
  exemplo("c2", "PF", "Bruno Exemplo Lima", { celular: "11955550102", cidade: "Guarulhos", uf: "SP" }),
  exemplo("c3", "PJ", "Transportes Exemplo Ltda", {
    documento: "11222333000181",
    nomeFantasia: "Exemplo Transportes",
    telefone: "1155550103",
    email: "frota@exemplo.com.br",
    cidade: "Osasco",
    uf: "SP",
    observacoes: "Frota de 6 utilitários. Faturamento mensal.",
  }),
  exemplo("c4", "PF", "Carla Exemplo Rocha", { celular: "11955550104", ativo: false }),
];

const FORNECEDORES_EXEMPLO: Pessoa[] = [
  exemplo("f1", "PJ", "Autopeças Exemplo Ltda", {
    nomeFantasia: "Exemplo Autopeças",
    telefone: "1155550201",
    email: "vendas@autopecas.exemplo.com.br",
    cidade: "São Paulo",
    uf: "SP",
  }),
  exemplo("f2", "PJ", "Distribuidora de Lubrificantes Exemplo S.A.", {
    nomeFantasia: "Lub Exemplo",
    telefone: "1155550202",
    cidade: "Barueri",
    uf: "SP",
  }),
  exemplo("f3", "PF", "Diego Exemplo Alves", {
    celular: "11955550203",
    observacoes: "Retífica de motores, atende por encomenda.",
  }),
];

export const CLIENTES: EntidadeConfig = {
  chave: "clientes",
  titulo: "Clientes",
  singular: "cliente",
  plural: "clientes",
  descricao: "Pessoas e empresas atendidas pela oficina.",
  camposExtras: [],
  useStore: criarPessoasStore("clientes", CLIENTES_EXEMPLO),
};

export const FORNECEDORES: EntidadeConfig = {
  chave: "fornecedores",
  titulo: "Fornecedores",
  singular: "fornecedor",
  plural: "fornecedores",
  descricao: "De quem a oficina compra peças, produtos e serviços.",
  camposExtras: [],
  useStore: criarPessoasStore("fornecedores", FORNECEDORES_EXEMPLO),
};

/** "cliente" -> "Cliente" */
export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
