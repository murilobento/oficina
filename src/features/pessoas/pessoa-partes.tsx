import { Car, Check, Eye, MoreHorizontal, Pause, Pencil, Trash2, UserCheck, UserX } from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { EntidadeConfig } from "./entidades";
import type { Pessoa } from "./tipos";

export type AcoesPessoaProps = {
  aoVisualizar: (pessoa: Pessoa) => void;
  aoEditar: (pessoa: Pessoa) => void;
  aoAlternarAtivo: (pessoa: Pessoa) => void;
  aoExcluir: (pessoa: Pessoa) => void;
  /** Só clientes: abre o cadastro de veículo já com este cliente. Ausente = sem o item. */
  aoAdicionarVeiculo?: (pessoa: Pessoa) => void;
};

export function StatusBadge({ ativo }: { ativo: boolean }) {
  return ativo ? <FitaStatus tom="ok" icone={Check}>Ativo</FitaStatus> : <FitaStatus tom="neutro" icone={Pause}>Inativo</FitaStatus>;
}

/** Menu de ações rápidas de um cadastro, usado na tabela e nos cartões da listagem. */
export function AcoesPessoa({
  pessoa,
  aoVisualizar,
  aoEditar,
  aoAlternarAtivo,
  aoExcluir,
  aoAdicionarVeiculo,
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
        {aoAdicionarVeiculo && (
          <DropdownMenuItem onSelect={() => aoAdicionarVeiculo(pessoa)}>
            <Car /> Adicionar veículo
          </DropdownMenuItem>
        )}
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
  /** Pode ser assíncrono: o botão mostra o spinner e o diálogo espera terminar. */
  aoConfirmar: () => Promise<unknown> | void;
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
          <AlertDialogAction variant="destructive" aoConfirmar={aoConfirmar}>
            Excluir {config.singular}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
