import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { criarAdministrador } from "./admin";
import { criarApp } from "./app";
import { criarAuth } from "./auth";
import { type Banco, criarBanco } from "./banco";
import { migrar } from "./migrar";

const SEGREDO = "segredo-de-teste-com-mais-de-32-caracteres!!";
const ORIGEM = "http://localhost:5173";

let banco: Banco;
let app: ReturnType<typeof criarApp>;

beforeAll(async () => {
  banco = await criarBanco(""); // PGlite em memória
  await migrar(banco);
  await criarAdministrador(banco, { email: "Admin@Oficina.com", nome: "Admin", senha: "senha-provisoria-1", segredo: SEGREDO });
  app = criarApp(banco, criarAuth(banco, { segredo: SEGREDO, urlBase: ORIGEM, origensConfiaveis: [ORIGEM] }));
}, 60_000);

afterAll(async () => {
  await banco.fechar();
});

async function chamar(caminho: string, opcoes: { metodo?: string; corpo?: unknown; cookie?: string } = {}) {
  return app.request(caminho, {
    method: opcoes.metodo ?? (opcoes.corpo ? "POST" : "GET"),
    headers: { "content-type": "application/json", origin: ORIGEM, ...(opcoes.cookie ? { cookie: opcoes.cookie } : {}) },
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
  });
}

