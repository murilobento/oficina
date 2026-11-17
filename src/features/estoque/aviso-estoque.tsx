import { Info } from "lucide-react";

/**
 * Aviso temporário (etapa 1 da ligação com o banco): o saldo dos produtos já vem do Neon, mas
 * vendas, compras e acertos ainda não o alteram. Some quando o estoque for ligado à API.
 */
export function AvisoEstoque({ texto = "Vendas, compras e acertos ainda não alteram o saldo dos produtos. Isso volta na próxima etapa, quando o estoque também for para o banco." }: { texto?: string }) {
  return (
    <p role="note" className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg border p-3 text-sm">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{texto}</span>
    </p>
  );
}
