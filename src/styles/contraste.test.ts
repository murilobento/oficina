/// <reference types="node" />
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

// Lê as cores OKLCH de globals.css e confere o contraste (WCAG) do tema: texto ≥ 4.5:1, bordas de UI ≥ 3:1.

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

function bloco(seletor: string): Record<string, [number, number, number]> {
  const inicio = css.indexOf(`\n${seletor} {`);
  const fim = css.indexOf("\n}", inicio);
  const vars: Record<string, [number, number, number]> = {};
  for (const m of css.slice(inicio, fim).matchAll(/--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g)) vars[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  return vars;
}

function luminancia([L, C, h]: [number, number, number]): number {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const [r, g, bl] = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((x) => Math.min(1, Math.max(0, x)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

function contraste(a: [number, number, number], b: [number, number, number]): number {
  const [x, y] = [luminancia(a), luminancia(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe.each([
  ["claro", ":root"],
  ["escuro", ".dark"],
])("contraste do tema %s", (_nome, seletor) => {
  const v = bloco(seletor);
  const par = (a: string, b: string) => contraste(v[a], v[b]);

  it("texto principal e secundário legíveis no fundo e no cartão", () => {
    expect(par("foreground", "background")).toBeGreaterThanOrEqual(4.5);
    expect(par("muted-foreground", "background")).toBeGreaterThanOrEqual(4.5);
    expect(par("muted-foreground", "card")).toBeGreaterThanOrEqual(4.5);
  });

  it("botão principal (sinal) tem texto legível", () => {
    expect(par("primary-foreground", "primary")).toBeGreaterThanOrEqual(4.5);
  });

  it("borda de campo tem 3:1 contra o cartão", () => {
    expect(par("input", "card")).toBeGreaterThanOrEqual(3);
  });

  it("estados (ok, atenção, erro, info) legíveis no cartão", () => {
    for (const estado of ["ok", "atencao", "erro", "info"]) expect(par(estado, "card"), estado).toBeGreaterThanOrEqual(4.5);
  });

  it("menu lateral legível", () => {
    expect(par("sidebar-foreground", "sidebar")).toBeGreaterThanOrEqual(4.5);
    expect(par("sidebar-primary", "sidebar")).toBeGreaterThanOrEqual(3);
  });
});

describe("o sinal amarelo", () => {
  it("o texto sinal-forte no fundo claro passa 4.5:1", () => {
    const v = bloco(":root");
    expect(contraste(v["sinal-forte"], v["card"])).toBeGreaterThanOrEqual(4.5);
  });
});
