import { describe, expect, it } from "vitest";

import { EMPRESA_PADRAO } from "@/features/empresa/tipos";

import { gerarPdfOrcamento } from "./orcamento-pdf";
import type { Orcamento } from "./tipos";

const orcamento: Orcamento = {
  id: "o1", numero: "ORC-0042", clienteId: "c", veiculoId: "v", km: 48200, problema: "Barulho ao frear",
  itens: Array.from({ length: 40 }, (_, i) => ({ id: `i${i}`, tipo: i % 2 ? "servico" : "produto", origemId: "", descricao: `Item número ${i + 1}`, unidade: "UN", quantidade: 1.5, valor: 12345 })),
  descontoTipo: "percentual", desconto: 10, validadeDias: 7, observacoes: "Prazo: 1 dia útil.", status: "enviado", criadoEm: "2026-11-15T14:30:00.000Z",
};

describe("gerarPdfOrcamento", () => {
  it("gera um PDF válido, com várias páginas quando há muitos itens", async () => {
    const blob = await gerarPdfOrcamento({ orcamento, cliente: null, veiculo: null, empresa: { ...EMPRESA_PADRAO, nomeFantasia: "Oficina Teste", rodape: "Obrigado!" } });
    expect(blob.type).toBe("application/pdf");
    const texto = new TextDecoder("latin1").decode(await blob.arrayBuffer());
    expect(texto.startsWith("%PDF-")).toBe(true);
    expect((texto.match(/\/Type\s*\/Page\b/g) ?? []).length).toBeGreaterThan(1);
  });

  it("orçamento curto cabe numa página", async () => {
    const blob = await gerarPdfOrcamento({ orcamento: { ...orcamento, itens: orcamento.itens.slice(0, 2) }, cliente: null, veiculo: null, empresa: EMPRESA_PADRAO });
    const texto = new TextDecoder("latin1").decode(await blob.arrayBuffer());
    expect((texto.match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(1);
  });
});
