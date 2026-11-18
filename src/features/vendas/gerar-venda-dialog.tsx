import { useState } from "react";

import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePode } from "@/features/auth/sessao";
import { useProdutos } from "@/features/produtos/api";
import { itensSemSaldo } from "@/features/estoque/movimentar";
import type { Orcamento } from "@/features/orcamentos/tipos";
import { totaisDoOrcamento } from "@/features/orcamentos/tipos";
import { formatarBRL, formatarQuantidade } from "@/lib/numeros";
import { useEnvioUnico } from "@/lib/envio-unico";

import { useGerarVendaDoOrcamento } from "./api";
import { corpoPagamento, type EstadoPagamento, estadoInicial, validarPagamento } from "./pagamentos";
import { PagamentosCampos } from "./pagamentos-campos";

/**
 * Confirma a venda de um orçamento aprovado: pede a forma de pagamento e avisa quando faltar
 * saldo de alguma peça. Quem usa deve trocar a `key` a cada abertura.
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
  const [pagamento, setPagamento] = useState<EstadoPagamento>(estadoInicial);
  const [erro, setErro] = useState("");
  const gerar = useGerarVendaDoOrcamento();
  const { proteger } = useEnvioUnico();
  const produtos = useProdutos();
  const verValores = usePode("valores.ver");

  const total = orcamento ? totaisDoOrcamento(orcamento).total : 0;
  const faltas = orcamento ? itensSemSaldo(orcamento.itens.filter((item) => item.tipo === "produto"), produtos) : [];

  const confirmar = proteger(async () => {
    if (!orcamento) return;
    const problema = validarPagamento(pagamento, total, orcamento.clienteId !== "", verValores);
    if (problema) {
      setErro(problema);
      return;
    }
    try {
      const venda = await gerar.mutateAsync({ orcamentoId: orcamento.id, ...corpoPagamento(pagamento, total, verValores) });
      toast.success(venda.saldo > 0 ? `${venda.numero} gerada. Saldo a receber: ${formatarBRL(venda.saldo)}.` : `${venda.numero} gerada a partir de ${orcamento.numero}.`);
      aoGerada?.(venda.numero);
      aoFechar();
    } catch (falha) {
      toast.error(falha instanceof Error ? falha.message : "Não foi possível gerar a venda. Tente de novo.");
    }
  });

  return (
    <Dialog open={orcamento !== null} onOpenChange={(open) => !open && aoFechar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar venda de {orcamento?.numero}</DialogTitle>
          <DialogDescription>
            {orcamento && verValores && `Total de ${formatarBRL(totaisDoOrcamento(orcamento).total)}.`}
          </DialogDescription>
        </DialogHeader>
        <PagamentosCampos
          prefixo="gerar-venda"
          total={total}
          estado={pagamento}
          aoMudar={(novo) => {
            setPagamento(novo);
            setErro("");
          }}
          temCliente={orcamento?.clienteId !== undefined && orcamento.clienteId !== ""}
          erro={erro}
        />
        {faltas.length > 0 && (
          <div role="status" className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
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
        <DialogFooter className="flex-row justify-end gap-2">
          <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>
            Voltar
          </Button>
          <Button type="button" className="flex-1 sm:flex-none" onClick={confirmar} disabled={gerar.isPending}>
            Gerar venda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
