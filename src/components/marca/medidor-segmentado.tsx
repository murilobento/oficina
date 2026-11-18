import { cn } from "@/lib/utils";

import type { TomStatus } from "./fita-status";

const COR: Record<TomStatus, string> = {
  neutro: "bg-foreground",
  sinal: "bg-primary",
  ok: "bg-ok",
  atencao: "bg-atencao",
  erro: "bg-erro",
  info: "bg-info",
};

/** Barra de segmentos estilo telemetria. `valor` de 0 a `maximo`; o arredondamento é para o segmento mais próximo. */
export function MedidorSegmentado({
  valor,
  maximo,
  segmentos = 8,
  tom = "sinal",
  rotulo,
  className,
}: {
  valor: number;
  maximo: number;
  segmentos?: number;
  tom?: TomStatus;
  rotulo: string;
  className?: string;
}) {
  const limitado = Math.min(Math.max(valor, 0), maximo);
  const acesos = maximo > 0 ? Math.round((limitado / maximo) * segmentos) : 0;
  return (
    <div role="meter" aria-label={rotulo} aria-valuemin={0} aria-valuemax={maximo} aria-valuenow={limitado} className={cn("flex gap-[3px]", className)}>
      {Array.from({ length: segmentos }, (_, i) => (
        <i key={i} data-aceso={i < acesos} className={cn("h-2 flex-1 rounded-[2px]", i < acesos ? COR[tom] : "bg-border")} />
      ))}
    </div>
  );
}
