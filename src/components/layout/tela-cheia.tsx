import { useEffect, useState } from "react";

import { Maximize, Minimize } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Alterna o modo de tela cheia do navegador. Só aparece no computador e onde o navegador permite. */
export function BotaoTelaCheia() {
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
    <Button
      size="icon"
      className="hidden md:inline-flex"
      aria-label={ativo ? "Sair da tela cheia" : "Tela cheia"}
      title={ativo ? "Sair da tela cheia" : "Tela cheia"}
      onClick={alternar}
    >
      {ativo ? <Minimize /> : <Maximize />}
    </Button>
  );
}
