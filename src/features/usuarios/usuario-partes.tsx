import { Ban, Check, KeyRound, type LucideIcon, MoreHorizontal, Pencil, UserCheck, UserX } from "lucide-react";

import { FitaStatus, type TomStatus } from "@/components/marca/fita-status";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Usuario } from "./api";
import type { UsuarioStatus } from "./data";

export type AcoesUsuarioProps = {
  aoEditar: (usuario: Usuario) => void;
  aoRedefinirSenha: (usuario: Usuario) => void;
  aoAlternarAtivo: (usuario: Usuario) => void;
};

const FITA_USUARIO: Record<UsuarioStatus, { tom: TomStatus; icone: LucideIcon }> = {
  Ativo: { tom: "ok", icone: Check },
  "Senha provisória": { tom: "atencao", icone: KeyRound },
  Desativado: { tom: "neutro", icone: Ban },
};

export function StatusBadge({ status }: { status: UsuarioStatus }) {
  const { tom, icone } = FITA_USUARIO[status];
  return (
    <FitaStatus tom={tom} icone={icone}>
      {status}
    </FitaStatus>
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
