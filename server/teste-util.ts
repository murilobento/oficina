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
export async function iniciarAppDeTeste(opcoes: { buscar?: typeof fetch } = {}) {
  const banco = await criarBanco(""); // PGlite em memória
  await migrar(banco);
  await criarAdministrador(banco, { email: "admin@oficina.com", nome: "Admin", senha: SENHA_ADMIN, segredo: SEGREDO });
  const app = criarApp(banco, criarAuth(banco, { segredo: SEGREDO, urlBase: ORIGEM, origensConfiaveis: [ORIGEM] }), opcoes);
  const chamar = (caminho: string, opcoes: { metodo?: string; corpo?: unknown; cookie?: string } = {}) =>
    app.request(caminho, {
      method: opcoes.metodo ?? (opcoes.corpo !== undefined ? "POST" : "GET"),
      headers: { "content-type": "application/json", origin: ORIGEM, ...(opcoes.cookie ? { cookie: opcoes.cookie } : {}) },
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
    });
  const entrar = async (email: string, senha: string): Promise<string> => {
    const resposta = await chamar("/api/auth/sign-in/email", { corpo: { email, password: senha } });
    expect(resposta.status).toBe(200);
    return resposta.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  };
  const admin = await entrar("admin@oficina.com", SENHA_ADMIN);
  /** Cria um funcionário com o perfil e devolve o cookie dele. */
  const funcionario = async (perfil: string): Promise<string> => {
    const email = `${perfil}-${Math.random().toString(36).slice(2, 8)}@oficina.com`;
    const criacao = await chamar("/api/auth/admin/create-user", { cookie: admin, corpo: { email, name: perfil, password: "provisoria-12345", role: perfil } });
    expect(criacao.status).toBe(200);
    return entrar(email, "provisoria-12345");
  };
  return { app, banco, chamar, entrar, admin, funcionario, fechar: () => banco.fechar() };
}
