import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarAppDeTeste } from "../teste-util";

let ctx: Awaited<ReturnType<typeof iniciarAppDeTeste>>;
let mecanico: string;
let recepcao: string;
let clienteId: string;
let outroClienteId: string;
let veiculoId: string;
let produtoId: string;

beforeAll(async () => {
  ctx = await iniciarAppDeTeste();
  mecanico = await ctx.funcionario("mecanico");
  recepcao = await ctx.funcionario("recepcao");
  [{ id: clienteId }] = await ctx.banco.consultar<{ id: string }>("insert into pessoas (papel, tipo, nome) values ('cliente','PF','Ana') returning id");
  [{ id: outroClienteId }] = await ctx.banco.consultar<{ id: string }>("insert into pessoas (papel, tipo, nome) values ('cliente','PF','Beto') returning id");
  [{ id: veiculoId }] = await ctx.banco.consultar<{ id: string }>("insert into veiculos (cliente_id, modelo, km) values ($1, 'Gol', 1000) returning id", [clienteId]);
  [{ id: produtoId }] = await ctx.banco.consultar<{ id: string }>("insert into produtos (descricao, unidade, codigo, venda) values ('Óleo','L','PRD-1', 5000) returning id");
}, 60_000);
afterAll(() => ctx.fechar());

const item = (extra = {}) => ({ tipo: "produto", origemId: produtoId, descricao: "Óleo", unidade: "L", quantidade: 2, valor: 9999, ...extra });
const corpo = (extra: Record<string, unknown> = {}) => ({
  clienteId, veiculoId, km: 1800, problema: "Barulho", itens: [item()], descontoTipo: "percentual", desconto: 5, validadeDias: 7, observacoes: "", ...extra,
});
const post = (extra?: Record<string, unknown>, cookie = ctx.admin) => ctx.chamar("/api/orcamentos", { corpo: corpo(extra), cookie });
const patch = (id: string, status: string, cookie = ctx.admin) => ctx.chamar(`/api/orcamentos/${id}/status`, { metodo: "PATCH", corpo: { status }, cookie });

