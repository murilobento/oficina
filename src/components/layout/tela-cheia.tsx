import { useEffect, useState } from "react";

import { Maximize, Minimize } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

/** Item do menu do usuário que alterna a tela cheia do navegador. Só aparece no computador e onde o navegador permite. */
export function ItemTelaCheia() {
  const [ativo, setAtivo] = useState(() => typeof document !== "undefined" && !!document.fullscreenElement);

  useEffect(() => {
    const atualizar = () => setAtivo(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", atualizar);
    return () => document.removeEventListener("fullscreenchange", atualizar);
  }, []);

  if (typeof document === "undefined" || !document.fullscreenEnabled) return null;

  function alternar() {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  }

  return (
    <DropdownMenuItem className="max-md:hidden" onSelect={alternar}>
      {ativo ? <Minimize /> : <Maximize />}
      {ativo ? "Sair da tela cheia" : "Tela cheia"}
    </DropdownMenuItem>
  );
}
