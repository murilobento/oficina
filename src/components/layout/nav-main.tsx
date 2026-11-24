import { Link, useLocation } from "@tanstack/react-router";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { isSamePath, type NavItem, type NavModule } from "@/navigation/sidebar-items";

// Os botões do menu cortam o texto por padrão; aqui ele quebra linha e o botão cresce junto.
const BOTAO_QUEBRA = "h-auto min-h-9 max-md:h-auto max-md:min-h-11 gap-2.5 py-2 [&_svg]:text-sidebar-foreground/60 data-[active=true]:[&_svg]:text-sidebar-accent-foreground";
const TEXTO_QUEBRA = "min-w-0 flex-1 break-words leading-snug";

/** Painel da direita: os grupos e itens do módulo escolhido na faixa de ícones. */
export function NavPainel({ module }: { readonly module: NavModule }) {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <>
      {module.groups?.map((grupo) => (
        <SidebarGroup key={grupo.id} className="py-1">
          {grupo.title && <SidebarGroupLabel>{grupo.title}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {grupo.items.map((item) => (
                <ItemPainel key={item.id} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function ItemPainel({ item, pathname }: { readonly item: NavItem; readonly pathname: string }) {
  const Icone = item.icon;

  if (!item.url) {
    return (
      <SidebarMenuItem>
        {/* Tela ainda não construída: aparece apagada e não é clicável. */}
        <SidebarMenuButton aria-disabled title={`${item.title} (em breve)`} className={BOTAO_QUEBRA}>
          {Icone && <Icone />}
          <div className={TEXTO_QUEBRA}>{item.title}</div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isSamePath(item.url, pathname)} className={BOTAO_QUEBRA}>
        <Link to={item.url}>
          {Icone && <Icone />}
          <div className={TEXTO_QUEBRA}>{item.title}</div>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
