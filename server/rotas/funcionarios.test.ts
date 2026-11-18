import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarAppDeTeste, SENHA_ADMIN } from "../teste-util";

let ctx: Awaited<ReturnType<typeof iniciarAppDeTeste>>;
beforeAll(async () => {
  ctx = await iniciarAppDeTeste();
}, 60_000);
afterAll(async () => ctx.fechar());

const json = async (r: Response) => r.json();
const criar = (email: string, perfilId = "mecanico", cookie = ctx.admin) => ctx.chamar("/api/funcionarios", { cookie, corpo: { nome: "Fulano de Tal", email, perfilId } });
const idDe = async (email: string) => (await ctx.banco.consultar<{ id: string }>(`select id from "user" where email = $1`, [email]))[0].id;

describe("funcionários", () => {
  it("cria com senha provisória gerada no servidor; a pessoa entra e precisa trocar a senha", async () => {
    const r = await criar("Joao@Oficina.com");
    expect(r.status).toBe(201);
    const { funcionario, senhaProvisoria } = await json(r);
    expect(senhaProvisoria).toHaveLength(14);
    expect(funcionario).toMatchObject({ nome: "Fulano de Tal", email: "joao@oficina.com", perfilId: "mecanico", ativo: true, trocarSenha: true });
    const cookie = await ctx.entrar("joao@oficina.com", senhaProvisoria);
    expect(await json(await ctx.chamar("/api/eu", { cookie }))).toMatchObject({ perfil: "mecanico", trocarSenha: true });
  });

  it("recusa e-mail repetido (sem diferenciar maiúsculas), e-mail inválido e perfil inexistente", async () => {
    const repetido = await criar("JOAO@oficina.com");
    expect(repetido.status).toBe(409);
    expect((await json(repetido)).campos.email).toBeTruthy();
    expect((await criar("nao-e-email")).status).toBe(400);
    const semPerfil = await criar("x@oficina.com", "inexistente");
    expect(semPerfil.status).toBe(400);
    expect((await json(semPerfil)).campos.perfilId).toBeTruthy();
  });

  it("lista com status e último acesso", async () => {
    const lista = await json(await ctx.chamar("/api/funcionarios", { cookie: ctx.admin }));
    const joao = lista.find((f: { email: string }) => f.email === "joao@oficina.com");
    expect(joao).toMatchObject({ ativo: true, trocarSenha: true, ultimoAcesso: expect.any(String) });
    expect(lista.find((f: { email: string }) => f.email === "admin@oficina.com").perfilId).toBe("administrador");
  });

  it("edita nome, e-mail e perfil", async () => {
    const id = await idDe("joao@oficina.com");
    const r = await ctx.chamar(`/api/funcionarios/${id}`, { cookie: ctx.admin, metodo: "PUT", corpo: { nome: "João da Silva", email: "joao.silva@oficina.com", perfilId: "recepcao" } });
    expect(r.status).toBe(200);
    expect(await json(r)).toMatchObject({ nome: "João da Silva", email: "joao.silva@oficina.com", perfilId: "recepcao" });
    const outro = await criar("maria@oficina.com");
    expect(outro.status).toBe(201);
    const conflito = await ctx.chamar(`/api/funcionarios/${id}`, { cookie: ctx.admin, metodo: "PUT", corpo: { nome: "João", email: "maria@oficina.com", perfilId: "recepcao" } });
    expect(conflito.status).toBe(409);
  });

  it("ninguém desativa nem rebaixa a si mesmo; o último administrador ativo é protegido", async () => {
    const adminId = await idDe("admin@oficina.com");
    const desativar = await ctx.chamar(`/api/funcionarios/${adminId}/ativo`, { cookie: ctx.admin, metodo: "PATCH", corpo: { ativo: false } });
    expect(desativar.status).toBe(409);
    const rebaixar = await ctx.chamar(`/api/funcionarios/${adminId}`, { cookie: ctx.admin, metodo: "PUT", corpo: { nome: "Admin", email: "admin@oficina.com", perfilId: "gerencia" } });
    expect(rebaixar.status).toBe(409);
    const reset = await ctx.chamar(`/api/funcionarios/${adminId}/redefinir-senha`, { cookie: ctx.admin, corpo: {} });
    expect(reset.status).toBe(409);
  });

  it("um segundo administrador pode ser rebaixado por outro; o último continua protegido", async () => {
    const r = await criar("chefe@oficina.com", "administrador");
    const { senhaProvisoria } = await json(r);
    const provisoria = await ctx.entrar("chefe@oficina.com", senhaProvisoria);
    expect((await ctx.chamar("/api/funcionarios", { cookie: provisoria })).status).toBe(403); // ainda não trocou a senha
    await ctx.chamar("/api/auth/change-password", { cookie: provisoria, corpo: { currentPassword: senhaProvisoria, newPassword: "chefe-senha-definitiva-1" } });
    const chefe = await ctx.entrar("chefe@oficina.com", "chefe-senha-definitiva-1");
    const adminId = await idDe("admin@oficina.com");
    const chefeId = await idDe("chefe@oficina.com");
    const rebaixa = await ctx.chamar(`/api/funcionarios/${adminId}`, { cookie: chefe, metodo: "PUT", corpo: { nome: "Admin", email: "admin@oficina.com", perfilId: "gerencia" } });
    expect(rebaixa.status).toBe(200);
    // agora o chefe é o único administrador ativo: ninguém (nem ele) o tira
    const tenta = await ctx.chamar(`/api/funcionarios/${chefeId}/ativo`, { cookie: chefe, metodo: "PATCH", corpo: { ativo: false } });
    expect(tenta.status).toBe(409);
    // devolve o perfil ao admin para os próximos testes
    await ctx.chamar(`/api/funcionarios/${adminId}`, { cookie: chefe, metodo: "PUT", corpo: { nome: "Admin", email: "admin@oficina.com", perfilId: "administrador" } });
    ctx.admin = await ctx.entrar("admin@oficina.com", SENHA_ADMIN);
  });

  it("desativar encerra a sessão na hora e impede novo login; reativar volta", async () => {
    const { senhaProvisoria } = await json(await criar("ana@oficina.com"));
    const cookie = await ctx.entrar("ana@oficina.com", senhaProvisoria);
    const id = await idDe("ana@oficina.com");
    const r = await ctx.chamar(`/api/funcionarios/${id}/ativo`, { cookie: ctx.admin, metodo: "PATCH", corpo: { ativo: false } });
    expect(r.status).toBe(200);
    expect((await json(r)).ativo).toBe(false);
    expect((await ctx.chamar("/api/eu", { cookie })).status).toBe(401);
    expect((await ctx.chamar("/api/auth/sign-in/email", { corpo: { email: "ana@oficina.com", password: senhaProvisoria } })).ok).toBe(false);
    const volta = await ctx.chamar(`/api/funcionarios/${id}/ativo`, { cookie: ctx.admin, metodo: "PATCH", corpo: { ativo: true } });
    expect((await json(volta)).ativo).toBe(true);
    await ctx.entrar("ana@oficina.com", senhaProvisoria);
  });

  it("redefinir senha invalida a antiga, derruba sessões e volta a exigir a troca", async () => {
    const { senhaProvisoria } = await json(await criar("rui@oficina.com"));
    const cookie = await ctx.entrar("rui@oficina.com", senhaProvisoria);
    await ctx.chamar("/api/auth/change-password", { cookie, corpo: { currentPassword: senhaProvisoria, newPassword: "rui-trocou-a-senha-1" } });
    const id = await idDe("rui@oficina.com");
    const r = await ctx.chamar(`/api/funcionarios/${id}/redefinir-senha`, { cookie: ctx.admin, corpo: {} });
    expect(r.status).toBe(200);
    const { senhaProvisoria: nova } = await json(r);
    expect(nova).toHaveLength(14);
    expect((await ctx.chamar("/api/auth/sign-in/email", { corpo: { email: "rui@oficina.com", password: "rui-trocou-a-senha-1" } })).ok).toBe(false);
    const novo = await ctx.entrar("rui@oficina.com", nova);
    expect((await json(await ctx.chamar("/api/eu", { cookie: novo }))).trocarSenha).toBe(true);
    expect((await ctx.chamar("/api/eu", { cookie })).status).toBe(401);
  });

  it("não redefine a senha de quem está desativado", async () => {
    const id = await idDe("ana@oficina.com");
    await ctx.chamar(`/api/funcionarios/${id}/ativo`, { cookie: ctx.admin, metodo: "PATCH", corpo: { ativo: false } });
    expect((await ctx.chamar(`/api/funcionarios/${id}/redefinir-senha`, { cookie: ctx.admin, corpo: {} })).status).toBe(409);
    await ctx.chamar(`/api/funcionarios/${id}/ativo`, { cookie: ctx.admin, metodo: "PATCH", corpo: { ativo: true } });
  });

  it("quem não é administrador não mexe em administradores nem cria um", async () => {
    const gerencia = await ctx.funcionario("gerencia");
    expect((await criar("novo-admin@oficina.com", "administrador", gerencia)).status).toBe(403);
    const adminId = await idDe("admin@oficina.com");
    expect((await ctx.chamar(`/api/funcionarios/${adminId}/redefinir-senha`, { cookie: gerencia, corpo: {} })).status).toBe(403);
    expect((await ctx.chamar(`/api/funcionarios/${adminId}/ativo`, { cookie: gerencia, metodo: "PATCH", corpo: { ativo: false } })).status).toBe(403);
    const comum = await criar("comum@oficina.com", "mecanico", gerencia);
    expect(comum.status).toBe(201);
  });

  it("sem funcionarios.gerenciar é 403; id inexistente é 404", async () => {
    const mecanico = await ctx.funcionario("mecanico");
    expect((await ctx.chamar("/api/funcionarios", { cookie: mecanico })).status).toBe(403);
    expect((await ctx.chamar("/api/funcionarios/00000000-0000-4000-8000-000000000000/ativo", { cookie: ctx.admin, metodo: "PATCH", corpo: { ativo: false } })).status).toBe(404);
    expect((await ctx.chamar("/api/funcionarios")).status).toBe(401);
  });

  it("quem só tem funcionarios.gerenciar não vira dono dos perfis: não atribui nem mexe em perfis com permissões a mais", async () => {
    const supervisor = await json(await ctx.chamar("/api/perfis", { cookie: ctx.admin, corpo: { nome: "Supervisor", descricao: "", permissoes: ["perfis.gerenciar"] } }));
    const gerencia = await ctx.funcionario("gerencia");
    const laranja = await criar("laranja@oficina.com", supervisor.id, gerencia);
    expect(laranja.status).toBe(403);
    // o administrador cria; a gerência não consegue redefinir nem desativar esse funcionário
    const { funcionario } = await json(await criar("sup@oficina.com", supervisor.id));
    expect((await ctx.chamar(`/api/funcionarios/${funcionario.id}/redefinir-senha`, { cookie: gerencia, corpo: {} })).status).toBe(403);
    expect((await ctx.chamar(`/api/funcionarios/${funcionario.id}/ativo`, { cookie: gerencia, metodo: "PATCH", corpo: { ativo: false } })).status).toBe(403);
    // e quem tem perfis.gerenciar só concede o que já tem
    const sup = await ctx.entrar("sup@oficina.com", (await json(await ctx.chamar(`/api/funcionarios/${funcionario.id}/redefinir-senha`, { cookie: ctx.admin, corpo: {} }))).senhaProvisoria);
    await ctx.banco.consultar(`update "user" set "trocarSenha" = false where id = $1`, [funcionario.id]);
    const tenta = await ctx.chamar("/api/perfis/gerencia", { cookie: sup, metodo: "PUT", corpo: { nome: "Gerência", descricao: "", permissoes: ["perfis.gerenciar", "vendas.editar"] } });
    expect(tenta.status).toBe(403);
  });

  it("enquanto a senha provisória não é trocada, a API só responde /api/eu", async () => {
    const { senhaProvisoria } = await json(await criar("provisorio@oficina.com", "gerencia"));
    const cookie = await ctx.entrar("provisorio@oficina.com", senhaProvisoria);
    expect((await ctx.chamar("/api/eu", { cookie })).status).toBe(200);
    expect((await ctx.chamar("/api/funcionarios", { cookie })).status).toBe(403);
    expect((await ctx.chamar("/api/perfis", { cookie })).status).toBe(403);
  });

  it("aceita e-mail com espaços e maiúsculas nas pontas", async () => {
    const r = await criar("  Espaco@Oficina.com ");
    expect(r.status).toBe(201);
    expect((await json(r)).funcionario.email).toBe("espaco@oficina.com");
  });

  it("as rotas admin do plugin deixam de existir", async () => {
    const r = await ctx.chamar("/api/auth/admin/create-user", { cookie: ctx.admin, corpo: { email: "z@z.com", name: "Z", password: "12345678", role: "administrador" } });
    expect(r.status).toBe(404);
  });
});
