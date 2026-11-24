import { Ban, Check, Eye, MoreHorizontal } from "lucide-react";

import { FitaStatus } from "@/components/marca/fita-status";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** Documentos de venda e compra: lançados já valendo, e só podem ser cancelados (não editados). */
export type StatusDocumento = "concluida" | "cancelada";

export const FILTRO_STATUS_DOCUMENTO = (concluida: string) => [
  { valor: "todos", texto: "Todos" },
  { valor: "concluida", texto: concluida },
  { valor: "cancelada", texto: "Cancelada" },
];

export function StatusDocumentoBadge({ status, concluida }: { status: StatusDocumento; concluida: string }) {
  return status === "concluida" ? (
    <FitaStatus tom="ok" icone={Check}>{concluida}</FitaStatus>
  ) : (
    <FitaStatus tom="erro" icone={Ban}>Cancelada</FitaStatus>
  );
}

/** Menu de ações rápidas da linha/cartão: visualizar e cancelar. */
export function AcoesDocumento<T extends { numero: string; status: StatusDocumento }>({
  item,
  aoVisualizar,
  aoCancelar,
}: {
  item: T;
  aoVisualizar: (item: T) => void;
  aoCancelar: (item: T) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={`Ações para ${item.numero}`} className="text-muted-foreground -my-1 shrink-0" size="icon" variant="ghost">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => aoVisualizar(item)}>
          <Eye /> Visualizar
        </DropdownMenuItem>
        {item.status === "concluida" && (
          <DropdownMenuItem variant="destructive" onSelect={() => aoCancelar(item)}>
            <Ban /> Cancelar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Confirmação de cancelamento. `numero` nulo = fechado. `consequencia` explica o que acontece com o estoque. */
export function ConfirmarCancelamento({
  numero,
  singular,
  consequencia,
  aoCancelar,
  aoConfirmar,
}: {
  numero: string | null;
  singular: string;
  consequencia: string;
  aoCancelar: () => void;
  /** Pode ser assíncrono: o botão mostra o spinner e o diálogo espera terminar. */
  aoConfirmar: () => Promise<unknown> | void;
}) {
  return (
    <AlertDialog open={numero !== null} onOpenChange={(aberto) => !aberto && aoCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar {singular} {numero}?</AlertDialogTitle>
          <AlertDialogDescription>{consequencia} O cancelamento não pode ser desfeito.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" aoConfirmar={aoConfirmar}>
            Cancelar {singular}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
