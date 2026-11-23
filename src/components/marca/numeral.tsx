import { cn } from "@/lib/utils";

/** Valor em destaque (algarismos tabulares) com o rótulo discreto em cima. */
export function Numeral({ rotulo, valor, tamanho = "lg", className }: { rotulo: string; valor: string; tamanho?: "sm" | "lg"; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-muted-foreground text-sm">{rotulo}</div>
      <div className={cn("leading-none font-semibold tracking-tight tabular-nums", tamanho === "lg" ? "mt-2 text-[32px]" : "mt-1 text-lg")}>{valor}</div>
    </div>
  );
}
