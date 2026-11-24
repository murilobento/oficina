import type { Context } from "hono";
import { describe, expect, it } from "vitest";

import { ipDe } from "./auditoria";

const contexto = (cabecalhos: Record<string, string>, socket?: string) =>
  ({
    req: { header: (nome: string) => cabecalhos[nome.toLowerCase()] },
    env: socket ? { incoming: { socket: { remoteAddress: socket } } } : undefined,
  }) as unknown as Context;

describe("ipDe", () => {
  it("na Vercel usa o x-real-ip", () => {
    expect(ipDe(contexto({ "x-real-ip": "200.1.2.3", "x-forwarded-for": "9.9.9.9" }))).toBe("200.1.2.3");
  });

  it("atrás do proxy do Vite usa o primeiro do x-forwarded-for", () => {
    expect(ipDe(contexto({ "x-forwarded-for": "192.168.0.15, 127.0.0.1" }, "::1"))).toBe("192.168.0.15");
  });

  it("sem proxy usa o socket e deixa o endereço legível", () => {
    expect(ipDe(contexto({}, "::ffff:192.168.0.20"))).toBe("192.168.0.20");
    expect(ipDe(contexto({}, "::1"))).toBe("127.0.0.1");
  });

  it("sem nenhuma informação fica vazio", () => {
    expect(ipDe(contexto({}))).toBeNull();
  });
});
