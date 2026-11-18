import { Check, Clock, Eye, type LucideIcon, MoreHorizontal, Pencil, Printer, ReceiptText, Send, Trash2, X } from "lucide-react";

import { FitaStatus, type TomStatus } from "@/components/marca/fita-status";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatarBRL } from "@/lib/numeros";
import { cn } from "@/lib/utils";

import type { Totais } from "./calculo";
import { type Orcamento, podeEditar, ROTULO_STATUS, type StatusExibido } from "./tipos";

const FITA: Record<StatusExibido, { tom: TomStatus; icone: LucideIcon }> = {
  rascunho: { tom: "neutro", icone: Pencil },
  enviado: { tom: "info", icone: Send },
  aprovado: { tom: "ok", icone: Check },
  recusado: { tom: "erro", icone: X },
  convertido: { tom: "sinal", icone: ReceiptText },
  vencido: { tom: "atencao", icone: Clock },
};

export function StatusOrcamentoBadge({ status }: { status: StatusExibido }) {
  const { tom, icone } = FITA[status];
  return (
    <FitaStatus tom={tom} icone={icone}>
      {ROTULO_STATUS[status]}
    </FitaStatus>
  );
}

export type AcoesOrcamentoProps = {
  aoVisualizar: (orcamento: Orcamento) => void;
  aoEditar: (orcamento: Orcamento) => void;
  aoImprimir: (orcamento: Orcamento) => void;
  aoExcluir: (orcamento: Orcamento) => void;
};

/** Menu de ações rápidas, usado na tabela e nos cartões. Mudar o status fica no painel de visualização. */
export function AcoesOrcamento({
  orcamento,
  aoVisualizar,
  aoEditar,
  aoImprimir,
  aoExcluir,
}: { orcamento: Orcamento } & AcoesOrcamentoProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Ações para ${orcamento.numero}`}
          className="text-muted-foreground -my-1 shrink-0"
          size="icon"
          variant="ghost"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => aoVisualizar(orcamento)}>
          <Eye /> Visualizar
        </DropdownMenuItem>
        {podeEditar(orcamento) && (
          <DropdownMenuItem onSelect={() => aoEditar(orcamento)}>
            <Pencil /> Editar
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => aoImprimir(orcamento)}>
          <Printer /> Gerar PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => aoExcluir(orcamento)}>
          <Trash2 /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Peças, mão de obra, desconto e total. Usado no formulário e na visualização. */
export function ResumoTotais({ totais, className }: { totais: Totais; className?: string }) {
  return (
    <dl className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <Linha rotulo="Peças" valor={formatarBRL(totais.pecas)} />
      <Linha rotulo="Mão de obra" valor={formatarBRL(totais.maoDeObra)} />
      {totais.desconto > 0 && <Linha rotulo="Desconto" valor={`− ${formatarBRL(totais.desconto)}`} />}
      <div className="mt-1 flex items-baseline justify-between gap-4 border-t pt-2">
        <dt className="font-display text-xs font-bold tracking-widest uppercase">Total</dt>
        <dd className="font-mono text-2xl font-bold tabular-nums">{formatarBRL(totais.total)}</dd>
      </div>
    </dl>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="font-mono tabular-nums">{valor}</dd>
    </div>
  );
}
