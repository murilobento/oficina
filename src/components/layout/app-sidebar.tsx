import { useEffect, useState } from "react";

import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogoEmpresa } from "@/features/empresa/logo-empresa";
import { useEmpresa } from "@/features/empresa/store";
import { findModuleByPath, type NavModule, navModules } from "@/navigation/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { useSessao } from "@/features/auth/sessao";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

// Funcionário de exemplo enquanto o login não está ativo (VITE_LOGIN_ATIVO).
const USUARIO_EXEMPLO = { name: "Funcionário de exemplo", email: "login ainda não ativado" };

const PRIMEIRO_MODULO_COM_PAINEL = navModules.find((module) => module.groups) as NavModule;

/**
 * Menu em dois níveis: faixa de ícones com os módulos à esquerda e,
 * à direita, o painel com os itens do módulo escolhido.
 * O botão da barra superior recolhe o painel; a faixa de ícones continua visível.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const variant = usePreferencesStore(useShallow((s) => s.values.sidebar_variant));
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();
  const empresa = useEmpresa();
  const eu = useSessao((estado) => estado.eu);
  const { setOpen, setOpenMobile } = useSidebar();

  // O painel mostra o módulo clicado; ao trocar de tela, volta a mostrar o módulo da tela atual.
  const moduloDaRota = findModuleByPath(pathname);
  const [escolha, setEscolha] = useState<{ modulo: NavModule; rota: string } | null>(null);
  const moduloAberto =
    escolha && escolha.rota === pathname
      ? escolha.modulo
      : (moduloDaRota ?? escolha?.modulo ?? PRIMEIRO_MODULO_COM_PAINEL);

  // No celular o menu é uma gaveta: fecha sozinha ao trocar de tela.
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  const aoEscolherModulo = (modulo: NavModule) => {
    if (modulo.url) {
      void navigate({ to: modulo.url });
      setOpenMobile(false);
      return;
    }
    // Clicar num módulo sempre abre o painel; só o botão da barra superior recolhe.
    setEscolha({ modulo, rota: pathname });
    setOpen(true);
  };

  // Só um ícone fica marcado por vez: o módulo que o usuário acabou de abrir ou,
  // se ele não abriu nenhum nesta tela, o módulo da tela atual.
  const escolhaValida = escolha && escolha.rota === pathname ? escolha.modulo : undefined;
  const moduloMarcadoId =
    escolhaValida?.id ?? navModules.find((modulo) => modulo.url === pathname)?.id ?? moduloDaRota?.id;
  const estaAtivo = (modulo: NavModule) => modulo.id === moduloMarcadoId;

  return (
    <Sidebar
      {...props}
      variant={variant}
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
    >
      {/* Faixa de ícones: um por módulo */}
      <Sidebar collapsible="none" className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="md:h-8 md:p-0 group-data-[collapsible=icon]:p-0!" tooltip={empresa.nomeFantasia}>
                <Link to="/">
                  <LogoEmpresa className="size-8" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-0">
              <SidebarMenu>
                {navModules.map((modulo) => (
                  <SidebarMenuItem key={modulo.id}>
                    <SidebarMenuButton
                      tooltip={{ children: modulo.title, hidden: false }}
                      isActive={estaAtivo(modulo)}
                      onClick={() => aoEscolherModulo(modulo)}
                      aria-label={modulo.title}
                      className="px-2"
                    >
                      <modulo.icon />
                      <span className="sr-only">{modulo.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* Painel: itens do módulo escolhido */}
      <Sidebar collapsible="none" className="min-w-0 flex-1">
        {/* h-12 = mesma altura da barra superior, para as duas linhas de borda se encontrarem. */}
        <SidebarHeader className="h-12 shrink-0 justify-center border-b py-0">
          <div className="flex min-w-0 flex-col px-2 leading-tight">
            <span className="text-muted-foreground truncate text-xs">{empresa.nomeFantasia}</span>
            <span className="truncate text-base font-semibold">{moduloAberto.title}</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <NavMain key={moduloAberto.id} module={moduloAberto} />
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={eu ? { name: eu.nome, email: eu.email } : USUARIO_EXEMPLO} />
        </SidebarFooter>
      </Sidebar>
    </Sidebar>
  );
}
