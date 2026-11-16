import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { isSamePath, type NavGroup, type NavItem, type NavModule } from "@/navigation/sidebar-items";

/** Painel da direita: os grupos e itens do módulo escolhido na faixa de ícones. */
export function NavMain({ module }: { readonly module: NavModule }) {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {module.groups?.map((group) =>
            group.title ? (
              <NavGroupItem key={group.id} group={group} pathname={pathname} />
            ) : (
              // Grupo sem título: os itens aparecem direto, sem abrir e fechar.
              group.items.map((item) => <NavFlatItem key={item.id} item={item} pathname={pathname} />)
            ),
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function NavGroupItem({ group, pathname }: { readonly group: NavGroup; readonly pathname: string }) {
  // Os grupos começam fechados e abrem ao clicar. A exceção é o grupo da tela atual,
  // que já vem aberto (inclusive ao recarregar a página).
  const contemTelaAtual = group.items.some((item) => item.url && isSamePath(item.url, pathname));

  return (
    <Collapsible asChild defaultOpen={contemTelaAtual} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="font-medium">
            <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            <span>{group.title}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {group.items.map((item) => (
              <NavLeaf key={item.id} item={item} pathname={pathname} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function NavFlatItem({ item, pathname }: { readonly item: NavItem; readonly pathname: string }) {
  if (!item.url) {
    return (
      <SidebarMenuItem>
        {/* Tela ainda não construída: aparece apagada e não é clicável. */}
        <SidebarMenuButton aria-disabled title={`${item.title} (em breve)`}>
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isSamePath(item.url, pathname)}>
        <Link to={item.url}>
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavLeaf({ item, pathname }: { readonly item: NavItem; readonly pathname: string }) {
  if (!item.url) {
    return (
      <SidebarMenuSubItem>
        {/* Tela ainda não construída: aparece apagada e não é clicável. */}
        <SidebarMenuSubButton aria-disabled title={`${item.title} (em breve)`}>
          <span>{item.title}</span>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={isSamePath(item.url, pathname)}>
        <Link to={item.url}>
          <span>{item.title}</span>
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}
