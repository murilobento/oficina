import { useEffect, useState } from "react";

import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Sidebar, SidebarContent, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { LogoEmpresa } from "@/features/empresa/logo-empresa";
import { useEmpresa } from "@/features/empresa/api";
import { useModulosPermitidos } from "@/navigation/acesso";
import { findModuleByPath, type NavModule } from "@/navigation/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { useSessao } from "@/features/auth/sessao";
import { NavPainel } from "./nav-main";
import { NavUser } from "./nav-user";

// Funcionário de exemplo enquanto o login não está ativo (VITE_LOGIN_ATIVO).
const USUARIO_EXEMPLO = { name: "Funcionário de exemplo", email: "login ainda não ativado" };

const MODULO_VAZIO: NavModule = { id: "vazio", title: "Menu", icon: Home, groups: [] };

/**
 * Menu em dois níveis: faixa de ícones (com o nome curto embaixo) à esquerda e,
 * à direita, o painel com os itens do módulo escolhido.
 * O botão da barra superior recolhe o painel; a faixa continua visível.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const variant = usePreferencesStore(useShallow((s) => s.values.sidebar_variant));
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();
  const empresa = useEmpresa();
  const eu = useSessao((estado) => estado.eu);
  const { setOpen, setOpenMobile } = useSidebar();
  const modulos = useModulosPermitidos();
  const primeiroComPainel = modulos.find((module) => module.groups) ?? MODULO_VAZIO;

  // O painel mostra o módulo clicado; ao trocar de tela, volta a mostrar o módulo da tela atual.
  const moduloDaRota = findModuleByPath(pathname, modulos);
  const [escolha, setEscolha] = useState<{ modulo: NavModule; rota: string } | null>(null);
  const moduloAberto =
    escolha && escolha.rota === pathname
      ? escolha.modulo
      : (moduloDaRota ?? escolha?.modulo ?? primeiroComPainel);

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
    escolhaValida?.id ?? modulos.find((modulo) => modulo.url === pathname)?.id ?? moduloDaRota?.id;

  return (
    <Sidebar
      {...props}
      variant={variant}
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
    >
      {/* Faixa: logo, um botão por módulo e, no pé, o usuário */}
      <nav
        aria-label="Módulos"
        className="flex w-[calc(var(--sidebar-width-icon)+1px)] shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar"
      >
        <Link to="/" title={empresa.nomeFantasia} className="flex h-12 w-full shrink-0 items-center justify-center">
          <LogoEmpresa className="size-8" />
        </Link>
        <ul className="flex w-full flex-1 flex-col gap-1 overflow-y-auto px-1 py-2">
          {modulos.map((modulo) => (
            <li key={modulo.id}>
              <BotaoModulo modulo={modulo} ativo={modulo.id === moduloMarcadoId} aoClicar={() => aoEscolherModulo(modulo)} />
            </li>
          ))}
        </ul>
        <div className="flex w-full shrink-0 justify-center py-3">
          <NavUser user={eu ? { name: eu.nome, email: eu.email } : USUARIO_EXEMPLO} />
        </div>
      </nav>

      {/* Painel: itens do módulo escolhido */}
      <Sidebar collapsible="none" className="min-w-0 flex-1">
        {/* h-12 = mesma altura da barra superior, para as duas linhas de borda se encontrarem. */}
        <SidebarHeader className="h-12 shrink-0 justify-center border-b px-4 py-0">
          <h2 className="text-base leading-tight font-semibold">{moduloAberto.title}</h2>
        </SidebarHeader>
        <SidebarContent className="py-1">
          <NavPainel key={moduloAberto.id} module={moduloAberto} />
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  );
}

function BotaoModulo({
  modulo,
  ativo,
  aoClicar,
}: {
  readonly modulo: NavModule;
  readonly ativo: boolean;
  readonly aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      data-ativo={ativo}
      aria-current={ativo ? "page" : undefined}
      title={modulo.title}
      className="group/modulo flex w-full flex-col items-center gap-1 rounded-lg py-1.5 outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <span className="flex h-8 w-11 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors group-hover/modulo:bg-sidebar-accent group-hover/modulo:text-sidebar-accent-foreground group-data-[ativo=true]/modulo:bg-sidebar-accent group-data-[ativo=true]/modulo:text-sidebar-accent-foreground">
        <modulo.icon className="size-[18px]" />
      </span>
      <span className="text-[11px] leading-none font-medium text-sidebar-foreground/70 group-data-[ativo=true]/modulo:text-sidebar-foreground">
        {modulo.rotulo ?? modulo.title}
      </span>
    </button>
  );
}
