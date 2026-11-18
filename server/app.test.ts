import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Banco } from "./banco";
import { migrar } from "./migrar";
import { iniciarAppDeTeste } from "./teste-util";

let banco: Banco;
let chamar: Awaited<ReturnType<typeof iniciarAppDeTeste>>["chamar"];
let entrar: Awaited<ReturnType<typeof iniciarAppDeTeste>>["entrar"];
let fechar: () => Promise<void>;

beforeAll(async () => {
  const ctx = await iniciarAppDeTeste({ senhaJaTrocada: false });
  ({ banco, chamar, entrar, fechar } = ctx);
}, 60_000);

afterAll(async () => {
  await fechar();
});

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

describe("funcionários e a senha provisória", () => {
  it("o funcionário criado recebe só as permissões do perfil e não administra", async () => {
    const admin = await entrar("admin@oficina.com", "senha-nova-segura-2");
    const criacao = await chamar("/api/funcionarios", { cookie: admin, corpo: { email: "joao@oficina.com", nome: "João da Silva", perfilId: "mecanico" } });
    expect(criacao.status).toBe(201);
    const { senhaProvisoria } = await criacao.json();

    const cookie = await entrar("joao@oficina.com", senhaProvisoria);
    const eu = await (await chamar("/api/eu", { cookie })).json();
    expect(eu).toMatchObject({ perfil: "mecanico", trocarSenha: true });
    expect(eu.permissoes).toContain("ordens.editar");
    expect(eu.permissoes).not.toContain("perfis.gerenciar");

    const tentativa = await chamar("/api/funcionarios", { cookie, corpo: { email: "outro@oficina.com", nome: "Outro Nome", perfilId: "administrador" } });
    expect(tentativa.status).toBe(403);
  });

  it("trocar a senha encerra a senha provisória do funcionário", async () => {
    const admin = await entrar("admin@oficina.com", "senha-nova-segura-2");
    const [joao] = await banco.consultar<{ id: string }>(`select id from "user" where email = 'joao@oficina.com'`);
    const { senhaProvisoria } = await (await chamar(`/api/funcionarios/${joao.id}/redefinir-senha`, { cookie: admin, corpo: {} })).json();
    const cookie = await entrar("joao@oficina.com", senhaProvisoria);
    await chamar("/api/auth/change-password", { cookie, corpo: { currentPassword: senhaProvisoria, newPassword: "joao-trocou-a-senha" } });
    const novo = await entrar("joao@oficina.com", "joao-trocou-a-senha");
    expect((await (await chamar("/api/eu", { cookie: novo })).json()).trocarSenha).toBe(false);
  });
});
