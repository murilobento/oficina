import type { ColumnDef } from "@tanstack/react-table";
import { KeyRound, MoreHorizontal, Pencil, UserCheck, UserX } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { cn, getInitials } from "@/lib/utils";

import {
  formatarData,
  formatarDataHora,
  perfilPorId,
  statusDoUsuario,
  statusMeta,
  type Usuario,
  type UsuarioStatus,
} from "./data";

export type AcoesUsuario = {
  aoEditar: (usuario: Usuario) => void;
  aoRedefinirSenha: (usuario: Usuario) => void;
  aoAlternarAtivo: (usuario: Usuario) => void;
};

function StatusBadge({ status }: { status: UsuarioStatus }) {
  const meta = statusMeta[status];
  return (
    <Badge className={cn("gap-1.5 border px-2 py-1 font-medium", meta.badgeClass)} variant="outline">
      <span className={cn("size-1.5 rounded-full", meta.dotClass)} />
      {status}
    </Badge>
  );
}

export function criarColunasUsuarios(acoes: AcoesUsuario): ColumnDef<DataTableFeatures, Usuario>[] {
  return [
    {
      // Coluna oculta: junta nome e e-mail para a busca da barra superior do card.
      id: "busca",
      accessorFn: (row) => `${row.nome} ${row.email}`,
      filterFn: "includesString",
      enableHiding: true,
    },
    {
      accessorKey: "nome",
      header: "Usuário",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar size="lg" className={cn("font-medium", !row.original.ativo && "opacity-50")}>
            <AvatarFallback>{getInitials(row.original.nome)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-foreground truncate text-sm font-medium">{row.original.nome}</div>
            <div className="text-muted-foreground truncate text-sm">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      id: "perfil",
      accessorFn: (row) => perfilPorId(row.perfilId)?.nome ?? "",
      header: "Perfil",
      filterFn: "equalsString",
      cell: ({ getValue }) => <span className="text-sm whitespace-nowrap">{getValue<string>()}</span>,
    },
    {
      id: "status",
      accessorFn: (row) => statusDoUsuario(row),
      header: "Situação",
      filterFn: "equalsString",
      cell: ({ getValue }) => <StatusBadge status={getValue<UsuarioStatus>()} />,
    },
    {
      id: "ultimoAcesso",
      accessorFn: (row) => (row.ultimoAcesso ? new Date(row.ultimoAcesso).getTime() : 0),
      header: "Último acesso",
      cell: ({ row }) => (
        <span className={cn("text-sm whitespace-nowrap", !row.original.ultimoAcesso && "text-muted-foreground")}>
          {formatarDataHora(row.original.ultimoAcesso)}
        </span>
      ),
    },
    {
      id: "criadoEm",
      accessorFn: (row) => new Date(row.criadoEm).getTime(),
      header: "Cadastro",
      cell: ({ row }) => <span className="text-sm whitespace-nowrap">{formatarData(row.original.criadoEm)}</span>,
    },
    {
      id: "acoes",
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => {
        const usuario = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`Ações para ${usuario.nome}`}
                  className="text-muted-foreground hover:bg-muted/50 size-8 rounded-md"
                  size="icon-sm"
                  variant="ghost"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => acoes.aoEditar(usuario)}>
                  <Pencil /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!usuario.ativo} onSelect={() => acoes.aoRedefinirSenha(usuario)}>
                  <KeyRound /> Redefinir senha
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {usuario.ativo ? (
                  <DropdownMenuItem variant="destructive" onSelect={() => acoes.aoAlternarAtivo(usuario)}>
                    <UserX /> Desativar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => acoes.aoAlternarAtivo(usuario)}>
                    <UserCheck /> Reativar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enableHiding: false,
      enableSorting: false,
    },
  ];
}
