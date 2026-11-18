import { CircleAlert, CircleDollarSign } from "lucide-react";
import { toast } from "sonner";

import { FitaStatus } from "@/components/marca/fita-status";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEnvioUnico } from "@/lib/envio-unico";
import { formatarBRL } from "@/lib/numeros";

import { useReceberPagamento } from "./api";
import type { CorpoRecebimento } from "./pagamentos";
import { temVencida } from "./parcelas";
import { RecebimentoEtapa } from "./recebimento-etapa";
import type { Venda } from "./tipos";

/** Selo para venda com saldo em aberto ("Vencida" em vermelho quando alguma parcela passou da data); nada quando quitada. */
export function SeloSaldo({ venda }: { venda: Pick<Venda, "saldo" | "totalPago" | "parcelas"> }) {
  if (venda.saldo <= 0) return null;
  if (temVencida(venda.parcelas)) {
    return (
      <FitaStatus tom="erro" icone={CircleAlert}>
        Vencida · {formatarBRL(venda.saldo)}
      </FitaStatus>
    );
  }
  return (
    <FitaStatus tom="atencao" icone={CircleDollarSign}>
      {venda.totalPago > 0 ? "Pago parcialmente" : "A receber"} · {formatarBRL(venda.saldo)}
    </FitaStatus>
  );
}

/** Recebe (parte do) saldo de uma venda, com a mesma etapa de recebimento da venda. Quem usa troca a `key` a cada abertura. */
export function ReceberPagamentoDialog({ venda, aoFechar }: { venda: Venda | null; aoFechar: () => void }) {
  const receber = useReceberPagamento();
  const { proteger } = useEnvioUnico();
  const proxima = venda?.parcelas.find((p) => p.aberto > 0);

  const concluir = proteger(async (corpo: CorpoRecebimento) => {
    if (!venda) return;
    try {
      const atual = await receber.mutateAsync({ vendaId: venda.id, pagamentos: corpo.pagamentos });
      toast.success(atual.saldo > 0 ? `Recebido. Ainda faltam ${formatarBRL(atual.saldo)}.` : "Recebido. Venda quitada.");
      aoFechar();
    } catch (falha) {
      toast.error(falha instanceof Error ? falha.message : "Não foi possível registrar o pagamento.");
    }
  });

  return (
    <Sheet open={venda !== null} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-lg!">
        <SheetHeader className="border-b">
          <SheetTitle>Receber · {venda?.numero}</SheetTitle>
          <SheetDescription>
            {proxima ? `Próxima parcela: ${formatarBRL(proxima.aberto)}, vence em ${proxima.vencimento.split("-").reverse().join("/")}.` : "Registre o que o cliente pagou."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col overflow-y-auto p-4">
          {venda && <RecebimentoEtapa modo="receber" total={venda.saldo} sugerido={proxima?.aberto} enviando={receber.isPending} aoConcluir={concluir} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
