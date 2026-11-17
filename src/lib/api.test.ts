import { afterEach, describe, expect, it, vi } from "vitest";

import { api, ApiErro } from "./api";

const resposta = (status: number, corpo?: unknown) =>
  new Response(corpo === undefined ? null : JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("api", () => {
  it("devolve o JSON em 200", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resposta(200, { ok: 1 })));
    expect(await api("/x")).toEqual({ ok: 1 });
  });

  it("lança ApiErro com status e campos em 400", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resposta(400, { erro: "Informe o nome.", campos: { nome: "Informe o nome." } })));
    const erro = await api("/x", { corpo: {} }).catch((e) => e);
    expect(erro).toBeInstanceOf(ApiErro);
    expect(erro).toMatchObject({ status: 400, message: "Informe o nome.", campos: { nome: "Informe o nome." } });
  });

  it("em 401 leva ao login", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { pathname: "/clientes", assign } });
    vi.stubGlobal("fetch", vi.fn(async () => resposta(401, { erro: "Entre no sistema para continuar." })));
    await expect(api("/x")).rejects.toMatchObject({ status: 401 });
    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("sem conexão vira ApiErro com mensagem amigável", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fail"); }));
    await expect(api("/x")).rejects.toMatchObject({ status: 0 });
  });
});
