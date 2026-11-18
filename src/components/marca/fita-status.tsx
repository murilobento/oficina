import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type TomStatus = "neutro" | "sinal" | "ok" | "atencao" | "erro" | "info";

const TOM: Record<TomStatus, string> = {
  neutro: "bg-muted text-muted-foreground",
  sinal: "bg-primary/25 text-foreground",
  ok: "bg-ok-fundo text-ok",
  atencao: "bg-atencao-fundo text-atencao",
  erro: "bg-erro-fundo text-erro",
  info: "bg-info-fundo text-info",
};

/** Status como etiqueta tipo fita: segmento colorido, ícone e texto (nunca só cor). */
export function FitaStatus({ tom, icone: Icone, children, className }: { tom: TomStatus; icone: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 overflow-hidden rounded-[4px] pr-2 text-xs font-bold tracking-wider whitespace-nowrap uppercase [font-stretch:75%]", TOM[tom], className)}>
      <span aria-hidden className="h-full w-1.5 bg-current" />
      <Icone aria-hidden className="size-3.5 shrink-0" />
      <span className="text-foreground">{children}</span>
    </span>
  );
}
