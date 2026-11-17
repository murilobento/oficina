import { movimentarItens } from "@/features/estoque/movimentar";
import { useOrcamentosStore } from "@/features/orcamentos/store";
import type { Orcamento } from "@/features/orcamentos/tipos";
import { subirKmDoVeiculo } from "@/features/veiculos/api";
import { proximoCodigo } from "@/lib/numeros";

import { useVendasStore } from "./store";
import type { Venda } from "./tipos";

type DadosVenda = Omit<Venda, "id" | "numero" | "status" | "criadoEm">;

/** Lança a venda e dá baixa no estoque dos produtos cadastrados. O km maior atualiza o veículo. */
export function registrarVenda(dados: DadosVenda): Venda {
  const vendas = useVendasStore.getState();
  const numero = proximoCodigo("VND", vendas.itens.map((item) => item.numero));
  const venda = vendas.adicionar({ ...dados, numero, status: "concluida" });
  movimentarItens(dados.itens, -1, { origem: "venda", documento: numero, motivo: "" });

  void subirKmDoVeiculo(dados.veiculoId, dados.km);
  return venda;
}

/** Orçamento aprovado vira venda: copia itens e desconto, e o orçamento passa a "Virou venda". */
export function gerarVendaDoOrcamento(orcamento: Orcamento, formaPagamento: string): Venda {
  const venda = registrarVenda({
    clienteId: orcamento.clienteId,
    veiculoId: orcamento.veiculoId,
    km: orcamento.km,
    orcamentoId: orcamento.id,
    itens: orcamento.itens,
    descontoTipo: orcamento.descontoTipo,
    desconto: orcamento.desconto,
    formaPagamento,
    observacoes: "",
  });
  useOrcamentosStore.getState().atualizar(orcamento.id, { status: "convertido" });
  return venda;
}

/** Cancela a venda, devolve as peças ao estoque e reabre o orçamento de origem como aprovado. */
export function cancelarVenda(venda: Venda): void {
  useVendasStore.getState().atualizar(venda.id, { status: "cancelada" });
  movimentarItens(venda.itens, 1, { origem: "venda", documento: venda.numero, motivo: "Cancelamento da venda" });
  if (venda.orcamentoId) {
    const orcamentos = useOrcamentosStore.getState();
    const origem = orcamentos.itens.find((item) => item.id === venda.orcamentoId);
    if (origem?.status === "convertido") orcamentos.atualizar(origem.id, { status: "aprovado" });
  }
}
