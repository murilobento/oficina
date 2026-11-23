import type { ReactNode } from "react";

import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export type AbaFolha = {
  id: string;
  titulo: string;
  conteudo: ReactNode;
  /** Marca a aba (ponto vermelho) quando há erro nela, para quem está na outra aba. */
  comErro?: boolean;
};

/**
 * Abas de uma folha lateral (orçamento, venda, compra): a barra fica fixa sob o cabeçalho e cada aba rola sozinha.
 * O conteúdo das abas inativas continua montado (só escondido), para os campos do formulário não perderem valor.
 */
/** Sem `valor`, começa na primeira aba (troque a `key` para voltar a ela). */
export function FolhaAbas({ abas, valor, aoMudar, className }: { abas: AbaFolha[]; valor?: string; aoMudar?: (id: string) => void; className?: string }) {
  return (
    <TabsPrimitive.Root {...(valor !== undefined ? { value: valor } : { defaultValue: abas[0]?.id })} onValueChange={aoMudar} className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <TabsPrimitive.List aria-label="Seções" className="bg-card grid shrink-0 border-b" style={{ gridTemplateColumns: `repeat(${abas.length}, minmax(0, 1fr))` }}>
        {abas.map((aba) => (
          <TabsPrimitive.Trigger
            key={aba.id}
            value={aba.id}
            className="text-muted-foreground data-[state=active]:text-foreground focus-visible:ring-ring relative flex min-h-12 items-center justify-center gap-1.5 px-2 text-sm font-medium outline-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent focus-visible:ring-2 focus-visible:ring-inset data-[state=active]:after:bg-primary"
          >
            {aba.titulo}
            {aba.comErro && (
              <>
                <span aria-hidden className="bg-erro size-2 rounded-full" />
                <span className="sr-only">(com erro)</span>
              </>
            )}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {abas.map((aba) => (
        <TabsPrimitive.Content key={aba.id} value={aba.id} forceMount className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 outline-none data-[state=inactive]:hidden">
          {aba.conteudo}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
