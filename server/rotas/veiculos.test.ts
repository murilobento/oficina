import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarAppDeTeste } from "../teste-util";

let ctx: Awaited<ReturnType<typeof iniciarAppDeTeste>>;
let clienteId: string;

beforeAll(async () => {
  ctx = await iniciarAppDeTeste();
  [{ id: clienteId }] = await ctx.banco.consultar<{ id: string }>("insert into pessoas (papel, tipo, nome) values ('cliente', 'PF', 'Ana') returning id");
}, 60_000);
afterAll(() => ctx.fechar());

const dados = (extra: Record<string, unknown> = {}) => ({
  clienteId, placa: "", modelo: "HB20 1.0", ano: "", cor: "", km: 0, combustivel: "", cambio: "", motor: "", observacoes: "", ativo: true, ...extra,
});
const criar = (extra: Record<string, unknown> = {}) => ctx.chamar("/api/veiculos", { corpo: dados(extra), cookie: ctx.admin });

describe("/api/veiculos", () => {
  it("normaliza a placa ao gravar", async () => {
    const r = await criar({ placa: "abc-1234" });
    expect(r.status).toBe(201);
    expect((await r.json()).placa).toBe("ABC1234");
  });

  it("placa repetida (outra escrita) → 409; veículos sem placa convivem", async () => {
    const repetida = await criar({ placa: "ABC 1234" });
    expect(repetida.status).toBe(409);
    expect((await repetida.json()).campos.placa).toMatch(/Já existe/);
    expect((await criar()).status).toBe(201);
    expect((await criar()).status).toBe(201);
  });

  it("placa com tamanho errado → 400", async () => {
    expect((await criar({ placa: "AB12" })).status).toBe(400);
  });

  it("cliente inexistente → 400", async () => {
    const r = await criar({ clienteId: "00000000-0000-4000-8000-000000000000", placa: "ZZZ9Z99" });
    expect(r.status).toBe(400);
    expect((await r.json()).campos.clienteId).toBeDefined();
  });

  it("GET ?clienteId= filtra; PUT e PATCH alteram", async () => {
    const [outro] = await ctx.banco.consultar<{ id: string }>("insert into pessoas (papel, tipo, nome) values ('cliente', 'PF', 'Beto') returning id");
    const { id } = await (await criar({ clienteId: outro.id, placa: "QWE1R23", modelo: "Onix" })).json();
    const lista = await (await ctx.chamar(`/api/veiculos?clienteId=${outro.id}`, { cookie: ctx.admin })).json();
    expect(lista.map((v: { id: string }) => v.id)).toEqual([id]);
    const put = await ctx.chamar(`/api/veiculos/${id}`, { metodo: "PUT", corpo: dados({ clienteId: outro.id, placa: "QWE1R23", modelo: "Onix Plus", km: 1000 }), cookie: ctx.admin });
    expect(await put.json()).toMatchObject({ modelo: "Onix Plus", km: 1000 });
    const patch = await ctx.chamar(`/api/veiculos/${id}/ativo`, { metodo: "PATCH", corpo: { ativo: false }, cookie: ctx.admin });
    expect((await patch.json()).ativo).toBe(false);
  });
});

describe("limites e dono", () => {
  it("km absurdo → 400, não 500", async () => {
    expect((await criar({ km: 3_000_000_000, placa: "KMK1K11" })).status).toBe(400);
  });

  it("não aceita fornecedor como dono do veículo", async () => {
    const [f] = await ctx.banco.consultar<{ id: string }>("insert into pessoas (papel, tipo, nome) values ('fornecedor', 'PJ', 'Forn') returning id");
    const r = await criar({ clienteId: f.id, placa: "FOR1N11" });
    expect(r.status).toBe(400);
    expect((await r.json()).campos.clienteId).toBeDefined();
  });
});
