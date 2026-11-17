import type { Orcamento } from "@/features/orcamentos/tipos";
import { totaisDoOrcamento } from "@/features/orcamentos/tipos";

export type ItemAplicado = {
  tipo: "produto" | "servico";
  descricao: string;
  vezes: number;
  ultimaData: string;
  ultimoKm: number;
};

export type PontoKm = {
  data: string;
  km: number;
  /** Diferença para a visita anterior; vazio na primeira. */
  delta: number | null;
  /** O km é menor que o da visita anterior (hodômetro trocado, digitação errada...). */
  queda: boolean;
};

export type HistoricoVeiculo = {
  /** Todos os orçamentos do carro, do mais recente para o mais antigo. */
  visitas: Orcamento[];
  /** Orçamentos aprovados ou que viraram OS: o que de fato foi feito no carro. */
  realizadas: number;
  totalGasto: number;
  ultimaVisita: string | null;
  ultimoKm: number;
  aplicados: ItemAplicado[];
  kmEvolucao: PontoKm[];
};

const porDataAsc = (a: Orcamento, b: Orcamento) => a.criadoEm.localeCompare(b.criadoEm);

/**
 * Histórico do carro a partir dos orçamentos. Só conta como feito o que foi aprovado ou virou OS;
 * quando as OS existirem, basta incluí-las na mesma lista de entrada.
 */
export function historicoDoVeiculo(orcamentos: Orcamento[], veiculoId: string): HistoricoVeiculo {
  const doCarro = orcamentos.filter((o) => o.veiculoId === veiculoId).sort(porDataAsc);
  const feitas = doCarro.filter((o) => o.status === "aprovado" || o.status === "convertido");

  const agrupados = new Map<string, ItemAplicado>();
  for (const orcamento of feitas) {
    for (const item of orcamento.itens) {
      const chave = `${item.tipo}|${item.descricao.trim().toUpperCase()}`;
      const atual = agrupados.get(chave);
      agrupados.set(chave, {
        tipo: item.tipo,
        descricao: item.descricao,
        vezes: (atual?.vezes ?? 0) + 1,
        ultimaData: orcamento.criadoEm,
        ultimoKm: orcamento.km > 0 ? orcamento.km : (atual?.ultimoKm ?? 0),
      });
    }
  }

  const kmEvolucao: PontoKm[] = [];
  for (const orcamento of feitas.filter((o) => o.km > 0)) {
    const anterior = kmEvolucao.at(-1);
    const delta = anterior ? orcamento.km - anterior.km : null;
    kmEvolucao.push({ data: orcamento.criadoEm, km: orcamento.km, delta, queda: delta !== null && delta < 0 });
  }

  const ultima = feitas.at(-1);
  return {
    visitas: [...doCarro].reverse(),
    realizadas: feitas.length,
    totalGasto: feitas.reduce((soma, o) => soma + totaisDoOrcamento(o).total, 0),
    ultimaVisita: ultima?.criadoEm ?? null,
    ultimoKm: kmEvolucao.at(-1)?.km ?? 0,
    aplicados: [...agrupados.values()].sort((a, b) => b.ultimaData.localeCompare(a.ultimaData)),
    kmEvolucao,
  };
}

/** Avisa (sem bloquear) quando o km digitado é menor que o da última visita. */
export function kmAbaixoDoUltimo(km: number, ultimoKm: number): boolean {
  return km > 0 && ultimoKm > 0 && km < ultimoKm;
}
