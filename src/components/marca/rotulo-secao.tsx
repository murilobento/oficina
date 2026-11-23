import { cn } from "@/lib/utils";

/** Título de seção: texto pequeno e discreto, sem enfeite. */
export function RotuloSecao({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-muted-foreground text-sm font-semibold", className)}>{children}</h3>;
}
