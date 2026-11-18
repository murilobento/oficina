import { cn } from "@/lib/utils";

/** Valor em destaque, em mono, com o rótulo condensado em cima. */
export function Numeral({ rotulo, valor, tamanho = "lg", className }: { rotulo: string; valor: string; tamanho?: "sm" | "lg"; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase [font-stretch:75%]">{rotulo}</div>
      <div className={cn("font-mono leading-none font-semibold tracking-tight tabular-nums", tamanho === "lg" ? "mt-2 text-[40px]" : "mt-1 text-lg")}>{valor}</div>
    </div>
  );
}
