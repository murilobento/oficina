import { afterEach, describe, expect, it, vi } from "vitest";

import { novoId } from "./id";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe("novoId", () => {
  it("gera UUID v4", () => {
    expect(novoId()).toMatch(UUID);
  });

  it("funciona sem crypto.randomUUID (acesso por http no IP da rede)", () => {
    vi.stubGlobal("crypto", { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
    const a = novoId();
    expect(a).toMatch(UUID);
    expect(novoId()).not.toBe(a);
  });
});
