import { cn } from "@/lib/utils";

import { formatarPlaca } from "./placa";

/** A placa do veículo: caracteres em mono numa caixa discreta com borda fina. */
export function PlacaVeiculo({ placa, tamanho = "md", className }: { placa: string; tamanho?: "sm" | "md"; className?: string }) {
  const texto = formatarPlaca(placa);
  if (!texto) return null;
  return (
    <span
      role="img"
      aria-label={`Placa ${texto}`}
      className={cn(
        "border-input bg-card text-foreground inline-flex shrink-0 items-center rounded-md border font-mono leading-none font-medium tracking-wider",
        tamanho === "sm" ? "h-6 px-1.5 text-xs" : "h-7 px-2 text-sm",
        className,
      )}
    >
      {texto}
    </span>
  );
}
