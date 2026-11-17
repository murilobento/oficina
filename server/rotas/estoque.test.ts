import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarAppDeTeste } from "../teste-util";

let ctx: Awaited<ReturnType<typeof iniciarAppDeTeste>>;
let mecanico: string;
let recepcao: string;
let p1: string;
let p2: string;

beforeAll(async () => {
  ctx = await iniciarAppDeTeste();
  mecanico = await ctx.funcionario("mecanico");
  recepcao = await ctx.funcionario("recepcao");
  [{ id: p1 }] = await ctx.banco.consultar<{ id: string }>("insert into produtos (descricao, unidade, codigo, saldo) values ('Óleo','L','PRD-1', 10) returning id");
  [{ id: p2 }] = await ctx.banco.consultar<{ id: string }>("insert into produtos (descricao, unidade, codigo, saldo) values ('Filtro','UN','PRD-2', 3) returning id");
}, 60_000);
afterAll(() => ctx.fechar());

const saldo = async (id: string) => Number((await ctx.banco.consultar<{ saldo: string }>("select saldo from produtos where id = $1", [id]))[0].saldo);
const acerto = (itens: unknown[], extra: Record<string, unknown> = {}, cookie = ctx.admin) =>
  ctx.chamar("/api/estoque/acertos", { corpo: { motivo: "Inventário (contagem física)", observacoes: "", itens, ...extra }, cookie });

describe("/api/estoque/acertos", () => {
  it("exige sessão; recepção só vê; mecânico lança", async () => {
    expect((await ctx.chamar("/api/estoque/acertos")).status).toBe(401);
    expect((await ctx.chamar("/api/estoque/acertos", { cookie: recepcao })).status).toBe(200);
    expect((await acerto([{ produtoId: p1, contado: 1 }], {}, recepcao)).status).toBe(403);
  });

  it("ajusta o saldo para a contagem, guardando o saldo do sistema e gerando movimentos só dos que mudaram", async () => {
    const r = await acerto([{ produtoId: p1, contado: 8.5 }, { produtoId: p2, contado: 3 }], {}, mecanico);
    expect(r.status).toBe(201);
    const a = await r.json();
    expect(a.numero).toBe("ACE-0001");
    expect(a.itens).toEqual(expect.arrayContaining([expect.objectContaining({ produtoId: p1, descricao: "Óleo", unidade: "L", saldoSistema: 10, contado: 8.5 })]));
    expect(await saldo(p1)).toBe(8.5);
    expect(await saldo(p2)).toBe(3);
    const mov = await (await ctx.chamar("/api/estoque/movimentos", { cookie: mecanico })).json();
    expect(mov).toHaveLength(1);
    expect(mov[0]).toMatchObject({ produtoId: p1, tipo: "saida", quantidade: 1.5, saldoApos: 8.5, origem: "acerto", documento: "ACE-0001", motivo: "Inventário (contagem física)" });
  });

  it("lista e busca por id", async () => {
    const lista = await (await ctx.chamar("/api/estoque/acertos", { cookie: ctx.admin })).json();
    expect(lista).toHaveLength(1);
    expect((await (await ctx.chamar(`/api/estoque/acertos/${lista[0].id}`, { cookie: ctx.admin })).json()).itens).toHaveLength(2);
    expect((await ctx.chamar("/api/estoque/acertos/00000000-0000-0000-0000-000000000000", { cookie: ctx.admin })).status).toBe(404);
  });

  it("valida: motivo, itens vazios/repetidos, contagem negativa, produto inexistente (sem gravar nada)", async () => {
    expect((await acerto([{ produtoId: p1, contado: 1 }], { motivo: "" })).status).toBe(400);
    expect((await acerto([])).status).toBe(400);
    expect((await acerto([{ produtoId: p1, contado: 1 }, { produtoId: p1, contado: 2 }])).status).toBe(400);
    expect((await acerto([{ produtoId: p1, contado: -1 }])).status).toBe(400);
    const r = await acerto([{ produtoId: p1, contado: 1 }, { produtoId: "00000000-0000-0000-0000-000000000000", contado: 1 }]);
    expect(r.status).toBe(400);
    expect(await saldo(p1)).toBe(8.5);
    expect(await ctx.banco.consultar("select 1 from acertos")).toHaveLength(1);
  });
});

describe("/api/estoque/movimentos", () => {
  it("filtra por produto", async () => {
    await acerto([{ produtoId: p2, contado: 5 }]);
    const todos = await (await ctx.chamar("/api/estoque/movimentos", { cookie: ctx.admin })).json();
    expect(todos).toHaveLength(2);
    const so = await (await ctx.chamar(`/api/estoque/movimentos?produtoId=${p2}`, { cookie: ctx.admin })).json();
    expect(so).toHaveLength(1);
    expect(so[0]).toMatchObject({ tipo: "entrada", quantidade: 2 });
  });
});
