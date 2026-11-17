import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarAppDeTeste } from "../teste-util";

let ctx: Awaited<ReturnType<typeof iniciarAppDeTeste>>;
let mecanico: string;

beforeAll(async () => {
  ctx = await iniciarAppDeTeste();
  mecanico = await ctx.funcionario("mecanico");
}, 60_000);
afterAll(() => ctx.fechar());

const base = {
  tipo: "PF", documento: "", nome: "Ana Souza", nomeFantasia: "", email: "", telefone: "", celular: "", cep: "", logradouro: "",
  numero: "", complemento: "", bairro: "", cidade: "", uf: "", observacoes: "", situacaoCadastral: "", cnaePrincipal: "", ativo: true, extras: {},
};
const criar = (papel: string, extra: Record<string, unknown> = {}, cookie = ctx.admin) =>
  ctx.chamar(`/api/pessoas?papel=${papel}`, { corpo: { ...base, ...extra }, cookie });

describe("/api/pessoas", () => {
  it("sem sessão → 401", async () => {
    expect((await ctx.chamar("/api/pessoas?papel=cliente")).status).toBe(401);
  });

  it("GET com o banco vazio devolve lista vazia", async () => {
    const r = await ctx.chamar("/api/pessoas?papel=fornecedor", { cookie: ctx.admin });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual([]);
  });

  it("cria cliente e ele aparece só na lista de clientes", async () => {
    const r = await criar("cliente", { nome: "Bruno Lima", celular: "11955550102" });
    expect(r.status).toBe(201);
    const novo = await r.json();
    expect(novo).toMatchObject({ papel: "cliente", nome: "Bruno Lima", ativo: true });
    const clientes = await (await ctx.chamar("/api/pessoas?papel=cliente", { cookie: ctx.admin })).json();
    const fornecedores = await (await ctx.chamar("/api/pessoas?papel=fornecedor", { cookie: ctx.admin })).json();
    expect(clientes.map((p: { id: string }) => p.id)).toContain(novo.id);
    expect(fornecedores.map((p: { id: string }) => p.id)).not.toContain(novo.id);
  });

  it("CPF inválido → 400 com campo documento", async () => {
    const r = await criar("cliente", { documento: "12345678900" });
    expect(r.status).toBe(400);
    expect((await r.json()).campos.documento).toMatch(/CPF/);
  });

  it("CPF repetido no mesmo papel → 409; em outro papel pode", async () => {
    expect((await criar("cliente", { documento: "11144477735", nome: "Ana" })).status).toBe(201);
    const repetido = await criar("cliente", { documento: "111.444.777-35", nome: "Outra Ana" });
    expect(repetido.status).toBe(409);
    expect((await repetido.json()).campos.documento).toMatch(/já está no cadastro de Ana/);
    expect((await criar("fornecedor", { documento: "11144477735", nome: "Forn Ana" })).status).toBe(201);
  });

  it("PUT altera e PATCH alterna ativo", async () => {
    const { id } = await (await criar("cliente", { nome: "Carla Rocha" })).json();
    const put = await ctx.chamar(`/api/pessoas/${id}`, { metodo: "PUT", corpo: { ...base, nome: "Carla R. Rocha" }, cookie: ctx.admin });
    expect(put.status).toBe(200);
    expect((await put.json()).nome).toBe("Carla R. Rocha");
    const patch = await ctx.chamar(`/api/pessoas/${id}/ativo`, { metodo: "PATCH", corpo: { ativo: false }, cookie: ctx.admin });
    expect((await patch.json()).ativo).toBe(false);
  });

  it("DELETE de cliente com veículo → 409 com mensagem", async () => {
    const { id } = await (await criar("cliente", { nome: "Dono do Carro" })).json();
    await ctx.banco.consultar("insert into veiculos (cliente_id, modelo) values ($1, 'Gol')", [id]);
    const r = await ctx.chamar(`/api/pessoas/${id}`, { metodo: "DELETE", cookie: ctx.admin });
    expect(r.status).toBe(409);
    expect((await r.json()).erro).toMatch(/tem veículos/);
  });

  it("excluir fornecedor ligado a produto → 204 e o produto fica sem fornecedor", async () => {
    const { id } = await (await criar("fornecedor", { nome: "Autopeças X" })).json();
    const [p] = await ctx.banco.consultar<{ id: string }>("insert into produtos (codigo, descricao, fornecedor_id) values ('T-1', 'Filtro', $1) returning id", [id]);
    expect((await ctx.chamar(`/api/pessoas/${id}`, { metodo: "DELETE", cookie: ctx.admin })).status).toBe(204);
    const [depois] = await ctx.banco.consultar<{ fornecedor_id: string | null }>("select fornecedor_id from produtos where id = $1", [p.id]);
    expect(depois.fornecedor_id).toBeNull();
  });

  it("mecânico (sem clientes.editar) lê mas não grava", async () => {
    expect((await ctx.chamar("/api/pessoas?papel=cliente", { cookie: mecanico })).status).toBe(200);
    expect((await criar("cliente", {}, mecanico)).status).toBe(403);
  });
});
