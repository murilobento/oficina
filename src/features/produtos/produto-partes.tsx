import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { situacaoEstoque, type Produto } from "./tipos";

/** Aviso de estoque: "Sem estoque" (vermelho) ou "Estoque baixo" (âmbar). Estoque ok não mostra nada. */
export function AvisoEstoque({ produto }: { produto: Pick<Produto, "saldo" | "estoqueMinimo"> }) {
  const situacao = situacaoEstoque(produto);
  if (situacao === "ok") return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "px-2 py-1 font-medium",
        situacao === "sem"
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      )}
    >
      {situacao === "sem" ? "Sem estoque" : "Estoque baixo"}
    </Badge>
  );
}
