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
import { APP_CONFIG } from "@/config/app-config";
import { findModuleByPath, type NavModule, navModules } from "@/navigation/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

// Funcionário de exemplo até o login existir.
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
              <SidebarMenuButton asChild className="md:h-8 md:p-0 group-data-[collapsible=icon]:p-0!" tooltip={APP_CONFIG.name}>
                <Link to="/">
                  <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold">
                    OF
                  </span>
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
          <div className="flex items-center px-2 text-base font-semibold">{moduloAberto.title}</div>
        </SidebarHeader>
        <SidebarContent>
          <NavMain key={moduloAberto.id} module={moduloAberto} />
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={USUARIO_EXEMPLO} />
        </SidebarFooter>
      </Sidebar>
    </Sidebar>
  );
}
