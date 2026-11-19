import { useState } from "react";

import { CarFront, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { usePessoas } from "@/features/pessoas/api";
import { CampoCliente } from "@/features/pessoas/campo-cliente";
import { ClienteRapido } from "@/features/pessoas/cliente-rapido";
import { useVeiculos } from "@/features/veiculos/api";
import { veiculoEmTexto } from "@/features/veiculos/tipos";
import { VeiculoRapido } from "@/features/veiculos/veiculo-rapido";
import { useEnvioUnico } from "@/lib/envio-unico";
import { formatarQuantidade, textoParaNumero } from "@/lib/numeros";

import { useAbrirOrdem } from "./api";

/**
 * OS direta, sem orçamento (urgência): cliente, veículo, km e o problema relatado. Os itens entram
 * depois, na própria OS. Quem usa troca a `key` a cada abertura.
 */
export function OrdemForm({ aberto, aoFechar, aoAberta }: { aberto: boolean; aoFechar: () => void; aoAberta: (id: string) => void }) {
  const clientes = usePessoas("cliente");
  const veiculos = useVeiculos();
  const abrir = useAbrirOrdem();
  const { proteger, enviando } = useEnvioUnico();
  const [clienteId, setClienteId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [km, setKm] = useState("");
  const [problema, setProblema] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [clienteRapido, setClienteRapido] = useState({ aberto: false, nome: "", abertura: 0 });
  const [veiculoRapido, setVeiculoRapido] = useState({ aberto: false, abertura: 0 });

  const doCliente = veiculos.filter((v) => v.clienteId === clienteId && v.ativo);

  function trocarCliente(id: string) {
    setClienteId(id);
    const seus = veiculos.filter((v) => v.clienteId === id && v.ativo);
    setVeiculoId(seus.length === 1 ? seus[0].id : "");
    setErros({});
  }

  const enviar = proteger(async () => {
    const novos: Record<string, string> = {};
    if (!clienteId) novos.clienteId = "Escolha o cliente.";
    if (!veiculoId) novos.veiculoId = "Escolha o veículo.";
    if (problema.trim() === "") novos.problema = "Conte o problema relatado pelo cliente.";
    setErros(novos);
    if (Object.keys(novos).length > 0) return;
    try {
      const ordem = await abrir.mutateAsync({ clienteId, veiculoId, km: Math.round(textoParaNumero(km) || 0), problema: problema.trim() });
      toast.success(`${ordem.numero} aberta.`);
      aoFechar();
      aoAberta(ordem.id);
    } catch (falha) {
      toast.error(falha instanceof Error ? falha.message : "Não foi possível abrir a OS.");
    }
  });

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-lg!">
        <SheetHeader className="border-b">
          <SheetTitle>Nova OS</SheetTitle>
          <SheetDescription>Sem orçamento: os itens entram depois, na própria OS. Com orçamento aprovado, abra a OS pelo orçamento.</SheetDescription>
        </SheetHeader>
        <form
          noValidate
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar();
          }}
        >
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <Field className="gap-1.5" data-invalid={!!erros.clienteId}>
              <FieldLabel htmlFor="os-cliente">Cliente</FieldLabel>
              <div className="flex gap-2">
                <CampoCliente id="os-cliente" valor={clienteId} clientes={clientes.filter((c) => c.ativo || c.id === clienteId)} invalido={!!erros.clienteId} aoMudar={trocarCliente} aoCadastrar={(nome) => setClienteRapido((a) => ({ aberto: true, nome, abertura: a.abertura + 1 }))} />
                <Button type="button" variant="outline" size="icon" aria-label="Cadastrar cliente" onClick={() => setClienteRapido((a) => ({ aberto: true, nome: "", abertura: a.abertura + 1 }))}>
                  <UserPlus />
                </Button>
              </div>
              {erros.clienteId && <p role="alert" className="text-destructive text-sm">{erros.clienteId}</p>}
            </Field>

            <Field className="gap-1.5" data-invalid={!!erros.veiculoId}>
              <FieldLabel htmlFor="os-veiculo">Veículo</FieldLabel>
              <div className="flex gap-2">
                <NativeSelect id="os-veiculo" className="w-full" disabled={!clienteId} value={veiculoId} aria-invalid={!!erros.veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
                  <NativeSelectOption value="">{clienteId ? (doCliente.length ? "Selecione" : "Nenhum veículo cadastrado") : "Escolha o cliente primeiro"}</NativeSelectOption>
                  {doCliente.map((v) => (
                    <NativeSelectOption key={v.id} value={v.id}>
                      {veiculoEmTexto(v)}
                      {v.km > 0 ? ` · ${formatarQuantidade(v.km)} km` : ""}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Button type="button" variant="outline" size="icon" aria-label="Cadastrar veículo" disabled={!clienteId} onClick={() => setVeiculoRapido((a) => ({ aberto: true, abertura: a.abertura + 1 }))}>
                  <CarFront />
                </Button>
              </div>
              {erros.veiculoId && <p role="alert" className="text-destructive text-sm">{erros.veiculoId}</p>}
            </Field>

            <Field className="gap-1.5">
              <FieldLabel htmlFor="os-km">Quilometragem (opcional)</FieldLabel>
              <Input id="os-km" inputMode="numeric" className="font-mono" value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))} placeholder="0" />
            </Field>

            <Field className="gap-1.5" data-invalid={!!erros.problema}>
              <FieldLabel htmlFor="os-problema">Problema relatado</FieldLabel>
              <Textarea id="os-problema" rows={3} value={problema} aria-invalid={!!erros.problema} onChange={(e) => setProblema(e.target.value)} placeholder="O que o cliente contou: barulho, luz acesa, não liga..." />
              {erros.problema && <p role="alert" className="text-destructive text-sm">{erros.problema}</p>}
            </Field>
          </div>
          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" disabled={enviando}>
              Abrir OS
            </Button>
          </SheetFooter>
        </form>

        <ClienteRapido key={clienteRapido.abertura} aberto={clienteRapido.aberto} nomeInicial={clienteRapido.nome} aoFechar={() => setClienteRapido((a) => ({ ...a, aberto: false }))} aoCriado={trocarCliente} />
        <VeiculoRapido
          key={`v${veiculoRapido.abertura}`}
          aberto={veiculoRapido.aberto}
          clienteId={clienteId}
          aoFechar={() => setVeiculoRapido((a) => ({ ...a, aberto: false }))}
          aoCriado={(id, kmVeiculo) => {
            setVeiculoId(id);
            if (kmVeiculo > 0) setKm(String(kmVeiculo));
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
