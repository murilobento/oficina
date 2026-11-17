import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarAppDeTeste } from "../teste-util";

let ctx: Awaited<ReturnType<typeof iniciarAppDeTeste>>;
let mecanico: string;

beforeAll(async () => {
  ctx = await iniciarAppDeTeste();
  mecanico = await ctx.funcionario("mecanico");
}, 60_000);
afterAll(() => ctx.fechar());

const dados = (extra: Record<string, unknown> = {}) => ({
  razaoSocial: "", nomeFantasia: "Auto Silva", cnpj: "", inscricaoEstadual: "", inscricaoMunicipal: "", cep: "", logradouro: "",
  numero: "", complemento: "", bairro: "", cidade: "", uf: "", telefone: "", whatsapp: "", email: "", site: "", instagram: "",
  horario: "", validadeOrcamentoDias: 7, condicoesOrcamento: "", rodape: "", logo: "", ...extra,
});

describe("/api/empresa", () => {
  it("GET é público (a tela de entrada usa o nome e a logo)", async () => {
    expect((await ctx.chamar("/api/empresa")).status).toBe(200);
  });

  it("GET logado devolve a linha inicial", async () => {
    const r = await ctx.chamar("/api/empresa", { cookie: mecanico });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ nomeFantasia: "Nome da oficina", validadeOrcamentoDias: 7 });
  });

  it("PUT por mecânico → 403", async () => {
    expect((await ctx.chamar("/api/empresa", { metodo: "PUT", corpo: dados(), cookie: mecanico })).status).toBe(403);
  });

  it("PUT por administrador grava e o GET seguinte devolve", async () => {
    const r = await ctx.chamar("/api/empresa", { metodo: "PUT", corpo: dados({ validadeOrcamentoDias: 15 }), cookie: ctx.admin });
    expect(r.status).toBe(200);
    const depois = await (await ctx.chamar("/api/empresa", { cookie: mecanico })).json();
    expect(depois).toMatchObject({ nomeFantasia: "Auto Silva", validadeOrcamentoDias: 15 });
  });

  it("logo de 600 KB → 400 com mensagem de tamanho", async () => {
    const r = await ctx.chamar("/api/empresa", { metodo: "PUT", corpo: dados({ logo: "a".repeat(600_000) }), cookie: ctx.admin });
    expect(r.status).toBe(400);
    expect((await r.json()).campos.logo).toMatch(/grande demais/);
  });

  it("validade 0 → 400 com campo", async () => {
    const r = await ctx.chamar("/api/empresa", { metodo: "PUT", corpo: dados({ validadeOrcamentoDias: 0 }), cookie: ctx.admin });
    expect(r.status).toBe(400);
    expect((await r.json()).campos.validadeOrcamentoDias).toBeDefined();
  });
});
