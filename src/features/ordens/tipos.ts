import { CircleCheck, CircleDashed, Clock, Ban, PackageSearch, Wrench, Truck, type LucideIcon } from "lucide-react";

import type { TomStatus } from "@/components/marca/fita-status";
import { calcularTotais } from "@/features/orcamentos/calculo";

export type StatusOrdem = "fila" | "execucao" | "aguardando_peca" | "pronto" | "entregue" | "cancelada";
export type SituacaoItem = "aprovado" | "pendente" | "recusado";

export type ItemOrdem = {
  id: string;
  tipo: "produto" | "servico";
  origemId: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  /** Centavos (0 para quem não vê valores). */
  valor: number;
  situacao: SituacaoItem;
  criadoPor: string;
};

export type EventoOrdem = { texto: string; quem: string; criadoEm: string };

export type Ordem = {
  id: string;
  /** OS-0001 */
  numero: string;
  clienteId: string;
  veiculoId: string;
  km: number;
  problema: string;
  laudo: string;
  status: StatusOrdem;
  orcamentoId: string;
  vendaId: string;
  descontoTipo: "valor" | "percentual";
  desconto: number;
  criadoEm: string;
  atualizadoEm: string;
  entregueEm: string | null;
  itens: ItemOrdem[];
  eventos: EventoOrdem[];
};

/** Etapas do pátio, na ordem em que o carro anda. */
export const ETAPAS: { status: StatusOrdem; texto: string; tom: TomStatus; icone: LucideIcon }[] = [
  { status: "fila", texto: "Na fila", tom: "neutro", icone: CircleDashed },
  { status: "execucao", texto: "Em execução", tom: "info", icone: Wrench },
  { status: "aguardando_peca", texto: "Aguardando peça", tom: "atencao", icone: PackageSearch },
  { status: "pronto", texto: "Pronto", tom: "ok", icone: CircleCheck },
];
export const FINAIS: { status: StatusOrdem; texto: string; tom: TomStatus; icone: LucideIcon }[] = [
  { status: "entregue", texto: "Entregue", tom: "neutro", icone: Truck },
  { status: "cancelada", texto: "Cancelada", tom: "erro", icone: Ban },
];
export const infoStatus = (status: StatusOrdem) => [...ETAPAS, ...FINAIS].find((e) => e.status === status) ?? { status, texto: status, tom: "neutro" as TomStatus, icone: Clock };

export const noPatio = (ordem: Pick<Ordem, "status">) => ordem.status !== "entregue" && ordem.status !== "cancelada";

/** Totais só com os itens aprovados (o que vai para a venda) e o desconto do orçamento. */
export function totaisDaOrdem(ordem: Pick<Ordem, "itens" | "descontoTipo" | "desconto">) {
  return calcularTotais(ordem.itens.filter((i) => i.situacao === "aprovado"), ordem.descontoTipo, ordem.desconto);
}

/** "há 15 min", "há 3 h", "há 2 dias". */
export function tempoDesde(iso: string, agora = new Date()): string {
  const minutos = Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / 60000));
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

/** Quantas OS no pátio em cada etapa (para o card "No pátio" e os filtros). */
export function contarPorEtapa(ordens: Pick<Ordem, "status">[]): Record<StatusOrdem, number> {
  const contagem = { fila: 0, execucao: 0, aguardando_peca: 0, pronto: 0, entregue: 0, cancelada: 0 } as Record<StatusOrdem, number>;
  for (const o of ordens) contagem[o.status] += 1;
  return contagem;
}
