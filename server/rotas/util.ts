import type { Context, Hono, MiddlewareHandler } from "hono";
import type { z } from "zod";

import type { Permissao } from "../../src/features/auth/permissoes";
import type { Banco } from "../banco";

export type Variaveis = { sessao: unknown; permissoes: Permissao[] };
export type App = Hono<{ Variables: Variaveis }>;
export type Contexto = {
  app: App;
  banco: Banco;
  exigirSessao: MiddlewareHandler<{ Variables: Variaveis }>;
  exigirPermissao: (permissao: Permissao) => MiddlewareHandler<{ Variables: Variaveis }>;
};

/** Erro que vira resposta JSON `{ erro, campos? }` com o status indicado. */
export class ErroApi extends Error {
  status: 400 | 401 | 403 | 404 | 409;
  campos?: Record<string, string>;
  constructor(status: 400 | 401 | 403 | 404 | 409, mensagem: string, campos?: Record<string, string>) {
    super(mensagem);
    this.status = status;
    this.campos = campos;
  }
}

/** Lê o corpo JSON e valida com o esquema; falhas viram 400 com a mensagem por campo. */
export async function lerCorpo<T>(c: Context, esquema: z.ZodType<T>): Promise<T> {
  const bruto = await c.req.json().catch(() => null);
  const resultado = esquema.safeParse(bruto);
  if (resultado.success) return resultado.data;
  const campos: Record<string, string> = {};
  for (const problema of resultado.error.issues) {
    const chave = problema.path.join(".") || "_";
    campos[chave] ??= problema.message;
  }
  const primeira = Object.values(campos)[0] ?? "Dados inválidos.";
  throw new ErroApi(400, primeira, campos);
}

export function paraSnake(chave: string): string {
  return chave.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);
}

const NUMERICOS = new Set(["saldo", "estoqueMinimo", "tempoHoras"]);

/** Linha do banco (snake_case) para objeto do front (camelCase); numeric vira number, data vira ISO. */
export function paraCamel<T = Record<string, unknown>>(linha: Record<string, unknown>): T {
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(linha)) {
    const nova = chave.replace(/_([a-z])/g, (_, letra: string) => letra.toUpperCase());
    if (valor instanceof Date) saida[nova] = valor.toISOString();
    else if (NUMERICOS.has(nova) && valor !== null) saida[nova] = Number(valor);
    else saida[nova] = valor;
  }
  return saida as T;
}

/** Monta `insert` com as colunas dadas (camelCase → snake_case). */
export function montarInsert(tabela: string, dados: Record<string, unknown>, extra: Record<string, string> = {}) {
  const chaves = Object.keys(dados);
  const colunas = [...chaves.map(paraSnake), ...Object.keys(extra)];
  const marcas = [...chaves.map((_, i) => `$${i + 1}`), ...Object.values(extra)];
  return {
    sql: `insert into ${tabela} (${colunas.join(", ")}) values (${marcas.join(", ")}) returning *`,
    valores: chaves.map((chave) => dados[chave]),
  };
}

/** Monta `update ... where id = $n` com as colunas dadas. */
export function montarUpdate(tabela: string, id: string, dados: Record<string, unknown>) {
  const chaves = Object.keys(dados);
  return {
    sql: `update ${tabela} set ${chaves.map((chave, i) => `${paraSnake(chave)} = $${i + 1}`).join(", ")} where id = $${chaves.length + 1} returning *`,
    valores: [...chaves.map((chave) => dados[chave]), id],
  };
}

/** Erros de violação do Postgres (23505 única, 23503 chave estrangeira). */
export function codigoPg(erro: unknown): string | undefined {
  return (erro as { code?: string })?.code;
}

/** Chave estrangeira: 23503 (referência inexistente) ou 23001 (apagar linha ainda referenciada, com RESTRICT). */
export function violaChaveEstrangeira(erro: unknown): boolean {
  return ["23503", "23001"].includes(codigoPg(erro) ?? "");
}
