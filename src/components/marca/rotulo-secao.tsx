import { cn } from "@/lib/utils";

/** Título de seção: caixa alta condensada com traço amarelo de 3px à esquerda. */
export function RotuloSecao({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("border-l-[3px] border-primary pl-2 text-xs font-bold tracking-widest [font-stretch:75%]", className)}>{children}</h3>;
}
