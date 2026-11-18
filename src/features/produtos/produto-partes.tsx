import { PackageX, TriangleAlert } from "lucide-react";

import { FitaStatus } from "@/components/marca/fita-status";

import { situacaoEstoque, type Produto } from "./tipos";

/** Aviso de estoque: "Sem estoque" (erro) ou "Estoque baixo" (atenção). Estoque ok não mostra nada. */
export function AvisoEstoque({ produto }: { produto: Pick<Produto, "saldo" | "estoqueMinimo"> }) {
  const situacao = situacaoEstoque(produto);
  if (situacao === "ok") return null;
  return situacao === "sem" ? (
    <FitaStatus tom="erro" icone={PackageX}>Sem estoque</FitaStatus>
  ) : (
    <FitaStatus tom="atencao" icone={TriangleAlert}>Estoque baixo</FitaStatus>
  );
}
