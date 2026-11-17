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
  codigo: "", descricao: "Filtro de óleo", categoria: "filtros", marca: "", referencia: "", codigoBarras: "", unidade: "UN", aplicacao: "",
  custo: 2000, venda: 3500, estoqueMinimo: 2, localizacao: "", fornecedorId: "", ncm: "", observacoes: "", ativo: true,
};
const criar = (extra: Record<string, unknown> = {}, cookie = ctx.admin) => ctx.chamar("/api/produtos", { corpo: { ...base, ...extra }, cookie });

describe("/api/produtos", () => {
  it("sem sessão → 401", async () => {
    expect((await ctx.chamar("/api/produtos")).status).toBe(401);
  });

  it("dois cadastros ao mesmo tempo recebem códigos diferentes", async () => {
    const [a, b] = await Promise.all([criar(), criar({ descricao: "Pastilha" })]);
    const codigos = [(await a.json()).codigo, (await b.json()).codigo].sort();
    expect(codigos).toEqual(["PRD-0001", "PRD-0002"]);
  });

  it("pula o código automático que alguém já digitou à mão", async () => {
    expect((await criar({ codigo: "PRD-0003" })).status).toBe(201);
    expect((await (await criar()).json()).codigo).toBe("PRD-0004");
  });

  it("código repetido digitado → 409 com campo codigo", async () => {
    const r = await criar({ codigo: "PRD-0001" });
    expect(r.status).toBe(409);
    expect((await r.json()).campos.codigo).toBeDefined();
  });

  it("PUT não altera o saldo, mesmo recebendo saldo no corpo", async () => {
    const { id } = await (await criar({ descricao: "Correia" })).json();
    await ctx.banco.consultar("update produtos set saldo = 7 where id = $1", [id]);
    const r = await ctx.chamar(`/api/produtos/${id}`, { metodo: "PUT", corpo: { ...base, descricao: "Correia dentada", saldo: 999 }, cookie: ctx.admin });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ descricao: "Correia dentada", saldo: 7 });
  });

  it("sem valores.ver não recebe custo/preço e não consegue alterá-los", async () => {
    const { id } = await (await criar({ descricao: "Vela", custo: 1000, venda: 2500 })).json();
    const lista = await (await ctx.chamar("/api/produtos", { cookie: mecanico })).json();
    expect(lista.find((p: { id: string }) => p.id === id)).toMatchObject({ custo: 0, venda: 0 });
    const detalhe = await (await ctx.chamar(`/api/produtos/${id}`, { cookie: mecanico })).json();
    expect(detalhe).toMatchObject({ custo: 0, venda: 0 });
    await ctx.chamar(`/api/produtos/${id}`, { metodo: "PUT", corpo: { ...base, descricao: "Vela", venda: 100 }, cookie: mecanico });
    const [linha] = await ctx.banco.consultar<{ custo: number; venda: number }>("select custo, venda from produtos where id = $1", [id]);
    expect(linha).toMatchObject({ custo: 1000, venda: 2500 });
  });

  it("preço negativo → 400", async () => {
    const r = await criar({ venda: -1 });
    expect(r.status).toBe(400);
    expect((await r.json()).campos.venda).toBeDefined();
  });

  it("excluir produto sem movimentação → 204; com movimentação → 409", async () => {
    const { id: livre } = await (await criar({ descricao: "Livre" })).json();
    expect((await ctx.chamar(`/api/produtos/${livre}`, { metodo: "DELETE", cookie: ctx.admin })).status).toBe(204);
    const { id: usado } = await (await criar({ descricao: "Usado" })).json();
    await ctx.banco.consultar("insert into movimentos_estoque (produto_id, tipo, quantidade, origem, saldo_apos) values ($1, 'entrada', 1, 'inicial', 1)", [usado]);
    const r = await ctx.chamar(`/api/produtos/${usado}`, { metodo: "DELETE", cookie: ctx.admin });
    expect(r.status).toBe(409);
  });
});

describe("código automático em volume", () => {
  it("passa de PRD-9999 para PRD-10000 sem travar", async () => {
    await ctx.banco.consultar("select setval('produto_codigo_seq', 9999)");
    const r = await criar({ descricao: "Produto 10000" });
    expect(r.status).toBe(201);
    expect((await r.json()).codigo).toBe("PRD-10000");
  });

  it("número grande demais → 400, não 500", async () => {
    const r = await criar({ venda: 3_000_000_000 });
    expect(r.status).toBe(400);
  });
});
