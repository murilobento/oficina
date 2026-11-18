import { expect } from "vitest";

import { criarAdministrador } from "./admin";
import { criarApp } from "./app";
import { criarAuth } from "./auth";
import { criarBanco } from "./banco";
import { migrar } from "./migrar";

export const SEGREDO = "segredo-de-teste-com-mais-de-32-caracteres!!";
export const ORIGEM = "http://localhost:5173";
export const SENHA_ADMIN = "senha-provisoria-1";

/** Sobe a API com PGlite em memória e um administrador (admin@oficina.com). */
/**
 * `senhaJaTrocada` (padrão) marca o administrador e os funcionários criados por `funcionario()` como
 * quem já trocou a senha provisória; sem isso a API só deixa a sessão consultar /api/eu.
 */
export async function iniciarAppDeTeste(opcoes: { buscar?: typeof fetch; senhaJaTrocada?: boolean } = {}) {
  const senhaJaTrocada = opcoes.senhaJaTrocada ?? true;
  const banco = await criarBanco(""); // PGlite em memória
  await migrar(banco);
  await criarAdministrador(banco, { email: "admin@oficina.com", nome: "Admin", senha: SENHA_ADMIN, segredo: SEGREDO });
  if (senhaJaTrocada) await banco.consultar(`update "user" set "trocarSenha" = false`);
  const app = criarApp(banco, criarAuth(banco, { segredo: SEGREDO, urlBase: ORIGEM, origensConfiaveis: [ORIGEM] }), { buscar: opcoes.buscar });
  const chamar = (caminho: string, opcoesChamada: { metodo?: string; corpo?: unknown; cookie?: string } = {}) =>
    app.request(caminho, {
      method: opcoesChamada.metodo ?? (opcoesChamada.corpo !== undefined ? "POST" : "GET"),
      headers: { "content-type": "application/json", origin: ORIGEM, ...(opcoesChamada.cookie ? { cookie: opcoesChamada.cookie } : {}) },
      body: opcoesChamada.corpo !== undefined ? JSON.stringify(opcoesChamada.corpo) : undefined,
    });
  const entrar = async (email: string, senha: string): Promise<string> => {
    const resposta = await chamar("/api/auth/sign-in/email", { corpo: { email, password: senha } });
    expect(resposta.status).toBe(200);
    return resposta.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  };
  const adminInicial = await entrar("admin@oficina.com", SENHA_ADMIN);
  /** Cria um funcionário com o perfil e devolve o cookie dele. */
  const funcionario = async (perfil: string): Promise<string> => {
    const email = `${perfil}-${Math.random().toString(36).slice(2, 8)}@oficina.com`;
    const criacao = await chamar("/api/funcionarios", { cookie: adminInicial, corpo: { email, nome: `Func ${perfil}`, perfilId: perfil } });
    expect(criacao.status).toBe(201);
    const cookie = await entrar(email, (await criacao.json()).senhaProvisoria);
    if (senhaJaTrocada) await banco.consultar(`update "user" set "trocarSenha" = false where email = $1`, [email]);
    return cookie;
  };
  return { app, banco, chamar, entrar, admin: adminInicial, funcionario, fechar: () => banco.fechar() };
}
