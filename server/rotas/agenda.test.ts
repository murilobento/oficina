import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarAppDeTeste } from "../teste-util";

let ctx: Awaited<ReturnType<typeof iniciarAppDeTeste>>;
let recepcao: string;
let mecanico: string;
let clienteId: string;
let outroClienteId: string;
let veiculoId: string;
let veiculoDoOutro: string;

const hoje = new Date().toISOString().slice(0, 10);
const amanha = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

beforeAll(async () => {
  ctx = await iniciarAppDeTeste();
  recepcao = await ctx.funcionario("recepcao");
  mecanico = await ctx.funcionario("mecanico");
  [{ id: clienteId }] = await ctx.banco.consultar<{ id: string }>("insert into pessoas (papel, tipo, nome, telefone) values ('cliente','PF','Ana Souza','11999990000') returning id");
  [{ id: outroClienteId }] = await ctx.banco.consultar<{ id: string }>("insert into pessoas (papel, tipo, nome) values ('cliente','PF','Beto') returning id");
  [{ id: veiculoId }] = await ctx.banco.consultar<{ id: string }>("insert into veiculos (cliente_id, modelo, placa, cor, km) values ($1, 'Gol', 'ABC1D23', 'Prata', 50000) returning id", [clienteId]);
  [{ id: veiculoDoOutro }] = await ctx.banco.consultar<{ id: string }>("insert into veiculos (cliente_id, modelo, km) values ($1, 'Uno', 0) returning id", [outroClienteId]);
}, 60_000);
afterAll(() => ctx.fechar());

const corpo = (extra: Record<string, unknown> = {}) => ({ data: amanha, hora: "08:30", clienteId, veiculoId, servico: "Troca de óleo", observacoes: "Trazer filtro", ...extra });
const criar = async (extra: Record<string, unknown> = {}, cookie = recepcao) => ctx.chamar("/api/agendamentos", { corpo: corpo(extra), cookie });

describe("/api/agendamentos", () => {
  it("exige sessão e permissão: mecânico vê, mas não marca", async () => {
    expect((await ctx.chamar(`/api/agendamentos?de=${hoje}&ate=${amanha}`)).status).toBe(401);
    expect((await ctx.chamar(`/api/agendamentos?de=${hoje}&ate=${amanha}`, { cookie: mecanico })).status).toBe(200);
    expect((await criar({}, mecanico)).status).toBe(403);
  });

  it("marca, lista no período e valida data, hora, serviço e veículo do cliente", async () => {
    const r = await criar();
    expect(r.status).toBe(201);
    expect(await r.json()).toMatchObject({ data: amanha, hora: "08:30", servico: "Troca de óleo", status: "agendado", ordemId: "" });

    const lista = await (await ctx.chamar(`/api/agendamentos?de=${hoje}&ate=${amanha}`, { cookie: recepcao })).json();
    expect(lista).toHaveLength(1);

    expect((await criar({ hora: "25:00" })).status).toBe(400);
    expect((await criar({ data: "2020-01-01" })).status).toBe(400);
    expect((await criar({ servico: "  " })).status).toBe(400);
    expect((await criar({ veiculoId: veiculoDoOutro })).status).toBe(400);
    expect((await ctx.chamar("/api/agendamentos?de=xx&ate=yy", { cookie: recepcao })).status).toBe(400);
  });

  it("edita enquanto está agendado", async () => {
    const criado = await (await criar({ hora: "10:00" })).json();
    const r = await ctx.chamar(`/api/agendamentos/${criado.id}`, { metodo: "PUT", corpo: corpo({ hora: "11:15", servico: "Freios" }), cookie: recepcao });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ hora: "11:15", servico: "Freios" });
  });

  it("chegou: abre a OS com o serviço, liga ao agendamento e não abre duas vezes", async () => {
    const criado = await (await criar({ hora: "09:00" })).json();
    const r = await ctx.chamar(`/api/agendamentos/${criado.id}/ordem`, { corpo: { km: 51000 }, cookie: recepcao });
    expect(r.status).toBe(201);
    const ag = await r.json();
    expect(ag).toMatchObject({ status: "chegou" });
    expect(ag.ordemNumero).toMatch(/^OS-/);

    const [ordem] = await ctx.banco.consultar<{ problema: string; km: number; status: string }>("select problema, km, status from ordens where id = $1", [ag.ordemId]);
    expect(ordem).toMatchObject({ problema: "Troca de óleo\nTrazer filtro", km: 51000, status: "fila" });
    const [{ km }] = await ctx.banco.consultar<{ km: number }>("select km from veiculos where id = $1", [veiculoId]);
    expect(km).toBe(51000);
    const eventos = await ctx.banco.consultar<{ texto: string }>("select texto from ordem_eventos where ordem_id = $1", [ag.ordemId]);
    expect(eventos[0].texto).toContain("agendamento");

    expect((await ctx.chamar(`/api/agendamentos/${criado.id}/ordem`, { corpo: { km: 51000 }, cookie: recepcao })).status).toBe(409);
    expect((await ctx.chamar(`/api/agendamentos/${criado.id}`, { metodo: "PUT", corpo: corpo(), cookie: recepcao })).status).toBe(409);
  });

  it("faltou e cancelado; cancelar vai para a auditoria", async () => {
    const a = await (await criar({ hora: "13:00" })).json();
    const b = await (await criar({ hora: "14:00" })).json();
    expect((await ctx.chamar(`/api/agendamentos/${a.id}/status`, { corpo: { status: "faltou" }, cookie: recepcao })).status).toBe(200);
    expect((await ctx.chamar(`/api/agendamentos/${b.id}/status`, { corpo: { status: "cancelado" }, cookie: recepcao })).status).toBe(200);
    expect((await ctx.chamar(`/api/agendamentos/${b.id}/status`, { corpo: { status: "faltou" }, cookie: recepcao })).status).toBe(409);
    const auditoria = await ctx.banco.consultar<{ acao: string; descricao: string }>("select acao, descricao from auditoria where acao like 'agendamento.%'");
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0].descricao).toContain("14:00");
  });
});

