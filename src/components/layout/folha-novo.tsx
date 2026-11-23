import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAcaoNovo } from "@/lib/acao-novo";
import type { AcaoNovo } from "@/navigation/sidebar-items";

/** Folha do botão ＋ Novo: o que a pessoa pode criar. Abre a lista certa já com o formulário aberto. */
export function FolhaNovo({ aberta, acoes, aoFechar }: { aberta: boolean; acoes: AcaoNovo[]; aoFechar: () => void }) {
  const navigate = useNavigate();
  const pedir = useAcaoNovo((estado) => estado.pedir);

  return (
    <Sheet open={aberta} onOpenChange={(abrir) => !abrir && aoFechar()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-xl">Criar novo</SheetTitle>
          <SheetDescription>O que você quer lançar agora?</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {acoes.map((acao) => (
            <Button
              key={acao.id}
              variant="outline"
              className="h-14 justify-start gap-3 text-base"
              onClick={() => {
                aoFechar();
                pedir(acao.id);
                void navigate({ to: acao.url });
              }}
            >
              <acao.icone className="size-5" />
              {acao.titulo}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
