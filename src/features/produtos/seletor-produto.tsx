import { useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatarQuantidade } from "@/lib/numeros";
import { normalizar } from "@/lib/listagem";

import { useProdutosStore } from "./store";
import type { Produto } from "./tipos";

/**
 * Janela para escolher um produto ativo do cadastro, com o saldo à vista. Usada em compras,
 * acertos e movimentações de estoque. `ocultar` esconde os que já estão no documento.
 */
export function SeletorProduto({
  aberto,
  aoFechar,
  aoEscolher,
  ocultar = [],
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoEscolher: (produto: Produto) => void;
  ocultar?: string[];
}) {
  const produtos = useProdutosStore((estado) => estado.itens);
  const [busca, setBusca] = useState("");

  const termo = normalizar(busca.trim());
  const encontrados = produtos
    .filter((produto) => produto.ativo && !ocultar.includes(produto.id))
    .filter((produto) => termo === "" || normalizar(`${produto.descricao} ${produto.codigo} ${produto.marca} ${produto.referencia}`).includes(termo))
    .sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"))
    .slice(0, 40);

  function fechar() {
    setBusca("");
    aoFechar();
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && fechar()}>
      <DialogContent className="flex max-h-[85svh] flex-col gap-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Escolher produto</DialogTitle>
          <DialogDescription>Busque pelo nome, código, marca ou referência.</DialogDescription>
        </DialogHeader>
        <Input
          type="search"
          autoComplete="off"
          placeholder="Buscar produto"
          aria-label="Buscar produto"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
        <ul className="-mx-1 flex min-h-32 flex-1 flex-col overflow-y-auto px-1">
          {encontrados.map((produto) => (
            <li key={produto.id}>
              <button
                type="button"
                className="hover:bg-accent flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left"
                onClick={() => {
                  aoEscolher(produto);
                  fechar();
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{produto.descricao}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {[produto.codigo, produto.marca].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm tabular-nums">
                  <span className="text-muted-foreground block text-xs">Saldo</span>
                  {formatarQuantidade(produto.saldo)} {produto.unidade}
                </span>
              </button>
            </li>
          ))}
          {encontrados.length === 0 && (
            <li className="text-muted-foreground py-6 text-center text-sm">Nenhum produto encontrado.</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
