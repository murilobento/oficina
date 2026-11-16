import { Eye, MoreHorizontal, Pencil, Trash2, UserCheck, UserX } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import type { EntidadeConfig } from "./entidades";
import type { Pessoa } from "./tipos";

export type AcoesPessoaProps = {
  aoVisualizar: (pessoa: Pessoa) => void;
  aoEditar: (pessoa: Pessoa) => void;
  aoAlternarAtivo: (pessoa: Pessoa) => void;
  aoExcluir: (pessoa: Pessoa) => void;
};

export function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border px-2 py-1 font-medium",
        ativo
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <span className={cn("size-1.5 rounded-full", ativo ? "bg-emerald-500" : "bg-muted-foreground/60")} />
      {ativo ? "Ativo" : "Inativo"}
    </Badge>
  );
}

/** Menu de ações rápidas de um cadastro, usado na tabela e nos cartões da listagem. */
export function AcoesPessoa({
  pessoa,
  aoVisualizar,
  aoEditar,
  aoAlternarAtivo,
  aoExcluir,
}: { pessoa: Pessoa } & AcoesPessoaProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Ações para ${pessoa.nome}`}
          className="text-muted-foreground -my-1 shrink-0"
          size="icon"
          variant="ghost"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => aoVisualizar(pessoa)}>
          <Eye /> Visualizar
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => aoEditar(pessoa)}>
          <Pencil /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => aoAlternarAtivo(pessoa)}>
          {pessoa.ativo ? <UserX /> : <UserCheck />}
          {pessoa.ativo ? "Inativar" : "Ativar"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => aoExcluir(pessoa)}>
          <Trash2 /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Confirmação antes de excluir. `pessoa` nula = fechado. */
export function ConfirmarExclusao({
  config,
  pessoa,
  aoCancelar,
  aoConfirmar,
}: {
  config: EntidadeConfig;
  pessoa: Pessoa | null;
  aoCancelar: () => void;
  aoConfirmar: () => void;
}) {
  return (
    <AlertDialog open={pessoa !== null} onOpenChange={(aberto) => !aberto && aoCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {pessoa?.nome}?</AlertDialogTitle>
          <AlertDialogDescription>
            O cadastro deste {config.singular} será apagado e não poderá ser recuperado. Se a ideia é só deixar de
            usar, prefira inativar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={aoConfirmar}>
            Excluir {config.singular}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
