import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarAppDeTeste } from "../teste-util";

import { totalDaVenda } from "./pagamentos-venda";

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
const venda = (extra: Record<string, unknown> = {}) => {
  const base = { clienteId, veiculoId, km: 1500, itens: [peca(), maoDeObra()], descontoTipo: "percentual", desconto: 10, observacoes: "", ...extra } as unknown as Record<string, unknown> & { itens: { tipo: "produto" | "servico"; quantidade: number; valor: number }[]; descontoTipo: "valor" | "percentual"; desconto: number };
  // Sem `pagamentos` explícito, paga o total em pix.
  const total = totalDaVenda(base.itens, base.descontoTipo, base.desconto, 0);
  return { pagamentos: total > 0 ? [{ forma: "pix", valor: total }] : [], ...base };
};
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
    expect((await post({ pagamentos: [{ forma: "cheque", valor: 25200 }] })).status).toBe(400);
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
    await ctx.banco.consultar("update venda_pagamentos set estornado_em = now() where venda_id = $1", [id]);
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
  const gerar = (id: string, corpo: Record<string, unknown> = { pagamentos: [{ forma: "credito", valor: 17000 }] }) => ctx.chamar(`/api/orcamentos/${id}/venda`, { corpo, cookie: ctx.admin });

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
    // com pagamento recebido não cancela: precisa estornar antes
    expect((await ctx.chamar(`/api/vendas/${v.id}/cancelar`, { metodo: "POST", cookie: ctx.admin })).status).toBe(409);
    const [pag] = v.pagamentos;
    expect((await ctx.chamar(`/api/vendas/${v.id}/pagamentos/${pag.id}/estornar`, { metodo: "POST", cookie: ctx.admin })).status).toBe(200);
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

