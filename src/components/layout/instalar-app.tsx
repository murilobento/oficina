import { Download, Share, SquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useInstalacao } from "@/lib/pwa";

/**
 * Item "Instalar app" do menu do usuário. Some quando já está instalado ou o navegador não permite.
 * No iPhone chama `aoMostrarPassos`: o diálogo fica fora do menu (o menu some ao escolher o item).
 */
export function InstalarAppItem({
  aoMostrarPassos,
}: {
  aoMostrarPassos: () => void;
}) {
  const { modo, instalar } = useInstalacao();
  if (!modo) return null;
  return (
    <DropdownMenuItem
      onSelect={() => (modo === "botao" ? void instalar() : aoMostrarPassos())}
    >
      <Download />
      Instalar app
    </DropdownMenuItem>
  );
}

/** Passo a passo de instalação no iPhone/iPad (o Safari não tem botão de instalar). */
export function PassoAPassoIOS({
  aberto,
  aoFechar,
}: {
  aberto: boolean;
  aoFechar: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !abrir && aoFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Instalar no iPhone</DialogTitle>
          <DialogDescription>No Safari, são dois toques:</DialogDescription>
        </DialogHeader>
        <ol className="flex flex-col gap-3 text-sm">
          <li className="flex items-center gap-2">
            <Share className="size-5 shrink-0" /> 1. Toque em{" "}
            <strong>Compartilhar</strong> (na barra de baixo).
          </li>
          <li className="flex items-center gap-2">
            <SquarePlus className="size-5 shrink-0" /> 2. Escolha{" "}
            <strong>Adicionar à Tela de Início</strong>.
          </li>
        </ol>
        <DialogFooter>
          <Button onClick={aoFechar}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