describe("/api/orcamentos", () => {
  it("exige sessão e permissão de editar", async () => {
    expect((await ctx.chamar("/api/orcamentos")).status).toBe(401);
    expect((await post({}, mecanico)).status).toBe(403);
  });

  it("cria como rascunho com número, itens em ordem e sobe o km do veículo", async () => {
    const r = await post({ itens: [item(), item({ descricao: "Filtro", origemId: "" })] });
    expect(r.status).toBe(201);
    const o = await r.json();
    expect(o).toMatchObject({ numero: "ORC-0001", status: "rascunho", clienteId, veiculoId, km: 1800, desconto: 5, validadeDias: 7 });
    expect(o.itens.map((i: { descricao: string }) => i.descricao)).toEqual(["Óleo", "Filtro"]);
    expect(o.itens[1].origemId).toBe("");
    const [{ km }] = await ctx.banco.consultar<{ km: number }>("select km from veiculos where id = $1", [veiculoId]);
    expect(km).toBe(1800);
  });

  it("edita só rascunho/enviado e substitui os itens", async () => {
    const { id } = await (await post()).json();
    const r = await ctx.chamar(`/api/orcamentos/${id}`, { metodo: "PUT", corpo: corpo({ itens: [item({ quantidade: 7 })], problema: "Novo" }), cookie: ctx.admin });
    expect(r.status).toBe(200);
    const o = await r.json();
    expect(o.problema).toBe("Novo");
    expect(o.itens).toHaveLength(1);
    expect(o.itens[0].quantidade).toBe(7);
    await patch(id, "enviado");
    await patch(id, "aprovado");
    expect((await ctx.chamar(`/api/orcamentos/${id}`, { metodo: "PUT", corpo: corpo(), cookie: ctx.admin })).status).toBe(409);
  });

  it("segue as transições de status e recusa as demais", async () => {
    const { id } = await (await post()).json();
    expect((await patch(id, "aprovado")).status).toBe(409);
    expect((await patch(id, "enviado")).status).toBe(200);
    expect((await patch(id, "recusado")).status).toBe(200);
    expect((await patch(id, "rascunho")).status).toBe(200);
    expect((await ctx.chamar(`/api/orcamentos/${id}/status`, { metodo: "PATCH", corpo: { status: "convertido" }, cookie: ctx.admin })).status).toBe(400);
  });

  it("renova a validade de orçamento aberto", async () => {
    const { id } = await (await post()).json();
    await ctx.banco.consultar("update orcamentos set criado_em = now() - interval '30 days' where id = $1", [id]);
    const r = await ctx.chamar(`/api/orcamentos/${id}/renovar`, { metodo: "POST", cookie: ctx.admin });
    expect(r.status).toBe(200);
    expect(Date.now() - new Date((await r.json()).criadoEm).getTime()).toBeLessThan(60_000);
  });

  it("exclui rascunho", async () => {
    const { id } = await (await post()).json();
    expect((await ctx.chamar(`/api/orcamentos/${id}`, { metodo: "DELETE", cookie: ctx.admin })).status).toBe(204);
    expect((await ctx.chamar(`/api/orcamentos/${id}`, { cookie: ctx.admin })).status).toBe(404);
  });

  it("valida cliente/veículo, itens, validade e desconto", async () => {
    expect((await post({ clienteId: outroClienteId })).status).toBe(400);
    expect((await post({ itens: [] })).status).toBe(400);
    expect((await post({ validadeDias: 0 })).status).toBe(400);
    expect((await post({ validadeDias: 91 })).status).toBe(400);
    expect((await post({ desconto: 101 })).status).toBe(400);
    expect((await post({ descontoTipo: "valor", desconto: 99_999_999 })).status).toBe(400);
    expect((await post({ itens: [item({ quantidade: 0 })] })).status).toBe(400);
  });

  it("editar sem valores.ver mantém valores e desconto negociados; item novo entra com o preço do catálogo", async () => {
    const { id } = await (await post({ itens: [item({ valor: 8000 }), item({ origemId: "", descricao: "Avulso", valor: 5000 })], desconto: 10 })).json();
    await ctx.banco.consultar("update produtos set venda = 7777 where id = $1", [produtoId]);
    // O mecânico não vê valores; aqui ganha, só durante o teste, a permissão de editar orçamentos.
    await ctx.banco.consultar("insert into perfil_permissoes (perfil_id, permissao) values ('mecanico', 'orcamentos.editar')");
    const r = await ctx.chamar(`/api/orcamentos/${id}`, {
      metodo: "PUT",
      corpo: corpo({ problema: "Corrigido", itens: [item({ valor: 0 }), item({ origemId: "", descricao: "Avulso", valor: 0 }), item({ descricao: "Novo", valor: 0 })], desconto: 0 }),
      cookie: mecanico,
    });
    await ctx.banco.consultar("delete from perfil_permissoes where perfil_id = 'mecanico' and permissao = 'orcamentos.editar'");
    expect(r.status).toBe(200);
    const itens = await ctx.banco.consultar<{ valor: number }>("select valor from orcamento_itens where orcamento_id = $1 order by posicao", [id]);
    expect(itens.map((i) => i.valor)).toEqual([8000, 5000, 7777]);
    const [{ desconto }] = await ctx.banco.consultar<{ desconto: string }>("select desconto from orcamentos where id = $1", [id]);
    expect(Number(desconto)).toBe(10);
  });

  it("mecânico vê o orçamento sem valores; recepção vê com valores", async () => {
    const { id } = await (await post()).json();
    const m = await (await ctx.chamar(`/api/orcamentos/${id}`, { cookie: mecanico })).json();
    expect(m.itens[0].valor).toBe(0);
    expect(m.desconto).toBe(0);
    const r = await (await ctx.chamar(`/api/orcamentos/${id}`, { cookie: recepcao })).json();
    expect(r.itens[0].valor).toBe(9999);
  });
});
