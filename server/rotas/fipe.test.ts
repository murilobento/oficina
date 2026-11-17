import { describe, expect, it, vi } from "vitest";

import { ErroApi } from "./util";
import { criarClienteFipe, normalizarLista } from "./fipe";

const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });

describe("normalizarLista", () => {
  it("aceita {nome, valor} (marcas) e {modelo, valor} (modelos), ordena e descarta lixo", () => {
    const lista = normalizarLista([{ nome: "Volkswagen", valor: "59" }, { modelo: "Gol 1.0", valor: "5940" }, { nome: "", valor: "1" }, null, { nome: "Fiat", valor: 21 }]);
    expect(lista).toEqual([
      { codigo: "21", nome: "Fiat" },
      { codigo: "5940", nome: "Gol 1.0" },
      { codigo: "59", nome: "Volkswagen" },
    ]);
  });
  it("resposta que não é lista vira lista vazia", () => {
    expect(normalizarLista({ message: "erro" })).toEqual([]);
  });
});

describe("criarClienteFipe", () => {
  it("chama a BrasilAPI e guarda em cache (segunda chamada não vai à rede)", async () => {
    const buscar = vi.fn(async (_url: string) => resposta([{ nome: "Fiat", valor: "21" }]));
    const fipe = criarClienteFipe(buscar as unknown as typeof fetch);
    expect(await fipe.marcas()).toEqual([{ codigo: "21", nome: "Fiat" }]);
    await fipe.marcas();
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(String(buscar.mock.calls[0][0])).toBe("https://brasilapi.com.br/api/fipe/marcas/v1/carros");
  });

  it("modelos usam o código da marca na URL", async () => {
    const buscar = vi.fn(async (_url: string) => resposta([{ modelo: "HB20 1.0 Comfort 12V Flex", valor: "9" }]));
    const fipe = criarClienteFipe(buscar as unknown as typeof fetch);
    expect((await fipe.modelos("26"))[0].nome).toBe("HB20 1.0 Comfort 12V Flex");
    expect(String(buscar.mock.calls[0][0])).toBe("https://brasilapi.com.br/api/fipe/veiculos/v1/carros/26");
  });

  it("falha da BrasilAPI vira ErroApi 502 com mensagem em português e não fica em cache", async () => {
    let falhar = true;
    const buscar = vi.fn(async (_url: string) => (falhar ? resposta({ message: "x" }, 500) : resposta([{ nome: "Fiat", valor: "21" }])));
    const fipe = criarClienteFipe(buscar as unknown as typeof fetch);
    const erro = await fipe.marcas().catch((e) => e);
    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro).toMatchObject({ status: 502 });
    falhar = false;
    expect(await fipe.marcas()).toHaveLength(1);
  });

  it("rede fora do ar também vira 502", async () => {
    const fipe = criarClienteFipe((async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch);
    await expect(fipe.marcas()).rejects.toMatchObject({ status: 502 });
  });
});

describe("rotas /api/fipe", () => {
  it("exigem login e permissão; devolvem a lista; marca inválida → 400; falha externa → 502", async () => {
    const { iniciarAppDeTeste } = await import("../teste-util");
    let ok = true;
    const buscar = (async () => (ok ? resposta([{ nome: "Fiat", valor: "21" }]) : resposta({}, 500))) as unknown as typeof fetch;
    const ctx = await iniciarAppDeTeste({ buscar });
    try {
      expect((await ctx.chamar("/api/fipe/marcas")).status).toBe(401);
      const r = await ctx.chamar("/api/fipe/marcas", { cookie: ctx.admin });
      expect(await r.json()).toEqual([{ codigo: "21", nome: "Fiat" }]);
      expect((await ctx.chamar("/api/fipe/modelos?marca=abc", { cookie: ctx.admin })).status).toBe(400);
      ok = false;
      const falha = await ctx.chamar("/api/fipe/modelos?marca=21", { cookie: ctx.admin });
      expect(falha.status).toBe(502);
      expect((await falha.json()).erro).toMatch(/Digite/);
    } finally {
      await ctx.fechar();
    }
  }, 60_000);
});
