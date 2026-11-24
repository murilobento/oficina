import type { CSSProperties, ReactNode } from "react";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getClientCookie } from "@/lib/cookie.client";
import { cn } from "@/lib/utils";

import { LogoEmpresa } from "@/features/empresa/logo-empresa";
import { useEmpresa } from "@/features/empresa/api";

import { AppSidebar } from "./app-sidebar";
import { BarraInferior } from "./barra-inferior";
import { SearchDialog } from "./search-dialog";

/**
 * Casca das telas internas: menu lateral, barra superior e área de conteúdo.
 * Layout portado do template Studio Admin (MIT) — ver LICENSE-studio-admin.txt.
 */
export function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const empresa = useEmpresa();
  // O componente Sidebar grava este cookie sempre que o menu é aberto ou recolhido.
  const defaultOpen = getClientCookie("sidebar_state") !== "false";

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{ "--sidebar-width": "20rem", "--sidebar-width-icon": "4.75rem" } as CSSProperties}
    >
      <AppSidebar />
      <SidebarInset
        className={cn(
          "[html[data-content-layout=centered]_&>*]:mx-auto",
          "[html[data-content-layout=centered]_&>*]:w-full",
          "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
          "peer-data-[variant=inset]:border",
          "[--dashboard-header-height:--spacing(12)]",
          "min-w-0 overflow-x-clip",
        )}
      >
        <header
          className={cn(
            "relative flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 backdrop-blur transition-[width,height] ease-linear md:h-12 group-has-data-[collapsible=icon]/sidebar-wrapper:md:h-12",
            "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit]",
          )}
        >
          {/* Celular: marca à esquerda, busca à direita. Computador: botão do menu e busca. Tema e tela cheia ficam no menu do usuário. */}
          <div className="flex w-full items-center justify-between gap-2 px-4 md:justify-start lg:px-6">
            <SidebarTrigger className="-ml-1 max-md:hidden" />
            <Separator
              orientation="vertical"
              className="mx-1 hidden data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center md:block"
            />
            <div className="flex min-w-0 items-center gap-2 md:hidden">
              <LogoEmpresa className="size-8" />
              <span className="max-w-[55vw] truncate text-base font-semibold">{empresa.nomeFantasia}</span>
            </div>
            <SearchDialog />
          </div>
        </header>
        {/* Uma tela pode usar data-content-padding="false" para ocupar a área inteira. */}
        <div className="min-h-0 min-w-0 flex-1 overflow-x-clip p-4 max-md:pb-[calc(6rem+env(safe-area-inset-bottom))] has-data-[content-padding=false]:p-0 md:p-6 md:has-data-[content-padding=false]:p-0">
          {children}
        </div>
        <BarraInferior />
      </SidebarInset>
    </SidebarProvider>
  );
}
