import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarAppDeTeste } from "../teste-util";

let ctx: Awaited<ReturnType<typeof iniciarAppDeTeste>>;
let mecanico: string;
let recepcao: string;
let clienteId: string;
let outroClienteId: string;
let veiculoId: string;
let produtoId: string;
let servicoId: string;

beforeAll(async () => {
  ctx = await iniciarAppDeTeste();
  mecanico = await ctx.funcionario("mecanico");
  recepcao = await ctx.funcionario("recepcao");
  [{ id: clienteId }] = await ctx.banco.consultar<{ id: string }>("insert into pessoas (papel, tipo, nome) values ('cliente','PF','Ana') returning id");
  [{ id: outroClienteId }] = await ctx.banco.consultar<{ id: string }>("insert into pessoas (papel, tipo, nome) values ('cliente','PF','Beto') returning id");
  [{ id: veiculoId }] = await ctx.banco.consultar<{ id: string }>("insert into veiculos (cliente_id, modelo, km) values ($1, 'Gol', 1000) returning id", [clienteId]);
  [{ id: produtoId }] = await ctx.banco.consultar<{ id: string }>("insert into produtos (descricao, unidade, codigo, venda, saldo) values ('Óleo','L','PRD-1', 5000, 10) returning id");
  [{ id: servicoId }] = await ctx.banco.consultar<{ id: string }>("insert into servicos (descricao, codigo, valor) values ('Troca','SRV-1', 8000) returning id");
}, 60_000);
afterAll(() => ctx.fechar());

const saldo = async () => Number((await ctx.banco.consultar<{ saldo: string }>("select saldo from produtos where id = $1", [produtoId]))[0].saldo);
const kmVeiculo = async () => (await ctx.banco.consultar<{ km: number }>("select km from veiculos where id = $1", [veiculoId]))[0].km;
const peca = (extra = {}) => ({ tipo: "produto", origemId: produtoId, descricao: "Óleo", unidade: "L", quantidade: 4, valor: 5000, ...extra });
const maoDeObra = () => ({ tipo: "servico", origemId: servicoId, descricao: "Troca", unidade: "UN", quantidade: 1, valor: 8000 });
const venda = (extra: Record<string, unknown> = {}) => ({
  clienteId, veiculoId, km: 1500, itens: [peca(), maoDeObra()], descontoTipo: "percentual", desconto: 10, formaPagamento: "pix", observacoes: "", ...extra,
});
const post = (extra?: Record<string, unknown>, cookie = ctx.admin) => ctx.chamar("/api/vendas", { corpo: venda(extra), cookie });

describe("/api/vendas", () => {
  it("exige sessão e permissão", async () => {
    expect((await ctx.chamar("/api/vendas")).status).toBe(401);
    expect((await ctx.chamar("/api/vendas", { cookie: mecanico })).status).toBe(403);
    expect((await post({}, mecanico)).status).toBe(403);
  });

  it("lança a venda: numera, baixa só as peças do cadastro, grava movimento e sobe o km", async () => {
    const r = await post();
    expect(r.status).toBe(201);
    const v = await r.json();
    expect(v).toMatchObject({ numero: "VND-0001", status: "concluida", clienteId, veiculoId, orcamentoId: "", desconto: 10, formaPagamento: "pix" });
    expect(v.itens).toHaveLength(2);
    expect(v.itens[0]).toMatchObject({ tipo: "produto", origemId: produtoId, quantidade: 4, valor: 5000 });
    expect(await saldo()).toBe(6);
    expect(await kmVeiculo()).toBe(1500);
    const mov = await ctx.banco.consultar<{ documento: string; tipo: string }>("select * from movimentos_estoque where origem = 'venda'");
    expect(mov).toHaveLength(1);
    expect(mov[0]).toMatchObject({ documento: "VND-0001", tipo: "saida" });
  });

  it("km menor não diminui o do veículo", async () => {
    await post({ km: 200, itens: [maoDeObra()] });
    expect(await kmVeiculo()).toBe(1500);
  });

  it("venda de balcão (consumidor final) sem cliente nem veículo; item avulso não mexe no estoque", async () => {
    const antes = await saldo();
    const r = await post({ clienteId: "", veiculoId: "", km: 0, itens: [{ tipo: "produto", origemId: "", descricao: "Palheta", unidade: "UN", quantidade: 2, valor: 3000 }] });
    expect(r.status).toBe(201);
    expect((await r.json()).clienteId).toBe("");
    expect(await saldo()).toBe(antes);
  });

  it("deixa o saldo ficar negativo", async () => {
    const r = await post({ itens: [peca({ quantidade: 20 })], clienteId: "", veiculoId: "" });
    expect(r.status).toBe(201);
    expect(await saldo()).toBeLessThan(0);
    await ctx.banco.consultar("update produtos set saldo = 6 where id = $1", [produtoId]);
  });

  it("valida: sem itens, forma de pagamento, desconto, veículo de outro cliente, produto inexistente (nada é gravado)", async () => {
    const antes = (await ctx.banco.consultar("select 1 from vendas")).length;
    expect((await post({ itens: [] })).status).toBe(400);
    expect((await post({ formaPagamento: "cheque" })).status).toBe(400);
    expect((await post({ descontoTipo: "percentual", desconto: 101 })).status).toBe(400);
    expect((await post({ descontoTipo: "valor", desconto: 99_999_999 })).status).toBe(400);
    expect((await post({ clienteId: outroClienteId })).status).toBe(400);
    expect((await post({ clienteId: "", veiculoId })).status).toBe(400);
    expect((await post({ itens: [peca({ origemId: "00000000-0000-0000-0000-000000000000" })] })).status).toBe(400);
    expect((await ctx.banco.consultar("select 1 from vendas")).length).toBe(antes);
  });

  it("cancela: devolve o estoque uma única vez", async () => {
    const [{ id }] = await ctx.banco.consultar<{ id: string }>("select id from vendas where numero = 'VND-0001'");
    const antes = await saldo();
    const r = await ctx.chamar(`/api/vendas/${id}/cancelar`, { metodo: "POST", cookie: ctx.admin });
    expect(r.status).toBe(200);
    expect((await r.json()).status).toBe("cancelada");
    expect(await saldo()).toBe(antes + 4);
    expect((await ctx.chamar(`/api/vendas/${id}/cancelar`, { metodo: "POST", cookie: ctx.admin })).status).toBe(409);
    expect(await saldo()).toBe(antes + 4);
  });

  it("quantidade com mais de 3 casas é recusada (não desalinha o saldo)", async () => {
    const antes = await saldo();
    expect((await post({ itens: [peca({ quantidade: 1.0005 })] })).status).toBe(400);
    expect((await post({ itens: [peca({ quantidade: 0.0001 })] })).status).toBe(400);
    expect((await post({ itens: [peca({ quantidade: 1.25 })], clienteId: "", veiculoId: "" })).status).toBe(201);
    expect(await saldo()).toBe(antes - 1.25);
    await ctx.banco.consultar("update produtos set saldo = $1 where id = $2", [antes, produtoId]);
  });

  it("lista e busca com itens", async () => {
    const lista = await (await ctx.chamar("/api/vendas", { cookie: recepcao })).json();
    expect(lista.length).toBeGreaterThan(2);
    expect(lista[0].itens.length).toBeGreaterThan(0);
    expect((await ctx.chamar("/api/vendas/00000000-0000-0000-0000-000000000000", { cookie: ctx.admin })).status).toBe(404);
  });
});

