import { useState } from "react";

import { Link, useLocation } from "@tanstack/react-router";
import { Menu, Plus } from "lucide-react";

import { useSidebar } from "@/components/ui/sidebar";
import { usePermissoes } from "@/navigation/acesso";
import { acoesNovoPermitidas, atalhosInferiores, isSamePath } from "@/navigation/sidebar-items";
import { cn } from "@/lib/utils";

import { FolhaNovo } from "./folha-novo";

const ITEM = "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium";

/** Navegação do celular (abaixo de md): atalhos ao alcance do polegar, ＋ Novo no centro e o Menu completo. */
export function BarraInferior() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const permissoes = usePermissoes();
  const { setOpenMobile } = useSidebar();
  const [novoAberto, setNovoAberto] = useState(false);

  const atalhos = atalhosInferiores(permissoes);
  const acoes = acoesNovoPermitidas(permissoes);
  const ativo = (url: string) => (url === "/" ? pathname === "/" : isSamePath(url, pathname));
  const [primeiro, segundo, terceiro] = atalhos;
  const esquerda = [primeiro, segundo].filter(Boolean);

  const renderAtalho = (a: (typeof atalhos)[number]) => (
    <Link key={a.id} to={a.url} aria-current={ativo(a.url) ? "page" : undefined} className={cn(ITEM, ativo(a.url) ? "text-primary" : "text-muted-foreground")}>
      <a.icone className="size-[22px]" strokeWidth={ativo(a.url) ? 2.25 : 1.75} />
      {a.titulo}
    </Link>
  );

  return (
    <>
      <nav aria-label="Navegação principal" className="bg-card/95 backdrop-blur fixed inset-x-0 bottom-0 z-40 flex items-end border-t px-1 pb-[env(safe-area-inset-bottom)] md:hidden">
        {esquerda.map(renderAtalho)}
        {acoes.length > 0 && (
          <div className="flex w-[76px] shrink-0 justify-center">
            <button
              type="button"
              aria-label="Criar novo"
              onClick={() => setNovoAberto(true)}
              className="bg-primary text-primary-foreground border-card focus-visible:ring-ring -mt-5 mb-2 grid size-14 place-items-center rounded-full border-4 shadow-md shadow-primary/30 outline-none focus-visible:ring-2 active:scale-95"
            >
              <Plus className="size-7" strokeWidth={2.25} />
            </button>
          </div>
        )}
        {terceiro && renderAtalho(terceiro)}
        <button type="button" onClick={() => setOpenMobile(true)} className={cn(ITEM, "text-muted-foreground")}>
          <Menu className="size-[22px]" strokeWidth={1.75} />
          Menu
        </button>
      </nav>
      <FolhaNovo aberta={novoAberto} acoes={acoes} aoFechar={() => setNovoAberto(false)} />
    </>
  );
}
