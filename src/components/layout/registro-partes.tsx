import type { ReactNode } from "react";

import { Eye, MoreHorizontal, Pencil, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

import { RotuloSecao } from "@/components/marca/rotulo-secao";
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

// Peças comuns aos cadastros simples (produtos, serviços...): menu de ações, confirmação de
// exclusão e as seções dos painéis de formulário e de visualização.

export type AcoesRegistroProps<T> = {
  aoVisualizar: (item: T) => void;
  aoEditar: (item: T) => void;
  aoAlternarAtivo: (item: T) => void;
  aoExcluir: (item: T) => void;
};

export function AcoesRegistro<T extends { ativo: boolean }>({
  item,
  nome,
  aoVisualizar,
  aoEditar,
  aoAlternarAtivo,
  aoExcluir,
}: { item: T; nome: string } & AcoesRegistroProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={`Ações para ${nome}`} className="text-muted-foreground -my-1 shrink-0" size="icon" variant="ghost">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => aoVisualizar(item)}>
          <Eye /> Visualizar
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => aoEditar(item)}>
          <Pencil /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => aoAlternarAtivo(item)}>
          {item.ativo ? <ToggleLeft /> : <ToggleRight />}
          {item.ativo ? "Inativar" : "Ativar"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => aoExcluir(item)}>
          <Trash2 /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Confirmação antes de excluir. `nome` nulo = fechado. */
export function ConfirmarExclusaoRegistro({
  nome,
  singular,
  aoCancelar,
  aoConfirmar,
}: {
  nome: string | null;
  /** Ex.: "produto". */
  singular: string;
  aoCancelar: () => void;
  aoConfirmar: () => void;
}) {
  return (
    <AlertDialog open={nome !== null} onOpenChange={(aberto) => !aberto && aoCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {nome}?</AlertDialogTitle>
          <AlertDialogDescription>
            O cadastro deste {singular} será apagado e não poderá ser recuperado. Se a ideia é só deixar de usar,
            prefira inativar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={aoConfirmar}>
            Excluir {singular}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Seção de um formulário em painel lateral. */
export function SecaoFormulario({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <RotuloSecao>{titulo}</RotuloSecao>
        {descricao && <p className="text-muted-foreground text-sm">{descricao}</p>}
      </div>
      {children}
    </section>
  );
}

/** Seção de dados de um painel de visualização. */
export function SecaoDados({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <RotuloSecao>{titulo}</RotuloSecao>
      <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

export function Dado({ rotulo, children, largo }: { rotulo: string; children: ReactNode; largo?: boolean }) {
  const vazio = children === "" || children === null || children === undefined || children === false;
  return (
    <div className={largo ? "flex flex-col gap-0.5 sm:col-span-2" : "flex flex-col gap-0.5"}>
      <dt className="text-muted-foreground text-sm">{rotulo}</dt>
      <dd className={vazio ? "text-muted-foreground text-sm" : "text-sm break-words"}>
        {vazio ? "Não informado" : children}
      </dd>
    </div>
  );
}