describe("orçamento → venda", () => {
  const orc = (extra: Record<string, unknown> = {}, cookie = ctx.admin) =>
    ctx.chamar("/api/orcamentos", { corpo: { clienteId, veiculoId, km: 2000, problema: "Barulho", itens: [peca({ quantidade: 2 }), maoDeObra()], descontoTipo: "valor", desconto: 1000, validadeDias: 7, observacoes: "", ...extra }, cookie });
  const status = (id: string, s: string, cookie = ctx.admin) => ctx.chamar(`/api/orcamentos/${id}/status`, { metodo: "PATCH", corpo: { status: s }, cookie });
  const gerar = (id: string) => ctx.chamar(`/api/orcamentos/${id}/venda`, { corpo: { formaPagamento: "credito" }, cookie: ctx.admin });

  it("só gera venda de orçamento aprovado; copia tudo, baixa estoque e marca 'convertido'", async () => {
    const { id } = await (await orc()).json();
    expect((await gerar(id)).status).toBe(409);
    await status(id, "enviado");
    await status(id, "aprovado");
    const antes = await saldo();
    const r = await gerar(id);
    expect(r.status).toBe(201);
    const v = await r.json();
    expect(v).toMatchObject({ orcamentoId: id, formaPagamento: "credito", desconto: 1000, descontoTipo: "valor", clienteId, veiculoId });
    expect(v.itens).toHaveLength(2);
    expect(await saldo()).toBe(antes - 2);
    expect(await kmVeiculo()).toBe(2000);
    expect((await (await ctx.chamar(`/api/orcamentos/${id}`, { cookie: ctx.admin })).json()).status).toBe("convertido");
    // não vira venda duas vezes
    expect((await gerar(id)).status).toBe(409);
    expect(await saldo()).toBe(antes - 2);
    // orçamento com venda não se exclui, nem se edita
    expect((await ctx.chamar(`/api/orcamentos/${id}`, { metodo: "DELETE", cookie: ctx.admin })).status).toBe(409);

    // cancelar a venda devolve o estoque e reabre o orçamento como aprovado
    const c = await ctx.chamar(`/api/vendas/${v.id}/cancelar`, { metodo: "POST", cookie: ctx.admin });
    expect(c.status).toBe(200);
    expect(await saldo()).toBe(antes);
    expect((await (await ctx.chamar(`/api/orcamentos/${id}`, { cookie: ctx.admin })).json()).status).toBe("aprovado");
  });

  it("sem valores.ver os valores saem zerados (venda de orçamento incluída)", async () => {
    const r = await ctx.chamar("/api/orcamentos", { cookie: mecanico });
    expect(r.status).toBe(200);
    const lista = await r.json();
    expect(lista.length).toBeGreaterThan(0);
    for (const o of lista) {
      expect(o.desconto).toBe(0);
      for (const i of o.itens) expect(i.valor).toBe(0);
    }
    expect((await ctx.chamar("/api/vendas", { cookie: recepcao })).status).toBe(200);
  });
});
