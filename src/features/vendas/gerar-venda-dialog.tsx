import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { itensSemSaldo } from "@/features/estoque/movimentar";
import type { Orcamento } from "@/features/orcamentos/tipos";
import { totaisDoOrcamento } from "@/features/orcamentos/tipos";
import { useProdutos } from "@/features/produtos/api";
import { useEnvioUnico } from "@/lib/envio-unico";
import { formatarBRL, formatarQuantidade } from "@/lib/numeros";

import { useGerarVendaDoOrcamento } from "./api";
import type { CorpoRecebimento } from "./pagamentos";
import { RecebimentoEtapa } from "./recebimento-etapa";

/**
 * Orçamento aprovado → venda: abre direto na etapa de recebimento (os itens já estão definidos)
 * e avisa quando faltar saldo de alguma peça. Quem usa deve trocar a `key` a cada abertura.
 */
export function GerarVendaDialog({
  orcamento,
  aoFechar,
  aoGerada,
}: {
  orcamento: Orcamento | null;
  aoFechar: () => void;
  aoGerada?: (numero: string) => void;
}) {
  const gerar = useGerarVendaDoOrcamento();
  const { proteger } = useEnvioUnico();
  const produtos = useProdutos();

  const total = orcamento ? totaisDoOrcamento(orcamento).total : 0;
  const faltas = orcamento ? itensSemSaldo(orcamento.itens.filter((item) => item.tipo === "produto"), produtos) : [];

  const concluir = proteger(async (corpo: CorpoRecebimento) => {
    if (!orcamento) return;
    try {
      const venda = await gerar.mutateAsync({ orcamentoId: orcamento.id, ...corpo });
      toast.success(venda.saldo > 0 ? `${venda.numero} gerada. A receber: ${formatarBRL(venda.saldo)}.` : `${venda.numero} gerada a partir de ${orcamento.numero}.`);
      aoGerada?.(venda.numero);
      aoFechar();
    } catch (falha) {
      toast.error(falha instanceof Error ? falha.message : "Não foi possível gerar a venda. Tente de novo.");
    }
  });

  return (
    <Sheet open={orcamento !== null} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-lg!">
        <SheetHeader className="border-b">
          <SheetTitle>Recebimento · {orcamento?.numero}</SheetTitle>
          <SheetDescription>Registre como o cliente pagou para gerar a venda.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {faltas.length > 0 && (
            <div role="status" className="border-atencao/40 bg-atencao-fundo flex gap-2 rounded-md border p-3 text-sm">
              <TriangleAlert className="text-atencao mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Saldo insuficiente em estoque</p>
                <ul className="mt-1">
                  {faltas.map((f) => (
                    <li key={f.produtoId}>
                      {f.descricao}: pedido {formatarQuantidade(f.pedido)}, em estoque {formatarQuantidade(f.saldo)}.
                    </li>
                  ))}
                </ul>
                <p className="mt-1">A venda segue e o saldo ficará negativo até a entrada da compra.</p>
              </div>
            </div>
          )}
          {orcamento && <RecebimentoEtapa modo="venda" total={total} temCliente={orcamento.clienteId !== ""} enviando={gerar.isPending} aoConcluir={concluir} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
