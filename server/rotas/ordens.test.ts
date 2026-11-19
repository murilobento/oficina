import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarAppDeTeste } from "../teste-util";

let ctx: Awaited<ReturnType<typeof iniciarAppDeTeste>>;
let mecanico: string;
let recepcao: string;
let clienteId: string;
let veiculoId: string;
let produtoId: string;

beforeAll(async () => {
  ctx = await iniciarAppDeTeste();
  mecanico = await ctx.funcionario("mecanico");
  recepcao = await ctx.funcionario("recepcao");
  [{ id: clienteId }] = await ctx.banco.consultar<{ id: string }>("insert into pessoas (papel, tipo, nome) values ('cliente','PF','Ana') returning id");
  [{ id: veiculoId }] = await ctx.banco.consultar<{ id: string }>("insert into veiculos (cliente_id, modelo, km) values ($1, 'Gol', 1000) returning id", [clienteId]);
  [{ id: produtoId }] = await ctx.banco.consultar<{ id: string }>("insert into produtos (descricao, unidade, codigo, venda, saldo) values ('Pastilha','JG','PRD-1', 12000, 5) returning id");
}, 60_000);
afterAll(() => ctx.fechar());

const saldo = async () => Number((await ctx.banco.consultar<{ saldo: string }>("select saldo from produtos where id = $1", [produtoId]))[0].saldo);
const servico = { tipo: "servico", origemId: "", descricao: "Troca de pastilha", unidade: "UN", quantidade: 1, valor: 8000 };
const peca = () => ({ tipo: "produto", origemId: produtoId, descricao: "Pastilha", unidade: "JG", quantidade: 1, valor: 12000 });

async function orcamentoAprovado() {
  const r = await ctx.chamar("/api/orcamentos", {
    corpo: { clienteId, veiculoId, km: 1500, problema: "Freio chiando", itens: [servico, peca()], descontoTipo: "valor", desconto: 0, validadeDias: 7, observacoes: "" },
    cookie: ctx.admin,
  });
  const { id } = await r.json();
  for (const s of ["enviado", "aprovado"]) await ctx.chamar(`/api/orcamentos/${id}/status`, { metodo: "PATCH", corpo: { status: s }, cookie: ctx.admin });
  return id as string;
}
const status = (id: string, s: string, cookie = mecanico) => ctx.chamar(`/api/ordens/${id}/status`, { metodo: "PATCH", corpo: { status: s }, cookie });

