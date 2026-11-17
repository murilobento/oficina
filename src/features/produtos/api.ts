import { criarCadastroApi } from "@/lib/cadastro-api";

import type { Produto } from "./tipos";

export type DadosProduto = Omit<Produto, "id" | "criadoEm" | "saldo">;

const produtos = criarCadastroApi<Produto, DadosProduto>("produtos");

export const useProdutosConsulta = produtos.useConsulta;
export const useProdutos = produtos.useLista;
export const produtosDoCache = produtos.doCache;
export const useSalvarProduto = produtos.useSalvar;
export const useAlternarAtivoProduto = produtos.useAlternarAtivo;
export const useExcluirProduto = produtos.useExcluir;
