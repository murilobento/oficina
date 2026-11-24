import { Ban, CalendarClock, CircleCheck, UserX, type LucideIcon } from "lucide-react";

import type { TomStatus } from "@/components/marca/fita-status";
import { somarDias } from "@/features/vendas/parcelas";

export type StatusAgendamento = "agendado" | "chegou" | "faltou" | "cancelado";

export type Agendamento = {
  id: string;
  /** AAAA-MM-DD */
  data: string;
  /** HH:MM */
  hora: string;
  clienteId: string;
  veiculoId: string;
  servico: string;
  observacoes: string;
  status: StatusAgendamento;
  /** OS aberta na chegada (vazio enquanto não chegou). */
  ordemId: string;
  ordemNumero: string;
  criadoPor: string;
  criadoEm: string;
};

export type DadosAgendamento = Pick<Agendamento, "data" | "hora" | "clienteId" | "veiculoId" | "servico" | "observacoes">;

export const SITUACOES: Record<StatusAgendamento, { texto: string; tom: TomStatus; icone: LucideIcon }> = {
  agendado: { texto: "Agendado", tom: "info", icone: CalendarClock },
  chegou: { texto: "Chegou", tom: "ok", icone: CircleCheck },
  faltou: { texto: "Faltou", tom: "atencao", icone: UserX },
  cancelado: { texto: "Cancelado", tom: "neutro", icone: Ban },
};

/** Segunda-feira da semana da data (AAAA-MM-DD). */
export function inicioDaSemana(data: string): string {
  const [a, m, d] = data.split("-").map(Number);
  const diaDaSemana = new Date(Date.UTC(a, m - 1, d)).getUTCDay(); // 0 = domingo
  return somarDias(data, diaDaSemana === 0 ? -6 : 1 - diaDaSemana);
}

/** Os 7 dias da semana que começa em `segunda`. */
export const diasDaSemana = (segunda: string) => Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));

const comoData = (data: string) => {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(a, m - 1, d);
};

/** "ter" */
export const diaCurto = (data: string) => comoData(data).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
/** "terça-feira, 24/11" */
export const diaPorExtenso = (data: string) => comoData(data).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
/** "24/11" */
export const diaMes = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

/** Ordem do dia: hora e, empatando, quem foi marcado antes. */
export const porHorario = (a: Agendamento, b: Agendamento) => a.hora.localeCompare(b.hora) || a.criadoEm.localeCompare(b.criadoEm);