describe("TV do pátio", () => {
  let token: string;
  let linkId: string;

  it("só quem gerencia a empresa cria links; o token não é gravado, só o hash", async () => {
    expect((await ctx.chamar("/api/tv-acessos", { corpo: { nome: "TV" }, cookie: recepcao })).status).toBe(403);
    const r = await ctx.chamar("/api/tv-acessos", { corpo: { nome: "TV do pátio" }, cookie: ctx.admin });
    expect(r.status).toBe(201);
    ({ token, id: linkId } = await r.json());
    expect(token.length).toBeGreaterThan(30);
    const [linha] = await ctx.banco.consultar<{ token_hash: string }>("select token_hash from tv_acessos where id = $1", [linkId]);
    expect(linha.token_hash).not.toContain(token);
    const lista = await (await ctx.chamar("/api/tv-acessos", { cookie: ctx.admin })).json();
    expect(lista[0]).toMatchObject({ nome: "TV do pátio", revogadoEm: null });
    expect(JSON.stringify(lista)).not.toContain(token);
  });

  it("abre sem login, mostra agenda do dia e pátio, sem valores nem dados do cliente", async () => {
    const r = await ctx.chamar(`/api/tv/${token}?dia=${amanha}`);
    expect(r.status).toBe(200);
    const painel = await r.json();
    expect(painel.agenda.map((a: { hora: string }) => a.hora)).toEqual(["08:30", "09:00", "11:15", "13:00"]);
    expect(painel.agenda[0]).toMatchObject({ modelo: "Gol", placa: "ABC1D23", servico: "Troca de óleo" });
    expect(painel.patio).toHaveLength(1);
    expect(painel.patio[0]).toMatchObject({ status: "fila", modelo: "Gol" });
    const texto = JSON.stringify(painel);
    expect(texto).not.toContain("Ana Souza");
    expect(texto).not.toContain("11999990000");
    expect(texto).not.toMatch(/"valor"|"desconto"/);
  });

  it("depois de revogado o link para de funcionar; criar e revogar ficam na auditoria", async () => {
    expect((await ctx.chamar(`/api/tv-acessos/${linkId}`, { metodo: "DELETE", cookie: ctx.admin })).status).toBe(204);
    expect((await ctx.chamar(`/api/tv/${token}`)).status).toBe(404);
    expect((await ctx.chamar("/api/tv/token-inventado")).status).toBe(404);
    const acoes = (await ctx.banco.consultar<{ acao: string }>("select acao from auditoria where acao like 'tv.%' order by criado_em")).map((l) => l.acao);
    expect(acoes).toEqual(["tv.link_criado", "tv.link_revogado"]);
  });
});
