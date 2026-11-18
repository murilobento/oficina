import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarAppDeTeste } from "../teste-util";

let ctx: Awaited<ReturnType<typeof iniciarAppDeTeste>>;
beforeAll(async () => {
  ctx = await iniciarAppDeTeste();
}, 60_000);
afterAll(async () => ctx.fechar());

const json = async (r: Response) => r.json();

describe("perfis", () => {
  it("lista os perfis iniciais com a contagem de funcionários", async () => {
    const lista = await json(await ctx.chamar("/api/perfis", { cookie: ctx.admin }));
    expect(lista.map((p: { id: string }) => p.id)).toEqual(expect.arrayContaining(["administrador", "gerencia", "recepcao", "mecanico"]));
    const admin = lista.find((p: { id: string }) => p.id === "administrador");
    expect(admin).toMatchObject({ protegido: true, funcionarios: 1 });
    expect(admin.permissoes).toContain("perfis.gerenciar");
  });

  it("cria perfil sem dar perfis.gerenciar sozinho e recusa nome repetido e permissão inexistente", async () => {
    const criado = await ctx.chamar("/api/perfis", { cookie: ctx.admin, corpo: { nome: "Lanternagem", descricao: "Funilaria", permissoes: ["ordens.ver"] } });
    expect(criado.status).toBe(201);
    const perfil = await json(criado);
    expect(perfil).toMatchObject({ nome: "Lanternagem", protegido: false, permissoes: ["ordens.ver"], funcionarios: 0 });

    const repetido = await ctx.chamar("/api/perfis", { cookie: ctx.admin, corpo: { nome: "  lanternagem ", descricao: "", permissoes: [] } });
    expect(repetido.status).toBe(409);
    expect((await json(repetido)).campos.nome).toBeTruthy();

    const invalida = await ctx.chamar("/api/perfis", { cookie: ctx.admin, corpo: { nome: "Outro", descricao: "", permissoes: ["voar.alto"] } });
    expect(invalida.status).toBe(400);
  });

  it("editar vale na hora para quem tem o perfil", async () => {
    const cookie = await ctx.funcionario("mecanico");
    expect((await json(await ctx.chamar("/api/eu", { cookie }))).permissoes).not.toContain("clientes.editar");
    const r = await ctx.chamar("/api/perfis/mecanico", { cookie: ctx.admin, metodo: "PUT", corpo: { nome: "Mecânico", descricao: "x", permissoes: ["clientes.ver", "clientes.editar"] } });
    expect(r.status).toBe(200);
    expect((await json(await ctx.chamar("/api/eu", { cookie }))).permissoes).toEqual(["clientes.editar", "clientes.ver"]);
  });

  it("o perfil protegido não pode ser alterado nem excluído", async () => {
    const put = await ctx.chamar("/api/perfis/administrador", { cookie: ctx.admin, metodo: "PUT", corpo: { nome: "Chefe", descricao: "", permissoes: [] } });
    expect(put.status).toBe(403);
    expect((await ctx.chamar("/api/perfis/administrador", { cookie: ctx.admin, metodo: "DELETE" })).status).toBe(403);
  });

  it("perfil com funcionários não é excluído; sem funcionários é", async () => {
    await ctx.funcionario("recepcao");
    const emUso = await ctx.chamar("/api/perfis/recepcao", { cookie: ctx.admin, metodo: "DELETE" });
    expect(emUso.status).toBe(409);
    const novo = await json(await ctx.chamar("/api/perfis", { cookie: ctx.admin, corpo: { nome: "Temporário", descricao: "", permissoes: [] } }));
    expect((await ctx.chamar(`/api/perfis/${novo.id}`, { cookie: ctx.admin, metodo: "DELETE" })).status).toBe(204);
    expect((await ctx.chamar(`/api/perfis/${novo.id}`, { cookie: ctx.admin, metodo: "DELETE" })).status).toBe(404);
  });

  it("sem permissão não altera; quem só gerencia funcionários pode listar", async () => {
    const mecanico = await ctx.funcionario("mecanico");
    expect((await ctx.chamar("/api/perfis", { cookie: mecanico })).status).toBe(403);
    expect((await ctx.chamar("/api/perfis", { cookie: mecanico, corpo: { nome: "X", descricao: "", permissoes: [] } })).status).toBe(403);
    const gerencia = await ctx.funcionario("gerencia"); // tem funcionarios.gerenciar, não perfis.gerenciar
    expect((await ctx.chamar("/api/perfis", { cookie: gerencia })).status).toBe(200);
    expect((await ctx.chamar("/api/perfis", { cookie: gerencia, corpo: { nome: "Y", descricao: "", permissoes: [] } })).status).toBe(403);
  });
});
