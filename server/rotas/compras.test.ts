import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarAppDeTeste } from "../teste-util";

let ctx: Awaited<ReturnType<typeof iniciarAppDeTeste>>;
let recepcao: string;
let fornecedorId: string;
let produtoId: string;

beforeAll(async () => {
  ctx = await iniciarAppDeTeste();
  recepcao = await ctx.funcionario("recepcao");
  [{ id: fornecedorId }] = await ctx.banco.consultar<{ id: string }>("insert into pessoas (papel, tipo, nome) values ('fornecedor','PJ','Auto Peças') returning id");
  [{ id: produtoId }] = await ctx.banco.consultar<{ id: string }>("insert into produtos (descricao, unidade, codigo, custo) values ('Óleo','L','PRD-1', 4000) returning id");
}, 60_000);
afterAll(() => ctx.fechar());

const corpo = (extra: Record<string, unknown> = {}) => ({
  fornecedorId, notaFiscal: "123", frete: 1000, desconto: 500, observacoes: "",
  itens: [{ produtoId, descricao: "Óleo", unidade: "L", quantidade: 10, custo: 5000 }],
  ...extra,
});
const saldo = async () => Number((await ctx.banco.consultar<{ saldo: string }>("select saldo from produtos where id = $1", [produtoId]))[0].saldo);
const post = (extra?: Record<string, unknown>, cookie = ctx.admin) => ctx.chamar("/api/compras", { corpo: corpo(extra), cookie });

describe("/api/compras", () => {
  it("exige sessão e permissão", async () => {
    expect((await ctx.chamar("/api/compras")).status).toBe(401);
    expect((await ctx.chamar("/api/compras", { cookie: recepcao })).status).toBe(403);
    expect((await post({}, recepcao)).status).toBe(403);
  });

  it("lança a compra: numera, dá entrada no saldo, atualiza o custo e grava o movimento", async () => {
    const r = await post();
    expect(r.status).toBe(201);
    const compra = await r.json();
    expect(compra).toMatchObject({ numero: "CMP-0001", status: "concluida", frete: 1000, desconto: 500 });
    expect(compra.itens[0]).toMatchObject({ produtoId, quantidade: 10, custo: 5000 });
    expect(await saldo()).toBe(10);
    const [{ custo }] = await ctx.banco.consultar<{ custo: number }>("select custo from produtos where id = $1", [produtoId]);
    expect(custo).toBe(5000);
    const mov = await ctx.banco.consultar<{ origem: string; documento: string; saldo_apos: string }>("select * from movimentos_estoque where origem = 'compra'");
    expect(mov).toHaveLength(1);
    expect(mov[0]).toMatchObject({ documento: "CMP-0001" });
  });

  it("lista e busca com itens", async () => {
    const lista = await (await ctx.chamar("/api/compras", { cookie: ctx.admin })).json();
    expect(lista).toHaveLength(1);
    expect(lista[0].itens).toHaveLength(1);
    const um = await ctx.chamar(`/api/compras/${lista[0].id}`, { cookie: ctx.admin });
    expect((await um.json()).numero).toBe("CMP-0001");
    expect((await ctx.chamar("/api/compras/00000000-0000-0000-0000-000000000000", { cookie: ctx.admin })).status).toBe(404);
  });

  it("valida: sem itens, quantidade/custo inválidos, desconto maior que o total, fornecedor/produto inexistente", async () => {
    expect((await post({ itens: [] })).status).toBe(400);
    expect((await post({ itens: [{ produtoId, descricao: "x", unidade: "L", quantidade: 0, custo: 100 }] })).status).toBe(400);
    expect((await post({ itens: [{ produtoId, descricao: "x", unidade: "L", quantidade: 1, custo: 0 }] })).status).toBe(400);
    expect((await post({ desconto: 999_999 })).status).toBe(400);
    expect((await post({ fornecedorId: "00000000-0000-0000-0000-000000000000" })).status).toBe(400);
    const semProduto = await post({ itens: [{ produtoId: "00000000-0000-0000-0000-000000000000", descricao: "x", unidade: "L", quantidade: 1, custo: 100 }] });
    expect(semProduto.status).toBe(400);
    expect(await saldo()).toBe(10);
    expect(await ctx.banco.consultar("select 1 from compras")).toHaveLength(1);
  });

  it("cliente não serve como fornecedor", async () => {
    const [{ id }] = await ctx.banco.consultar<{ id: string }>("insert into pessoas (papel, tipo, nome) values ('cliente','PF','Zé') returning id");
    expect((await post({ fornecedorId: id })).status).toBe(400);
  });

  it("não cancela se parte das peças já saiu; cancela e tira do estoque quando dá", async () => {
    const [{ id }] = await ctx.banco.consultar<{ id: string }>("select id from compras where numero = 'CMP-0001'");
    await ctx.banco.consultar("update produtos set saldo = 4 where id = $1", [produtoId]);
    const bloqueado = await ctx.chamar(`/api/compras/${id}/cancelar`, { metodo: "POST", cookie: ctx.admin });
    expect(bloqueado.status).toBe(409);
    expect((await bloqueado.json()).erro).toContain("Óleo");
    expect(await saldo()).toBe(4);

    await ctx.banco.consultar("update produtos set saldo = 12 where id = $1", [produtoId]);
    const ok = await ctx.chamar(`/api/compras/${id}/cancelar`, { metodo: "POST", cookie: ctx.admin });
    expect(ok.status).toBe(200);
    expect((await ok.json()).status).toBe("cancelada");
    expect(await saldo()).toBe(2);
    const saidas = await ctx.banco.consultar("select 1 from movimentos_estoque where origem = 'compra' and tipo = 'saida'");
    expect(saidas).toHaveLength(1);
    // segundo cancelamento não mexe de novo
    expect((await ctx.chamar(`/api/compras/${id}/cancelar`, { metodo: "POST", cookie: ctx.admin })).status).toBe(409);
    expect(await saldo()).toBe(2);
  });

  it("soma itens repetidos do mesmo produto ao conferir o cancelamento", async () => {
    await ctx.banco.consultar("update produtos set saldo = 0 where id = $1", [produtoId]);
    const dois = { produtoId, descricao: "Óleo", unidade: "L", quantidade: 3, custo: 100 };
    const { id } = await (await post({ itens: [dois, dois], frete: 0, desconto: 0 })).json();
    expect(await saldo()).toBe(6);
    await ctx.banco.consultar("update produtos set saldo = 5 where id = $1", [produtoId]);
    expect((await ctx.chamar(`/api/compras/${id}/cancelar`, { metodo: "POST", cookie: ctx.admin })).status).toBe(409);
  });
});
