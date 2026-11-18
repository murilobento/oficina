import { describe, expect, it } from "vitest";

import { resumoDoDia } from "./resumo";

const item = (quantidade: number, valor: number) => ({ id: "i", tipo: "produto" as const, origemId: "", descricao: "x", unidade: "un", quantidade, valor });
const hoje = new Date("2026-11-18T15:00:00");

describe("resumoDoDia", () => {
  it("conta orçamentos abertos (rascunho/enviado dentro da validade)", () => {
    const r = resumoDoDia(
      {
        orcamentos: [
          { status: "enviado", criadoEm: "2026-11-17T10:00:00", validadeDias: 7 },
          { status: "rascunho", criadoEm: "2026-10-01T10:00:00", validadeDias: 7 },
          { status: "aprovado", criadoEm: "2026-11-17T10:00:00", validadeDias: 7 },
        ],
        vendas: [],
        produtos: [],
      },
      hoje,
    );
    expect(r.orcamentosAbertos).toBe(1);
  });

  it("soma só vendas concluídas de hoje", () => {
    const base = { descontoTipo: "valor" as const, desconto: 0 };
    const r = resumoDoDia(
      {
        orcamentos: [],
        vendas: [
          { ...base, status: "concluida", criadoEm: "2026-11-18T09:00:00", itens: [item(2, 5000)] },
          { ...base, status: "cancelada", criadoEm: "2026-11-18T09:30:00", itens: [item(1, 9999)] },
          { ...base, status: "concluida", criadoEm: "2026-11-17T09:00:00", itens: [item(1, 7000)] },
        ],
        produtos: [],
      },
      hoje,
    );
    expect(r.vendasHoje).toBe(1);
    expect(r.totalVendidoHoje).toBe(10000);
  });

  it("lista produtos ativos com estoque no mínimo ou abaixo, do mais crítico ao menos", () => {
    const r = resumoDoDia(
      {
        orcamentos: [],
        vendas: [],
        produtos: [
          { id: "a", descricao: "A", codigo: "A", ativo: true, saldo: 3, estoqueMinimo: 4 },
          { id: "b", descricao: "B", codigo: "B", ativo: true, saldo: 0, estoqueMinimo: 4 },
          { id: "c", descricao: "C", codigo: "C", ativo: true, saldo: 10, estoqueMinimo: 4 },
          { id: "d", descricao: "D", codigo: "D", ativo: false, saldo: 0, estoqueMinimo: 4 },
          { id: "e", descricao: "E", codigo: "E", ativo: true, saldo: 0, estoqueMinimo: 0 },
        ],
      },
      hoje,
    );
    expect(r.abaixoDoMinimo.map((p) => p.id)).toEqual(["b", "a"]);
  });
});
