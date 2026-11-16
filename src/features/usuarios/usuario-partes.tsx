import { KeyRound, MoreHorizontal, Pencil, UserCheck, UserX } from "lucide-react";

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

import { statusMeta, type Usuario, type UsuarioStatus } from "./data";

export type AcoesUsuarioProps = {
  aoEditar: (usuario: Usuario) => void;
  aoRedefinirSenha: (usuario: Usuario) => void;
  aoAlternarAtivo: (usuario: Usuario) => void;
};

export function StatusBadge({ status }: { status: UsuarioStatus }) {
  const meta = statusMeta[status];
  return (
    <Badge className={cn("gap-1.5 border px-2 py-1 font-medium", meta.badgeClass)} variant="outline">
      <span className={cn("size-1.5 rounded-full", meta.dotClass)} />
      {status}
    </Badge>
  );
}

/** Menu de ações de um funcionário, usado na tabela e nos cartões da listagem. */
export function AcoesUsuario({
  usuario,
  aoEditar,
  aoRedefinirSenha,
  aoAlternarAtivo,
}: { usuario: Usuario } & AcoesUsuarioProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Ações para ${usuario.nome}`}
          className="text-muted-foreground -my-1 shrink-0"
          size="icon"
          variant="ghost"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => aoEditar(usuario)}>
          <Pencil /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!usuario.ativo} onSelect={() => aoRedefinirSenha(usuario)}>
          <KeyRound /> Redefinir senha
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {usuario.ativo ? (
          <DropdownMenuItem variant="destructive" onSelect={() => aoAlternarAtivo(usuario)}>
            <UserX /> Desativar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => aoAlternarAtivo(usuario)}>
            <UserCheck /> Reativar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
