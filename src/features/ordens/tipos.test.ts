import { describe, expect, it } from "vitest";

import { contarPorEtapa, tempoDesde, totaisDaOrdem } from "./tipos";

describe("ordens", () => {
  it("total só com itens aprovados", () => {
    const item = (valor: number, situacao: "aprovado" | "pendente" | "recusado") => ({ id: "i", tipo: "servico" as const, origemId: "", descricao: "x", unidade: "UN", quantidade: 1, valor, situacao, criadoPor: "" });
    expect(totaisDaOrdem({ itens: [item(10000, "aprovado"), item(5000, "pendente"), item(3000, "recusado")], descontoTipo: "valor", desconto: 1000 }).total).toBe(9000);
  });

  it("tempo desde a entrada", () => {
    const agora = new Date("2026-11-19T12:00:00Z");
    expect(tempoDesde("2026-11-19T11:45:00Z", agora)).toBe("há 15 min");
    expect(tempoDesde("2026-11-19T09:00:00Z", agora)).toBe("há 3 h");
    expect(tempoDesde("2026-11-18T09:00:00Z", agora)).toBe("há 1 dia");
  });

  it("conta por etapa", () => {
    expect(contarPorEtapa([{ status: "fila" }, { status: "fila" }, { status: "pronto" }])).toMatchObject({ fila: 2, pronto: 1, execucao: 0 });
  });
});
