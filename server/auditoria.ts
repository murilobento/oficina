import type { Context } from "hono";

import type { Consulta } from "./banco";
import type { Variaveis } from "./rotas/util";

export const CATEGORIAS_AUDITORIA = ["dinheiro", "estoque", "precos", "documentos", "cadastros", "acesso", "login"] as const;
export type CategoriaAuditoria = (typeof CATEGORIAS_AUDITORIA)[number];

/** Um campo que mudou: valor antes e depois. */
export type Mudanca = { campo: string; antes: unknown; depois: unknown };

export type RegistroAuditoria = {
  categoria: CategoriaAuditoria;
  /** Chave estável, ex.: "venda.cancelada". */
  acao: string;
  /** Frase pronta para a tela. */
  descricao: string;
  alvo?: { tipo: string; id: string };
  /** Mudanças campo a campo (antes → depois) e/ou extras como motivo e valor. */
  detalhes?: { mudancas?: Mudanca[] } & Record<string, unknown>;
  /** Quem fez, quando não há sessão no contexto (login). */
  usuario?: { id: string | null; nome: string };
};

type Ctx = Context<{ Variables: Variaveis }>;

/**
 * IP de quem chamou. Na Vercel vem em x-real-ip (posto pela própria Vercel); atrás de outro proxy
 * (o do Vite, no desenvolvimento) no x-forwarded-for; sem proxy, do socket do servidor Node.
 */
export function ipDe(c: Context): string | null {
  const socket = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming?.socket?.remoteAddress;
  const ip = c.req.header("x-real-ip")?.trim() || c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || socket;
  if (!ip) return null;
  // IPv4 dentro de IPv6 ("::ffff:192.168.0.10") e o "localhost" do IPv6 ficam legíveis.
  if (ip === "::1") return "127.0.0.1";
  return ip.replace(/^::ffff:/, "");
}

function usuarioDaSessao(c: Ctx): { id: string | null; nome: string } {
  const sessao = c.get("sessao") as { user?: { id?: string; name?: string } } | undefined;
  return { id: sessao?.user?.id ?? null, nome: sessao?.user?.name ?? "" };
}

/**
 * Grava um registro de auditoria. Passe a mesma `Consulta` da transação da ação:
 * se a ação falhar (rollback), o registro também não fica.
 */
export async function auditar(q: Consulta, c: Ctx, registro: RegistroAuditoria): Promise<void> {
  const usuario = registro.usuario ?? usuarioDaSessao(c);
  await q(
    "insert into auditoria (usuario_id, usuario, categoria, acao, descricao, alvo_tipo, alvo_id, detalhes, ip) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)",
    [
      usuario.id,
      usuario.nome,
      registro.categoria,
      registro.acao,
      registro.descricao,
      registro.alvo?.tipo ?? null,
      registro.alvo?.id ?? null,
      registro.detalhes ? JSON.stringify(registro.detalhes) : null,
      ipDe(c),
    ],
  );
}

/** Lista os campos que mudaram entre `antes` e `depois` (só os `campos` pedidos, com o rótulo de cada um). */
export function diferencas(antes: Record<string, unknown>, depois: Record<string, unknown>, campos: Record<string, string>): Mudanca[] {
  const normal = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
  return Object.entries(campos)
    .filter(([chave]) => chave in depois && normal(antes[chave]) !== normal(depois[chave]))
    .map(([chave, campo]) => ({ campo, antes: antes[chave] ?? null, depois: depois[chave] ?? null }));
}

/** Centavos em reais, para as frases ("R$ 450,00"). */
export const reais = (centavos: number) => (Number(centavos) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