describe("pagamentos da venda", () => {
  // total padrão: 25200 (4 x 50,00 + 80,00 com 10% de desconto)
  const TOTAL = 25200;
  const pagar = (pagamentos: unknown[], extra: Record<string, unknown> = {}) => ctx.chamar("/api/vendas", { corpo: venda({ pagamentos, ...extra }), cookie: ctx.admin });

  it("vários pagamentos somam o total; a forma resumida vira 'varias'", async () => {
    const r = await pagar([{ forma: "pix", valor: 20000 }, { forma: "dinheiro", valor: 5200 }]);
    expect(r.status).toBe(201);
    const v = await r.json();
    expect(v).toMatchObject({ totalPago: TOTAL, saldo: 0, ajuste: 0, formaPagamento: "varias" });
    expect(v.pagamentos).toHaveLength(2);
  });

  it("pagou menos: sem decisão, a API pede (400 com 'Faltam')", async () => {
    const r = await pagar([{ forma: "pix", valor: 20000 }]);
    expect(r.status).toBe(400);
    expect((await r.json()).erro).toMatch(/Faltam R\$\s?52,00/);
  });

  it("pagou menos e ficou devendo: venda concluída com saldo em aberto", async () => {
    const r = await pagar([{ forma: "pix", valor: 20000 }], { divergencia: "saldo" });
    expect(r.status).toBe(201);
    expect(await r.json()).toMatchObject({ status: "concluida", totalPago: 20000, saldo: 5200 });
  });

  it("fiado inteiro (nenhum pagamento) com cliente", async () => {
    const r = await pagar([], { divergencia: "saldo" });
    expect(r.status).toBe(201);
    expect(await r.json()).toMatchObject({ totalPago: 0, saldo: TOTAL, formaPagamento: "" });
  });

  it("consumidor final não pode ficar devendo", async () => {
    const r = await pagar([{ forma: "pix", valor: 20000 }], { divergencia: "saldo", clienteId: "", veiculoId: "" });
    expect(r.status).toBe(400);
  });

  it("desconto da diferença: ajuste reduz o total e o saldo fica zero", async () => {
    const r = await pagar([{ forma: "pix", valor: 20000 }], { divergencia: "desconto" });
    expect(r.status).toBe(201);
    expect(await r.json()).toMatchObject({ ajuste: 5200, totalPago: 20000, saldo: 0 });
  });

  it("desconto exige algum valor pago", async () => {
    expect((await pagar([], { divergencia: "desconto" })).status).toBe(400);
  });

  it("pagou a mais: só dinheiro tem troco (o excesso sai do dinheiro)", async () => {
    const ok = await pagar([{ forma: "dinheiro", valor: 30000 }]);
    expect(ok.status).toBe(201);
    expect(await ok.json()).toMatchObject({ totalPago: TOTAL, saldo: 0 });
    expect((await pagar([{ forma: "pix", valor: 30000 }])).status).toBe(400);
  });

  it("recebe o restante depois; não passa do saldo; estorno reabre o saldo", async () => {
    const v = await (await pagar([{ forma: "pix", valor: 20000 }], { divergencia: "saldo" })).json();
    const receber = (valor: number, forma = "dinheiro") => ctx.chamar(`/api/vendas/${v.id}/pagamentos`, { corpo: { forma, valor }, cookie: ctx.admin });
    expect((await receber(5300)).status).toBe(400);
    const r = await receber(5200);
    expect(r.status).toBe(201);
    const pago = await r.json();
    expect(pago).toMatchObject({ saldo: 0, totalPago: TOTAL });
    const ultimo = pago.pagamentos[pago.pagamentos.length - 1];
    const e = await ctx.chamar(`/api/vendas/${v.id}/pagamentos/${ultimo.id}/estornar`, { metodo: "POST", cookie: ctx.admin });
    expect(await e.json()).toMatchObject({ saldo: 5200, totalPago: 20000 });
    expect((await ctx.chamar(`/api/vendas/${v.id}/pagamentos/${ultimo.id}/estornar`, { metodo: "POST", cookie: ctx.admin })).status).toBe(409);
  });

  it("quem não vê valores só escolhe a forma: a API paga o total e esconde os pagamentos", async () => {
    await ctx.banco.consultar("insert into perfil_permissoes (perfil_id, permissao) values ('mecanico', 'vendas.editar')");
    const r = await ctx.chamar("/api/vendas", { corpo: venda({ pagamentos: [{ forma: "pix", valor: 0 }] }), cookie: mecanico });
    const recebimento = await ctx.chamar("/api/vendas/00000000-0000-0000-0000-000000000000/pagamentos", { corpo: { forma: "pix", valor: 100 }, cookie: mecanico });
    await ctx.banco.consultar("delete from perfil_permissoes where perfil_id = 'mecanico' and permissao = 'vendas.editar'");
    expect(r.status).toBe(201);
    const v = await r.json();
    expect(v).toMatchObject({ pagamentos: [], saldo: 0, totalPago: 0, temPagamento: true });
    expect(recebimento.status).toBe(403);
    const [{ pago }] = await ctx.banco.consultar<{ pago: string }>("select coalesce(sum(valor),0) as pago from venda_pagamentos where venda_id = $1", [v.id]);
    // Sem valores.ver não há desconto: paga os 28000 do catálogo.
    expect(Number(pago)).toBe(28000);
  });

  it("orçamento → venda com saldo: ficar devendo e desconto", async () => {
    const criar = async () => {
      const { id } = await (await ctx.chamar("/api/orcamentos", { corpo: { clienteId, veiculoId, km: 2000, problema: "x", itens: [maoDeObra()], descontoTipo: "valor", desconto: 0, validadeDias: 7, observacoes: "" }, cookie: ctx.admin })).json();
      for (const s of ["enviado", "aprovado"]) await ctx.chamar(`/api/orcamentos/${id}/status`, { metodo: "PATCH", corpo: { status: s }, cookie: ctx.admin });
      return id as string;
    };
    const gerar = (id: string, corpo: unknown) => ctx.chamar(`/api/orcamentos/${id}/venda`, { corpo, cookie: ctx.admin });
    const a = await criar();
    const faltando = await gerar(a, { pagamentos: [{ forma: "pix", valor: 5000 }] });
    expect(faltando.status).toBe(400);
    // a falha não consome o orçamento
    const devendo = await gerar(a, { pagamentos: [{ forma: "pix", valor: 5000 }], divergencia: "saldo" });
    expect(await devendo.json()).toMatchObject({ saldo: 3000, totalPago: 5000 });
    const b = await criar();
    expect(await (await gerar(b, { pagamentos: [{ forma: "pix", valor: 5000 }], divergencia: "desconto" })).json()).toMatchObject({ ajuste: 3000, saldo: 0 });
  });

  it("quem não vê valores também gera venda de orçamento (a API paga o total, sem expor valores)", async () => {
    const { id } = await (await ctx.chamar("/api/orcamentos", { corpo: { clienteId, veiculoId, km: 2000, problema: "x", itens: [maoDeObra()], descontoTipo: "valor", desconto: 0, validadeDias: 7, observacoes: "" }, cookie: ctx.admin })).json();
    for (const st of ["enviado", "aprovado"]) await ctx.chamar(`/api/orcamentos/${id}/status`, { metodo: "PATCH", corpo: { status: st }, cookie: ctx.admin });
    await ctx.banco.consultar("insert into perfil_permissoes (perfil_id, permissao) values ('mecanico', 'vendas.editar')");
    const r = await ctx.chamar(`/api/orcamentos/${id}/venda`, { corpo: { pagamentos: [{ forma: "pix", valor: 0 }] }, cookie: mecanico });
    await ctx.banco.consultar("delete from perfil_permissoes where perfil_id = 'mecanico' and permissao = 'vendas.editar'");
    expect(r.status).toBe(201);
    expect(await r.json()).toMatchObject({ saldo: 0, pagamentos: [], temPagamento: true });
  });

  it("cancelar com pagamento recebido é recusado", async () => {
    const v = await (await pagar([{ forma: "pix", valor: TOTAL }])).json();
    const r = await ctx.chamar(`/api/vendas/${v.id}/cancelar`, { metodo: "POST", cookie: ctx.admin });
    expect(r.status).toBe(409);
  });
});
