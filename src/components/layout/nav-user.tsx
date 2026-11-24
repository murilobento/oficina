import { useState } from "react";

import { Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { LOGIN_ATIVO, useSessao } from "@/features/auth/sessao";
import { authClient } from "@/lib/auth-client";
import { getInitials } from "@/lib/utils";

import { ItemTema } from "./botao-tema";
import { InstalarAppItem, PassoAPassoIOS } from "./instalar-app";
import { ItemTelaCheia } from "./tela-cheia";

export function NavUser({
  user,
}: {
  readonly user: {
    readonly name: string;
    readonly email: string;
  };
}) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const [passosIOS, setPassosIOS] = useState(false);

  async function sair() {
    await authClient.signOut();
    useSessao.getState().limpar();
    await navigate({ to: "/login" });
  }

  return (
    <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Menu de ${user.name}`}
              title={user.name}
              className="rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[state=open]:ring-2 data-[state=open]:ring-sidebar-ring"
            >
              <Avatar className="size-9">
                <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-lg"
            side={isMobile ? "top" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="font-medium break-words">{user.name}</span>
                  <span className="text-muted-foreground text-xs break-all">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/trocar-senha">
                  <KeyRound />
                  Trocar senha
                </Link>
              </DropdownMenuItem>
              <InstalarAppItem aoMostrarPassos={() => setPassosIOS(true)} />
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <ItemTema />
              <ItemTelaCheia />
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {LOGIN_ATIVO ? (
              <DropdownMenuItem onSelect={() => void sair()}>
                <LogOut />
                Sair
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link to="/login">
                  <LogOut />
                  Sair
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <PassoAPassoIOS aberto={passosIOS} aoFechar={() => setPassosIOS(false)} />
    </>
  );
}