describe("/api/ordens", () => {
  it("exige sessão e permissão", async () => {
    expect((await ctx.chamar("/api/ordens")).status).toBe(401);
    expect((await ctx.chamar("/api/ordens", { cookie: mecanico })).status).toBe(200);
  });

  it("orçamento aprovado vira OS (uma só); copia itens aprovados; orçamento → venda fica bloqueado", async () => {
    const orc = await orcamentoAprovado();
    const r = await ctx.chamar(`/api/orcamentos/${orc}/ordem`, { metodo: "POST", cookie: recepcao });
    expect(r.status).toBe(201);
    const os = await r.json();
    expect(os).toMatchObject({ numero: "OS-0001", status: "fila", orcamentoId: orc, problema: "Freio chiando", km: 1500 });
    expect(os.itens.map((i: { situacao: string }) => i.situacao)).toEqual(["aprovado", "aprovado"]);
    expect(os.eventos[0].texto).toMatch(/a partir do orçamento ORC-/);
    expect((await ctx.chamar(`/api/orcamentos/${orc}/ordem`, { metodo: "POST", cookie: recepcao })).status).toBe(409);
    const venda = await ctx.chamar(`/api/orcamentos/${orc}/venda`, { corpo: { pagamentos: [{ forma: "pix", valor: 20000 }] }, cookie: ctx.admin });
    expect(venda.status).toBe(409);
    expect((await venda.json()).erro).toMatch(/OS-0001/);
  });

  it("mecânico muda etapa, aponta extra (pendente, sem ver preço) e escreve laudo; tudo na linha do tempo", async () => {
    const [{ id }] = await ctx.banco.consultar<{ id: string }>("select id from ordens where numero = 'OS-0001'");
    expect((await status(id, "execucao")).status).toBe(200);
    const extra = await ctx.chamar(`/api/ordens/${id}/itens`, { corpo: { ...peca(), valor: 1 }, cookie: mecanico });
    expect(extra.status, JSON.stringify(await extra.clone().json())).toBe(201);
    const os = await extra.json();
    const novo = os.itens[os.itens.length - 1];
    expect(novo).toMatchObject({ situacao: "pendente", criadoPor: "Func mecanico", valor: 0 }); // mecânico não vê valor
    const [{ valor }] = await ctx.banco.consultar<{ valor: number }>("select valor from ordem_itens where id = $1", [novo.id]);
    expect(valor).toBe(12000); // preço do catálogo, não o enviado
    const laudo = await ctx.chamar(`/api/ordens/${id}/laudo`, { metodo: "PUT", corpo: { laudo: "Disco no limite; trocar na próxima." }, cookie: mecanico });
    const final = await laudo.json();
    expect(final.laudo).toMatch(/Disco no limite/);
    expect(final.eventos.map((e: { texto: string }) => e.texto)).toEqual(expect.arrayContaining(["Na fila → Em execução.", "Extra apontado (aguarda aprovação): Pastilha.", "Laudo atualizado."]));
  });

  it("só a recepção aprova extra; não entrega com pendente nem antes de 'pronto'", async () => {
    const [{ id }] = await ctx.banco.consultar<{ id: string }>("select id from ordens where numero = 'OS-0001'");
    const [{ id: itemId }] = await ctx.banco.consultar<{ id: string }>("select id from ordem_itens where ordem_id = $1 and situacao = 'pendente'", [id]);
    expect((await ctx.chamar(`/api/ordens/${id}/itens/${itemId}`, { metodo: "PATCH", corpo: { situacao: "aprovado" }, cookie: mecanico })).status).toBe(403);
    const entregar = () => ctx.chamar(`/api/ordens/${id}/entregar`, { corpo: { pagamentos: [{ forma: "pix", valor: 32000 }] }, cookie: recepcao });
    expect((await entregar()).status).toBe(409); // ainda em execução
    await status(id, "pronto");
    const r = await entregar();
    expect(r.status).toBe(409);
    expect((await r.json()).erro).toMatch(/aguardando aprovação/);
    expect((await ctx.chamar(`/api/ordens/${id}/itens/${itemId}`, { metodo: "PATCH", corpo: { situacao: "recusado" }, cookie: recepcao })).status).toBe(200);
  });

  it("entrega gera a venda com os itens aprovados, baixa o estoque e converte o orçamento; cancelar a venda volta a OS para 'pronto'", async () => {
    const [{ id, orcamento_id }] = await ctx.banco.consultar<{ id: string; orcamento_id: string }>("select id, orcamento_id from ordens where numero = 'OS-0001'");
    const antes = await saldo();
    const r = await ctx.chamar(`/api/ordens/${id}/entregar`, { corpo: { pagamentos: [{ forma: "pix", valor: 20000 }] }, cookie: recepcao });
    expect(r.status).toBe(200);
    const os = await r.json();
    expect(os).toMatchObject({ status: "entregue" });
    expect(os.vendaId).not.toBe("");
    expect(await saldo()).toBe(antes - 1); // só a peça aprovada; o extra recusado não entra
    const [venda] = await ctx.banco.consultar<{ orcamento_id: string; numero: string }>("select orcamento_id, numero from vendas where id = $1", [os.vendaId]);
    expect(venda.orcamento_id).toBe(orcamento_id);
    expect((await ctx.banco.consultar<{ status: string }>("select status from orcamentos where id = $1", [orcamento_id]))[0].status).toBe("convertido");
    // não muda mais depois de entregue
    expect((await status(id, "fila")).status).toBe(409);

    // cancelar a venda: estorna o pagamento antes, depois cancela; a OS volta para pronto
    const [{ id: pagId }] = await ctx.banco.consultar<{ id: string }>("select id from venda_pagamentos where venda_id = $1", [os.vendaId]);
    await ctx.chamar(`/api/vendas/${os.vendaId}/pagamentos/${pagId}/estornar`, { metodo: "POST", cookie: ctx.admin });
    expect((await ctx.chamar(`/api/vendas/${os.vendaId}/cancelar`, { metodo: "POST", cookie: ctx.admin })).status).toBe(200);
    const volta = await (await ctx.chamar(`/api/ordens/${id}`, { cookie: ctx.admin })).json();
    expect(volta).toMatchObject({ status: "pronto", vendaId: "" });
    expect(volta.eventos.at(-1).texto).toMatch(/cancelada: a OS voltou para Pronto/);
  });

  it("OS direta (sem orçamento): exige problema; item da recepção já entra aprovado; cancela com motivo", async () => {
    expect((await ctx.chamar("/api/ordens", { corpo: { clienteId, veiculoId, km: 0, problema: "" }, cookie: recepcao })).status).toBe(400);
    const r = await ctx.chamar("/api/ordens", { corpo: { clienteId, veiculoId, km: 0, problema: "Não liga" }, cookie: recepcao });
    expect(r.status).toBe(201);
    const os = await r.json();
    expect(os).toMatchObject({ orcamentoId: "", itens: [] });
    const item = await (await ctx.chamar(`/api/ordens/${os.id}/itens`, { corpo: servico, cookie: recepcao })).json();
    expect(item.itens[0]).toMatchObject({ situacao: "aprovado", valor: 8000 });
    // mecânico não tira item aprovado
    expect((await ctx.chamar(`/api/ordens/${os.id}/itens/${item.itens[0].id}`, { metodo: "DELETE", cookie: mecanico })).status).toBe(403);
    const c = await ctx.chamar(`/api/ordens/${os.id}/cancelar`, { corpo: { motivo: "Cliente desistiu" }, cookie: recepcao });
    expect(await c.json()).toMatchObject({ status: "cancelada" });
    expect((await status(os.id, "execucao")).status).toBe(409);
  });

  it("entregar exige vendas.editar", async () => {
    const r = await ctx.chamar("/api/ordens", { corpo: { clienteId, veiculoId, km: 0, problema: "Barulho" }, cookie: recepcao });
    const { id } = await r.json();
    await ctx.chamar(`/api/ordens/${id}/itens`, { corpo: servico, cookie: recepcao });
    await status(id, "pronto");
    expect((await ctx.chamar(`/api/ordens/${id}/entregar`, { corpo: { pagamentos: [{ forma: "pix", valor: 8000 }] }, cookie: mecanico })).status).toBe(403);
  });

  it("mecânico não abre nem cancela OS; tira só o extra que ele mesmo apontou", async () => {
    expect((await ctx.chamar("/api/ordens", { corpo: { clienteId, veiculoId, km: 0, problema: "x" }, cookie: mecanico })).status).toBe(403);
    const { id } = await (await ctx.chamar("/api/ordens", { corpo: { clienteId, veiculoId, km: 0, problema: "Revisão" }, cookie: recepcao })).json();
    expect((await ctx.chamar(`/api/ordens/${id}/cancelar`, { corpo: { motivo: "" }, cookie: mecanico })).status).toBe(403);
    const os = await (await ctx.chamar(`/api/ordens/${id}/itens`, { corpo: { ...servico, descricao: "Limpeza de bico", valor: 0 }, cookie: mecanico })).json();
    const meu = os.itens[0];
    expect((await ctx.chamar(`/api/ordens/${id}/itens/${meu.id}`, { metodo: "DELETE", cookie: mecanico })).status).toBe(200);
  });

  it("recepção aprova extra avulso com o preço combinado (o mecânico apontou sem preço)", async () => {
    const { id } = await (await ctx.chamar("/api/ordens", { corpo: { clienteId, veiculoId, km: 0, problema: "Ruído" }, cookie: recepcao })).json();
    const os = await (await ctx.chamar(`/api/ordens/${id}/itens`, { corpo: { ...servico, descricao: "Regulagem", valor: 0 }, cookie: mecanico })).json();
    const item = os.itens[0];
    const r = await ctx.chamar(`/api/ordens/${id}/itens/${item.id}`, { metodo: "PATCH", corpo: { situacao: "aprovado", valor: 6000, quantidade: 2 }, cookie: recepcao });
    expect((await r.json()).itens[0]).toMatchObject({ situacao: "aprovado", valor: 6000, quantidade: 2 });
  });

  it("orçamento numa OS ativa não muda status, não é editado nem excluído", async () => {
    const orc = await orcamentoAprovado();
    await ctx.chamar(`/api/orcamentos/${orc}/ordem`, { metodo: "POST", cookie: recepcao });
    const r = await ctx.chamar(`/api/orcamentos/${orc}/status`, { metodo: "PATCH", corpo: { status: "enviado" }, cookie: ctx.admin });
    expect(r.status).toBe(409);
    expect((await r.json()).erro).toMatch(/está na OS-/);
    expect((await ctx.chamar(`/api/orcamentos/${orc}`, { metodo: "DELETE", cookie: ctx.admin })).status).toBe(409);
  });

  it("desconto em R$ do orçamento não passa do que sobrou de itens na entrega", async () => {
    const r = await ctx.chamar("/api/orcamentos", {
      corpo: { clienteId, veiculoId, km: 0, problema: "x", itens: [servico, { ...servico, descricao: "Outro", valor: 2000 }], descontoTipo: "valor", desconto: 9000, validadeDias: 7, observacoes: "" },
      cookie: ctx.admin,
    });
    const { id: orc } = await r.json();
    for (const s of ["enviado", "aprovado"]) await ctx.chamar(`/api/orcamentos/${orc}/status`, { metodo: "PATCH", corpo: { status: s }, cookie: ctx.admin });
    const os = await (await ctx.chamar(`/api/orcamentos/${orc}/ordem`, { metodo: "POST", cookie: recepcao })).json();
    // tira o item de 80,00: sobram 20,00 e o desconto de 90,00 vira 20,00 (total zero)
    await ctx.chamar(`/api/ordens/${os.id}/itens/${os.itens[0].id}`, { metodo: "DELETE", cookie: recepcao });
    await status(os.id, "pronto");
    const e = await ctx.chamar(`/api/ordens/${os.id}/entregar`, { corpo: { pagamentos: [] }, cookie: recepcao });
    expect(e.status).toBe(200);
    const [venda] = await ctx.banco.consultar<{ desconto: string }>("select desconto from vendas where id = $1", [(await e.json()).vendaId]);
    expect(Number(venda.desconto)).toBe(2000);
  });
});
