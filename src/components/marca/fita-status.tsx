import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type TomStatus = "neutro" | "sinal" | "ok" | "atencao" | "erro" | "info";

// Fundo suave do tom; o ícone leva a cor do tom e o texto fica na cor principal (contraste garantido).
const TOM: Record<TomStatus, string> = {
  neutro: "bg-muted [&>svg]:text-muted-foreground",
  sinal: "bg-accent [&>svg]:text-primary",
  ok: "bg-ok-fundo [&>svg]:text-ok",
  atencao: "bg-atencao-fundo [&>svg]:text-atencao",
  erro: "bg-erro-fundo [&>svg]:text-erro",
  info: "bg-info-fundo [&>svg]:text-info",
};

/** Status como pílula: ícone colorido e texto (nunca só cor). */
export function FitaStatus({ tom, icone: Icone, children, className }: { tom: TomStatus; icone: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-foreground inline-flex h-6 items-center gap-1 rounded-full pr-2.5 pl-2 text-xs font-medium whitespace-nowrap", TOM[tom], className)}>
      <Icone aria-hidden className="size-3.5 shrink-0" />
      {children}
    </span>
  );
}
