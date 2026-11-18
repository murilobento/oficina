import { useState } from "react";

import { toast } from "sonner";

import { FitaStatus } from "@/components/marca/fita-status";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useEnvioUnico } from "@/lib/envio-unico";
import { formatarBRL, mascararMoeda, textoParaCentavos } from "@/lib/numeros";
import { CircleDollarSign } from "lucide-react";

import { useReceberPagamento } from "./api";
import { FORMAS_PAGAMENTO, type Venda } from "./tipos";

/** Selo "A receber R$ x" para venda com saldo em aberto; nada quando está quitada. */
export function SeloSaldo({ venda }: { venda: Pick<Venda, "saldo" | "totalPago"> }) {
  if (venda.saldo <= 0) return null;
  return (
    <FitaStatus tom="atencao" icone={CircleDollarSign}>
      {venda.totalPago > 0 ? "Pago parcialmente" : "A receber"} · {formatarBRL(venda.saldo)}
    </FitaStatus>
  );
}

/** Registra o recebimento de (parte do) saldo de uma venda. Quem usa troca a `key` a cada abertura. */
export function ReceberPagamentoDialog({ venda, aoFechar }: { venda: Venda | null; aoFechar: () => void }) {
  const [forma, setForma] = useState("");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");
  const receber = useReceberPagamento();
  const { proteger } = useEnvioUnico();

  const saldo = venda?.saldo ?? 0;
  const centavos = valor === "" ? saldo : textoParaCentavos(valor);

  const confirmar = proteger(async () => {
    if (!venda) return;
    if (forma === "") return setErro("Escolha a forma de pagamento.");
    if (centavos <= 0) return setErro("Informe o valor recebido.");
    if (centavos > saldo) return setErro(`O valor passa do saldo de ${formatarBRL(saldo)}.`);
    try {
      const atual = await receber.mutateAsync({ vendaId: venda.id, forma, valor: centavos });
      toast.success(atual.saldo > 0 ? `Recebido. Ainda faltam ${formatarBRL(atual.saldo)}.` : "Recebido. Venda quitada.");
      aoFechar();
    } catch (falha) {
      toast.error(falha instanceof Error ? falha.message : "Não foi possível registrar o pagamento.");
    }
  });

  return (
    <Dialog open={venda !== null} onOpenChange={(open) => !open && aoFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receber pagamento de {venda?.numero}</DialogTitle>
          <DialogDescription>Saldo em aberto: {formatarBRL(saldo)}.</DialogDescription>
        </DialogHeader>
        <Field className="gap-1.5">
          <FieldLabel htmlFor="receber-forma">Forma de pagamento</FieldLabel>
          <NativeSelect id="receber-forma" className="w-full" value={forma} onChange={(e) => { setForma(e.target.value); setErro(""); }}>
            <NativeSelectOption value="">Selecione</NativeSelectOption>
            {FORMAS_PAGAMENTO.map((f) => (
              <NativeSelectOption key={f.valor} value={f.valor}>
                {f.texto}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field className="gap-1.5" data-invalid={erro !== ""}>
          <FieldLabel htmlFor="receber-valor">Valor recebido (R$)</FieldLabel>
          <Input id="receber-valor" inputMode="numeric" className="font-mono" placeholder={mascararMoeda(String(saldo))} value={valor} aria-invalid={erro !== ""} onChange={(e) => { setValor(mascararMoeda(e.target.value)); setErro(""); }} />
          {erro && <p role="alert" className="text-destructive text-sm">{erro}</p>}
        </Field>
        <DialogFooter className="flex-row justify-end gap-2">
          <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>Voltar</Button>
          <Button type="button" className="flex-1 sm:flex-none" onClick={confirmar} disabled={receber.isPending}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
