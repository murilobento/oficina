import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";

import type { Permissao } from "../src/features/auth/permissoes";

import type { Auth } from "./auth";
import type { Banco } from "./banco";
import { permissoesDoPerfil } from "./perfis";
import { registrarRotasCompras } from "./rotas/compras";
import { registrarRotasEmpresa } from "./rotas/empresa";
import { registrarRotasEstoque } from "./rotas/estoque";
import { registrarRotasFipe } from "./rotas/fipe";
import { registrarRotasOrcamentos } from "./rotas/orcamentos";
import { registrarRotasPessoas } from "./rotas/pessoas";
import { registrarRotasProdutos } from "./rotas/produtos";
import { registrarRotasServicos } from "./rotas/servicos";
import { registrarRotasVeiculos } from "./rotas/veiculos";
import { registrarRotasVendas } from "./rotas/vendas";
import { ErroApi } from "./rotas/util";

type Sessao = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
type Variaveis = { sessao: Sessao; permissoes: Permissao[] };

/**
 * API da oficina (Hono). Roda como função da Vercel (api/index.ts) ou como servidor Node local
 * (server/dev.ts). O Better Auth responde em /api/auth/*; o restante exige sessão.
 */
export function criarApp(banco: Banco, auth: Auth, opcoes: { buscar?: typeof fetch } = {}) {
  const app = new Hono<{ Variables: Variaveis }>().basePath("/api");

  app.get("/saude", async (c) => {
    await banco.consultar("select 1");
    return c.json({ ok: true });
  });

  // Troca de senha pelo próprio funcionário encerra a "senha provisória"; redefinição feita pelo
  // administrador a reativa. O Better Auth cuida da senha; aqui só mantemos esse sinalizador.
  app.on(["GET", "POST"], "/auth/*", async (c) => {
    const rota = new URL(c.req.url).pathname;
    let aposSucesso: (() => Promise<void>) | null = null;

    if (c.req.method === "POST" && rota.endsWith("/change-password")) {
      const sessao = await auth.api.getSession({ headers: c.req.raw.headers });
      if (sessao) aposSucesso = async () => void (await banco.consultar(`update "user" set "trocarSenha" = false where id = $1`, [sessao.user.id]));
    } else if (c.req.method === "POST" && rota.endsWith("/admin/set-user-password")) {
      const corpo = (await c.req.raw.clone().json().catch(() => null)) as { userId?: string } | null;
      if (corpo?.userId) aposSucesso = async () => void (await banco.consultar(`update "user" set "trocarSenha" = true where id = $1`, [corpo.userId]));
    }

    const resposta = await auth.handler(c.req.raw);
    if (resposta.ok && aposSucesso) await aposSucesso();
    return resposta;
  });

  const exigirSessao: MiddlewareHandler<{ Variables: Variaveis }> = async (c, proximo) => {
    const sessao = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!sessao) return c.json({ erro: "Entre no sistema para continuar." }, 401);
    c.set("sessao", sessao);
    c.set("permissoes", await permissoesDoPerfil(banco, (sessao.user as { role?: string }).role ?? ""));
    await proximo();
  };

  /** Para as rotas de dados que virão: `app.get("/clientes", exigirPermissao("clientes.ver"), ...)`. */
  const exigirPermissao =
    (permissao: Permissao): MiddlewareHandler<{ Variables: Variaveis }> =>
    async (c, proximo) => {
      if (!c.get("permissoes").includes(permissao)) return c.json({ erro: "Sem permissão para esta ação." }, 403);
      await proximo();
    };

  app.get("/eu", exigirSessao, (c) => {
    const { user } = c.get("sessao");
    const dados = user as typeof user & { role?: string; trocarSenha?: boolean };
    return c.json({
      id: dados.id,
      nome: dados.name,
      email: dados.email,
      perfil: dados.role ?? "",
      trocarSenha: dados.trocarSenha ?? false,
      permissoes: c.get("permissoes"),
    });
  });

  const contexto = { app, banco, exigirSessao, exigirPermissao } as unknown as Parameters<typeof registrarRotasEmpresa>[0];
  registrarRotasEmpresa(contexto);
  registrarRotasPessoas(contexto);
  registrarRotasProdutos(contexto);
  registrarRotasServicos(contexto);
  registrarRotasVeiculos(contexto);
  registrarRotasCompras(contexto);
  registrarRotasEstoque(contexto);
  registrarRotasOrcamentos(contexto);
  registrarRotasVendas(contexto);
  registrarRotasFipe(contexto, opcoes.buscar);

  app.notFound((c) => c.json({ erro: "Rota não encontrada." }, 404));
  app.onError((erro, c) => {
    if (erro instanceof ErroApi) return c.json({ erro: erro.message, campos: erro.campos }, erro.status);
    console.error(erro);
    return c.json({ erro: "Erro interno." }, 500);
  });

  return Object.assign(app, { exigirSessao, exigirPermissao });
}
