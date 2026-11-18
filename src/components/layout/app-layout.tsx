import type { CSSProperties, ReactNode } from "react";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getClientCookie } from "@/lib/cookie.client";
import { cn } from "@/lib/utils";

import { AppSidebar } from "./app-sidebar";
import { LayoutControls } from "./layout-controls";
import { SearchDialog } from "./search-dialog";
import { BotaoTelaCheia } from "./tela-cheia";

/**
 * Casca das telas internas: menu lateral, barra superior e área de conteúdo.
 * Layout portado do template Studio Admin (MIT) — ver LICENSE-studio-admin.txt.
 */
export function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  // O componente Sidebar grava este cookie sempre que o menu é aberto ou recolhido.
  const defaultOpen = getClientCookie("sidebar_state") !== "false";

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{ "--sidebar-width": "calc(var(--spacing) * 60)" } as CSSProperties}
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
            "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
            "[html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:backdrop-blur-md",
          )}
        >
          <div className="flex w-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-2 max-md:size-11 md:-ml-1" />
              <Separator
                orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
              />
              <SearchDialog />
            </div>
            <div className="flex items-center gap-2">
              <BotaoTelaCheia />
              <LayoutControls />
            </div>
          </div>
        </header>
        {/* Uma tela pode usar data-content-padding="false" para ocupar a área inteira. */}
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 has-data-[content-padding=false]:p-0 md:p-6 md:has-data-[content-padding=false]:p-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
