import { Eye, MoreHorizontal, Pencil, Printer, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

const COR_STATUS: Record<StatusExibido, string> = {
  rascunho: "border-border bg-muted text-muted-foreground",
  enviado: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  aprovado: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  recusado: "border-destructive/20 bg-destructive/10 text-destructive",
  convertido: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  vencido: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export function StatusOrcamentoBadge({ status }: { status: StatusExibido }) {
  return (
    <Badge variant="outline" className={cn("px-2 py-1 font-medium", COR_STATUS[status])}>
      {ROTULO_STATUS[status]}
    </Badge>
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
          <Printer /> Imprimir
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
        <dt className="font-semibold">Total</dt>
        <dd className="text-lg font-semibold tabular-nums">{formatarBRL(totais.total)}</dd>
      </div>
    </dl>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="tabular-nums">{valor}</dd>
    </div>
  );
}
