import { toast } from "sonner";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { CorpoRecebimento } from "@/features/vendas/pagamentos";
import { RecebimentoEtapa } from "@/features/vendas/recebimento-etapa";
import { useEnvioUnico } from "@/lib/envio-unico";
import { formatarBRL } from "@/lib/numeros";

import { useEntregarOrdem } from "./api";
import { type Ordem, totaisDaOrdem } from "./tipos";

/** Entrega do carro: a mesma etapa de recebimento da venda; ao concluir, a OS vira venda. Quem usa troca a `key` a cada abertura. */
export function EntregaOrdem({ ordem, aoFechar }: { ordem: Ordem | null; aoFechar: () => void }) {
  const entregar = useEntregarOrdem();
  const { proteger } = useEnvioUnico();
  const total = ordem ? totaisDaOrdem(ordem).total : 0;

  const concluir = proteger(async (corpo: CorpoRecebimento) => {
    if (!ordem) return;
    try {
      await entregar.mutateAsync({ id: ordem.id, ...corpo });
      toast.success(`${ordem.numero} entregue. A venda foi lançada${corpo.divergencia === "saldo" ? ` com ${formatarBRL(total - corpo.pagamentos.reduce((s, p) => s + p.valor, 0))} a receber` : ""}.`);
      aoFechar();
    } catch (falha) {
      toast.error(falha instanceof Error ? falha.message : "Não foi possível entregar. Tente de novo.");
    }
  });

  return (
    <Sheet open={ordem !== null} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-lg!">
        <SheetHeader className="border-b">
          <SheetTitle>Entrega · {ordem?.numero}</SheetTitle>
          <SheetDescription>Registre como o cliente pagou. A venda é lançada com os itens aprovados e o estoque baixa agora.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col overflow-y-auto p-4">
          {ordem && <RecebimentoEtapa modo="venda" total={total} temCliente enviando={entregar.isPending} aoConcluir={concluir} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
