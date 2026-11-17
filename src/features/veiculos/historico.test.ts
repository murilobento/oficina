import { describe, expect, it } from "vitest";

import type { ItemOrcamento, Orcamento } from "@/features/orcamentos/tipos";

import { historicoDoVeiculo, kmAbaixoDoUltimo } from "./historico";

function item(id: string, tipo: ItemOrcamento["tipo"], descricao: string, quantidade: number, valor: number): ItemOrcamento {
  return { id, tipo, origemId: "", descricao, unidade: "UN", quantidade, valor };
}

function orcamento(id: string, dados: Partial<Orcamento>): Orcamento {
  return {
    id,
    numero: id.toUpperCase(),
    clienteId: "c1",
    veiculoId: "v1",
    km: 0,
    problema: "",
    itens: [],
    descontoTipo: "percentual",
    desconto: 0,
    validadeDias: 7,
    observacoes: "",
    status: "aprovado",
    criadoEm: "2026-01-01T10:00:00.000Z",
    ...dados,
  };
}

const lista: Orcamento[] = [
  orcamento("o1", {
    km: 38500,
    criadoEm: "2026-06-10T10:00:00.000Z",
    status: "convertido",
    itens: [item("a", "servico", "Troca de pastilhas", 1, 10000), item("b", "produto", "Pastilha", 1, 15000)],
  }),
  orcamento("o2", {
    km: 45000,
    criadoEm: "2026-09-12T10:00:00.000Z",
    status: "aprovado",
    itens: [item("c", "servico", "Troca de óleo", 1, 6000), item("d", "produto", "Pastilha", 1, 15000)],
    desconto: 10,
  }),
  orcamento("o3", { km: 50000, criadoEm: "2026-11-01T10:00:00.000Z", status: "enviado", itens: [item("e", "servico", "Revisão", 1, 30000)] }),
  orcamento("o4", { km: 99999, status: "recusado", itens: [item("f", "servico", "Outro", 1, 1)] }),
  orcamento("o5", { veiculoId: "v2", km: 1, itens: [item("g", "servico", "De outro carro", 1, 5000)] }),
];

describe("historicoDoVeiculo", () => {
  const h = historicoDoVeiculo(lista, "v1");

  it("lista só os orçamentos do carro, do mais recente para o mais antigo", () => {
    expect(h.visitas.map((o) => o.id)).toEqual(["o3", "o2", "o1", "o4"]);
    expect(h.visitas.map((o) => o.id)).not.toContain("o5");
  });

  it("soma o gasto só de orçamentos aprovados ou que viraram OS, já com desconto", () => {
    // o1 = 25000; o2 = 21000 - 10% = 18900
    expect(h.totalGasto).toBe(43900);
    expect(h.realizadas).toBe(2);
  });

  it("informa a última visita realizada e o km dela", () => {
    expect(h.ultimaVisita).toBe("2026-09-12T10:00:00.000Z");
    expect(h.ultimoKm).toBe(45000);
  });

  it("agrupa o que já foi aplicado, contando as vezes e guardando a última data e km", () => {
    const pastilha = h.aplicados.find((a) => a.descricao === "Pastilha");
    expect(pastilha).toMatchObject({ tipo: "produto", vezes: 2, ultimaData: "2026-09-12T10:00:00.000Z", ultimoKm: 45000 });
    expect(h.aplicados.map((a) => a.descricao)).not.toContain("Revisão");
    expect(h.aplicados.map((a) => a.descricao)).not.toContain("De outro carro");
  });

  it("monta a evolução do km com a diferença entre visitas e avisa quando o km cai", () => {
    const comQueda = historicoDoVeiculo(
      [...lista, orcamento("o6", { km: 40000, criadoEm: "2026-10-01T10:00:00.000Z", itens: [item("h", "servico", "X", 1, 100)] })],
      "v1",
    );
    expect(h.kmEvolucao.map((p) => [p.km, p.delta, p.queda])).toEqual([
      [38500, null, false],
      [45000, 6500, false],
    ]);
    expect(comQueda.kmEvolucao.map((p) => [p.km, p.delta, p.queda])).toEqual([
      [38500, null, false],
      [45000, 6500, false],
      [40000, -5000, true],
    ]);
  });

  it("carro sem histórico devolve tudo zerado", () => {
    expect(historicoDoVeiculo(lista, "nenhum")).toMatchObject({ visitas: [], totalGasto: 0, ultimaVisita: null, ultimoKm: 0, aplicados: [], kmEvolucao: [] });
  });
});

describe("kmAbaixoDoUltimo", () => {
  it("só avisa quando há km informado e ele é menor que o da última visita", () => {
    expect(kmAbaixoDoUltimo(40000, 45000)).toBe(true);
    expect(kmAbaixoDoUltimo(45000, 45000)).toBe(false);
    expect(kmAbaixoDoUltimo(0, 45000)).toBe(false);
    expect(kmAbaixoDoUltimo(40000, 0)).toBe(false);
  });
});
