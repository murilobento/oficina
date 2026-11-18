import { cn } from "@/lib/utils";

import { formatarPlaca } from "./placa";

/** A placa do veículo como objeto gráfico (faixa azul "BRASIL" e caracteres em mono). */
export function PlacaVeiculo({ placa, tamanho = "md", className }: { placa: string; tamanho?: "sm" | "md"; className?: string }) {
  const texto = formatarPlaca(placa);
  if (!texto) return null;
  return (
    <span
      role="img"
      aria-label={`Placa ${texto}`}
      className={cn("inline-flex shrink-0 flex-col overflow-hidden rounded-[4px] border-[1.5px] border-[#15181E] bg-white leading-none text-[#15181E]", className)}
    >
      <span className={cn("bg-[#1b4fb0] text-center font-bold tracking-[0.2em] text-white", tamanho === "sm" ? "px-1.5 py-px text-[5px]" : "px-2 py-0.5 text-[7px]")}>BRASIL</span>
      <span className={cn("font-mono font-bold tracking-[0.1em]", tamanho === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-[3px] text-[15px]")}>{texto}</span>
    </span>
  );
}
