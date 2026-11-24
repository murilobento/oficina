import { z } from "zod";

import { centavosParaTexto, numeroParaTexto, textoParaCentavos, textoParaNumero } from "@/lib/numeros";

export type Produto = {
  id: string;
  /** Código interno da oficina (ex.: PRD-0001). */
  codigo: string;
  descricao: string;
  categoria: string;
  marca: string;
  /** Código do fabricante / referência (OEM), usado para achar a peça certa. */
  referencia: string;
  /** EAN (8, 12, 13 ou 14 números). */
  codigoBarras: string;
  unidade: string;
  /** Veículos compatíveis, texto livre (ex.: "Gol G5 1.0 2009-2013"). */
  aplicacao: string;
  /** Em centavos. */
  custo: number;
  /** Em centavos. */
  venda: number;
  estoqueMinimo: number;
  /** Saldo atual. Não se edita no cadastro: vem da Movimentação de estoque. */
  saldo: number;
  /** Onde fica guardado (prateleira, gaveta). */
  localizacao: string;
  fornecedorId: string;
  /** Só dígitos (8). */
  ncm: string;
  observacoes: string;
  ativo: boolean;
  criadoEm: string;
};

export const CATEGORIAS_PRODUTO = [
  { valor: "filtros", texto: "Filtros" },
  { valor: "oleos", texto: "Óleos e lubrificantes" },
  { valor: "freios", texto: "Freios" },
  { valor: "suspensao", texto: "Suspensão e direção" },
  { valor: "eletrica", texto: "Elétrica e iluminação" },
  { valor: "motor", texto: "Motor e arrefecimento" },
  { valor: "transmissao", texto: "Transmissão e embreagem" },
  { valor: "pneus", texto: "Pneus e rodas" },
  { valor: "acessorios", texto: "Acessórios e fluidos" },
  { valor: "outros", texto: "Outros" },
];

export const UNIDADES = [
  { valor: "UN", texto: "UN · Unidade" },
  { valor: "L", texto: "L · Litro" },
  { valor: "KG", texto: "KG · Quilo" },
  { valor: "M", texto: "M · Metro" },
  { valor: "PAR", texto: "PAR · Par" },
  { valor: "JG", texto: "JG · Jogo" },
];

export function rotuloCategoria(categoria: string): string {
  return CATEGORIAS_PRODUTO.find((item) => item.valor === categoria)?.texto ?? categoria;
}

/** NCM: "87089990" -> "8708.99.90". */
export function mascararNCM(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}.${d.slice(4)}`;
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
}

export type SituacaoEstoque = "sem" | "baixo" | "ok";

/** Sem estoque (saldo zero), baixo (no mínimo ou abaixo, quando há mínimo) ou ok. */
export function situacaoEstoque(produto: Pick<Produto, "saldo" | "estoqueMinimo">): SituacaoEstoque {
  if (produto.saldo <= 0) return "sem";
  if (produto.estoqueMinimo > 0 && produto.saldo <= produto.estoqueMinimo) return "baixo";
  return "ok";
}

export const esquemaProduto = z.object({
  codigo: z.string().trim().max(20, "No máximo 20 caracteres."),
  descricao: z.string().trim().min(1, "Informe a descrição do produto.").max(120, "No máximo 120 caracteres."),
  categoria: z.string().min(1, "Escolha a categoria."),
  marca: z.string().trim().max(60, "No máximo 60 caracteres."),
  referencia: z.string().trim().max(40, "No máximo 40 caracteres."),
  codigoBarras: z
    .string()
    .refine((valor) => valor === "" || [8, 12, 13, 14].includes(valor.length), "O código de barras tem 8, 12, 13 ou 14 números."),
  unidade: z.string().min(1, "Escolha a unidade."),
  aplicacao: z.string().trim().max(300, "No máximo 300 caracteres."),
  custo: z.string(),
  venda: z.string(),
  estoqueMinimo: z.string().refine((valor) => !Number.isNaN(textoParaNumero(valor)), "Informe um número, como 5 ou 1,5."),
  localizacao: z.string().trim().max(40, "No máximo 40 caracteres."),
  fornecedorId: z.string(),
  ncm: z.string().refine((valor) => valor === "" || valor.replace(/\D/g, "").length === 8, "O NCM tem 8 números."),
  observacoes: z.string().trim().max(500, "No máximo 500 caracteres."),
  ativo: z.boolean(),
});

export type ProdutoFormValores = z.infer<typeof esquemaProduto>;

export const FORM_VAZIO: ProdutoFormValores = {
  codigo: "",
  descricao: "",
  categoria: "",
  marca: "",
  referencia: "",
  codigoBarras: "",
  unidade: "UN",
  aplicacao: "",
  custo: "",
  venda: "",
  estoqueMinimo: "",
  localizacao: "",
  fornecedorId: "",
  ncm: "",
  observacoes: "",
  ativo: true,
};

export function paraFormulario(produto: Produto): ProdutoFormValores {
  return {
    codigo: produto.codigo,
    descricao: produto.descricao,
    categoria: produto.categoria,
    marca: produto.marca,
    referencia: produto.referencia,
    codigoBarras: produto.codigoBarras,
    unidade: produto.unidade,
    aplicacao: produto.aplicacao,
    custo: centavosParaTexto(produto.custo),
    venda: centavosParaTexto(produto.venda),
    estoqueMinimo: numeroParaTexto(produto.estoqueMinimo),
    localizacao: produto.localizacao,
    fornecedorId: produto.fornecedorId,
    ncm: mascararNCM(produto.ncm),
    observacoes: produto.observacoes,
    ativo: produto.ativo,
  };
}

/** Dados do formulário prontos para gravar (sem id, data e saldo). O código vazio é preenchido por quem chama. */
export function paraProduto(valores: ProdutoFormValores): Omit<Produto, "id" | "criadoEm" | "saldo"> {
  return {
    ...valores,
    codigo: valores.codigo.trim(),
    custo: textoParaCentavos(valores.custo),
    venda: textoParaCentavos(valores.venda),
    estoqueMinimo: textoParaNumero(valores.estoqueMinimo),
    ncm: valores.ncm.replace(/\D/g, ""),
  };
}