async function entrar(email: string, senha: string): Promise<string> {
  const resposta = await chamar("/api/auth/sign-in/email", { corpo: { email, password: senha } });
  expect(resposta.status).toBe(200);
  return resposta.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

describe("banco", () => {
  it("cria as tabelas do domínio e as do Better Auth", async () => {
    const tabelas = (await banco.consultar<{ table_name: string }>(`select table_name from information_schema.tables where table_schema = 'public'`)).map((t) => t.table_name);
    for (const esperada of ["user", "session", "account", "pessoas", "produtos", "orcamentos", "vendas", "compras", "movimentos_estoque", "acertos", "perfis", "empresa"]) {
      expect(tabelas).toContain(esperada);
    }
  });

  it("migrar de novo não repete nada e semeia os perfis", async () => {
    expect((await migrar(banco)).aplicadas).toEqual([]);
    const perfis = (await banco.consultar<{ id: string }>("select id from perfis")).map((p) => p.id);
    expect(perfis).toEqual(expect.arrayContaining(["administrador", "gerencia", "recepcao", "mecanico"]));
  });

  it("numera os documentos em sequência (ORC-0001...)", async () => {
    const [cliente] = await banco.consultar<{ id: string }>(`insert into pessoas (papel, tipo, nome) values ('cliente', 'PF', 'Ana') returning id`);
    const [veiculo] = await banco.consultar<{ id: string }>(`insert into veiculos (cliente_id, modelo) values ($1, 'HB20') returning id`, [cliente.id]);
    const a = await banco.consultar<{ numero: string }>(`insert into orcamentos (cliente_id, veiculo_id) values ($1, $2) returning numero`, [cliente.id, veiculo.id]);
    const b = await banco.consultar<{ numero: string }>(`insert into orcamentos (cliente_id, veiculo_id) values ($1, $2) returning numero`, [cliente.id, veiculo.id]);
    expect([a[0].numero, b[0].numero]).toEqual(["ORC-0001", "ORC-0002"]);
  });
});

describe("login", () => {
  it("a API responde e exige sessão nas rotas de dados", async () => {
    expect((await chamar("/api/saude")).status).toBe(200);
    expect((await chamar("/api/eu")).status).toBe(401);
  });

  it("não deixa cadastrar por conta própria", async () => {
    const resposta = await chamar("/api/auth/sign-up/email", { corpo: { name: "X", email: "x@x.com", password: "12345678" } });
    expect(resposta.ok).toBe(false);
  });

  it("recusa senha errada", async () => {
    const resposta = await chamar("/api/auth/sign-in/email", { corpo: { email: "admin@oficina.com", password: "errada-errada" } });
    expect(resposta.status).toBe(401);
  });

  it("administrador entra (e-mail sem diferenciar maiúsculas) e recebe todas as permissões", async () => {
    const cookie = await entrar("ADMIN@oficina.com", "senha-provisoria-1");
    const eu = await (await chamar("/api/eu", { cookie })).json();
    expect(eu).toMatchObject({ email: "admin@oficina.com", perfil: "administrador", trocarSenha: true });
    expect(eu.permissoes).toEqual(expect.arrayContaining(["perfis.gerenciar", "vendas.editar", "empresa.gerenciar"]));
  });

  it("trocar a senha encerra a senha provisória", async () => {
    const cookie = await entrar("admin@oficina.com", "senha-provisoria-1");
    const troca = await chamar("/api/auth/change-password", { cookie, corpo: { currentPassword: "senha-provisoria-1", newPassword: "senha-nova-segura-2" } });
    expect(troca.status).toBe(200);
    const novo = await entrar("admin@oficina.com", "senha-nova-segura-2");
    expect((await (await chamar("/api/eu", { cookie: novo })).json()).trocarSenha).toBe(false);
  });

  it("sair invalida a sessão", async () => {
    const cookie = await entrar("admin@oficina.com", "senha-nova-segura-2");
    expect((await chamar("/api/auth/sign-out", { cookie, corpo: {} })).status).toBe(200);
    expect((await chamar("/api/eu", { cookie })).status).toBe(401);
  });
});

describe("funcionários", () => {
  it("administrador cria funcionário com perfil; ele recebe só as permissões do perfil e não administra", async () => {
    const admin = await entrar("admin@oficina.com", "senha-nova-segura-2");
    const criacao = await chamar("/api/auth/admin/create-user", {
      cookie: admin,
      corpo: { email: "joao@oficina.com", name: "João", password: "provisoria-joao-1", role: "mecanico" },
    });
    expect(criacao.status).toBe(200);

    const cookie = await entrar("joao@oficina.com", "provisoria-joao-1");
    const eu = await (await chamar("/api/eu", { cookie })).json();
    expect(eu).toMatchObject({ perfil: "mecanico", trocarSenha: true });
    expect(eu.permissoes).toContain("ordens.editar");
    expect(eu.permissoes).not.toContain("perfis.gerenciar");

    const tentativa = await chamar("/api/auth/admin/create-user", {
      cookie,
      corpo: { email: "outro@oficina.com", name: "Outro", password: "12345678-abc", role: "administrador" },
    });
    expect(tentativa.ok).toBe(false);
  });

  it("redefinição pelo administrador volta a exigir a troca de senha", async () => {
    const admin = await entrar("admin@oficina.com", "senha-nova-segura-2");
    const [joao] = await banco.consultar<{ id: string }>(`select id from "user" where email = 'joao@oficina.com'`);
    const cookie = await entrar("joao@oficina.com", "provisoria-joao-1");
    await chamar("/api/auth/change-password", { cookie, corpo: { currentPassword: "provisoria-joao-1", newPassword: "joao-trocou-a-senha" } });
    const reset = await chamar("/api/auth/admin/set-user-password", { cookie: admin, corpo: { userId: joao.id, newPassword: "nova-provisoria-3" } });
    expect(reset.status).toBe(200);
    const novo = await entrar("joao@oficina.com", "nova-provisoria-3");
    expect((await (await chamar("/api/eu", { cookie: novo })).json()).trocarSenha).toBe(true);
  });

  it("funcionário banido não entra", async () => {
    const admin = await entrar("admin@oficina.com", "senha-nova-segura-2");
    const [joao] = await banco.consultar<{ id: string }>(`select id from "user" where email = 'joao@oficina.com'`);
    expect((await chamar("/api/auth/admin/ban-user", { cookie: admin, corpo: { userId: joao.id } })).status).toBe(200);
    const resposta = await chamar("/api/auth/sign-in/email", { corpo: { email: "joao@oficina.com", password: "nova-provisoria-3" } });
    expect(resposta.ok).toBe(false);
  });
});
