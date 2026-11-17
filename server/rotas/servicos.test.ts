import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarAppDeTeste } from "../teste-util";

let ctx: Awaited<ReturnType<typeof iniciarAppDeTeste>>;
let mecanico: string;
let recepcao: string;

beforeAll(async () => {
  ctx = await iniciarAppDeTeste();
  mecanico = await ctx.funcionario("mecanico");
  recepcao = await ctx.funcionario("recepcao");
}, 60_000);
afterAll(() => ctx.fechar());

const base = { codigo: "", descricao: "Troca de óleo", categoria: "revisao", valor: 8000, tempoHoras: 1.5, garantiaDias: 90, garantiaKm: 0, observacoes: "", ativo: true };
const criar = (extra: Record<string, unknown> = {}, cookie = ctx.admin) => ctx.chamar("/api/servicos", { corpo: { ...base, ...extra }, cookie });

describe("/api/servicos", () => {
  it("cria com código automático SRV-001 e devolve tempo como número", async () => {
    const r = await criar();
    expect(r.status).toBe(201);
    expect(await r.json()).toMatchObject({ codigo: "SRV-001", tempoHoras: 1.5, valor: 8000 });
  });

  it("valor oculto para quem não tem valores.ver", async () => {
    const { id } = await (await criar({ descricao: "Alinhamento", valor: 12000 })).json();
    const lista = await (await ctx.chamar("/api/servicos", { cookie: mecanico })).json();
    expect(lista.find((s: { id: string }) => s.id === id).valor).toBe(0);
    const comValores = await (await ctx.chamar("/api/servicos", { cookie: recepcao })).json();
    expect(comValores.find((s: { id: string }) => s.id === id).valor).toBe(12000);
  });

  it("garantia negativa → 400 com campo garantiaDias", async () => {
    const r = await criar({ garantiaDias: -1 });
    expect(r.status).toBe(400);
    expect((await r.json()).campos.garantiaDias).toBeDefined();
  });

  it("mecânico sem servicos.editar → 403 no POST e 200 no GET", async () => {
    expect((await criar({}, mecanico)).status).toBe(403);
    expect((await ctx.chamar("/api/servicos", { cookie: mecanico })).status).toBe(200);
  });

  it("código repetido → 409; PATCH ativo e DELETE funcionam", async () => {
    expect((await criar({ codigo: "SRV-001" })).status).toBe(409);
    const { id } = await (await criar({ descricao: "Scanner" })).json();
    expect((await (await ctx.chamar(`/api/servicos/${id}/ativo`, { metodo: "PATCH", corpo: { ativo: false }, cookie: ctx.admin })).json()).ativo).toBe(false);
    expect((await ctx.chamar(`/api/servicos/${id}`, { metodo: "DELETE", cookie: ctx.admin })).status).toBe(204);
  });
});

describe("código automático em volume", () => {
  it("passa de SRV-999 para SRV-1000 sem travar", async () => {
    await ctx.banco.consultar("select setval('servico_codigo_seq', 999)");
    const r = await criar({ descricao: "Serviço 1000" });
    expect(r.status).toBe(201);
    expect((await r.json()).codigo).toBe("SRV-1000");
  });
});
