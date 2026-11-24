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

import { useSalvarAgendamento } from "./api";
import type { Agendamento } from "./tipos";

/** Marcar (ou remarcar) a vinda de um carro. Quem usa troca a `key` a cada abertura. */
export function AgendamentoForm({
  aberto,
  editando,
  dataInicial,
  aoFechar,
}: {
  aberto: boolean;
  editando: Agendamento | null;
  /** Dia escolhido na agenda, para já vir preenchido. */
  dataInicial: string;
  aoFechar: () => void;
}) {
  const clientes = usePessoas("cliente");
  const veiculos = useVeiculos();
  const salvar = useSalvarAgendamento();
  const { proteger, enviando } = useEnvioUnico();
  const [data, setData] = useState(editando?.data ?? dataInicial);
  const [hora, setHora] = useState(editando?.hora ?? "08:00");
  const [clienteId, setClienteId] = useState(editando?.clienteId ?? "");
  const [veiculoId, setVeiculoId] = useState(editando?.veiculoId ?? "");
  const [servico, setServico] = useState(editando?.servico ?? "");
  const [observacoes, setObservacoes] = useState(editando?.observacoes ?? "");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [clienteRapido, setClienteRapido] = useState({ aberto: false, nome: "", abertura: 0 });
  const [veiculoRapido, setVeiculoRapido] = useState({ aberto: false, abertura: 0 });

  const doCliente = veiculos.filter((v) => v.clienteId === clienteId && (v.ativo || v.id === veiculoId));

  function trocarCliente(id: string) {
    setClienteId(id);
    const seus = veiculos.filter((v) => v.clienteId === id && v.ativo);
    setVeiculoId(seus.length === 1 ? seus[0].id : "");
    setErros({});
  }

  const enviar = proteger(async () => {
    const novos: Record<string, string> = {};
    if (!data) novos.data = "Escolha o dia.";
    if (!hora) novos.hora = "Escolha a hora.";
    if (!clienteId) novos.clienteId = "Escolha o cliente.";
    if (!veiculoId) novos.veiculoId = "Escolha o veículo.";
    if (servico.trim() === "") novos.servico = "Diga o serviço previsto.";
    setErros(novos);
    if (Object.keys(novos).length > 0) return;
    try {
      await salvar.mutateAsync({ id: editando?.id, dados: { data, hora, clienteId, veiculoId, servico: servico.trim(), observacoes: observacoes.trim() } });
      toast.success(editando ? "Agendamento atualizado." : "Carro agendado.");
      aoFechar();
    } catch (falha) {
      const campos = (falha as { campos?: Record<string, string> }).campos;
      if (campos) setErros(campos);
      toast.error(falha instanceof Error ? falha.message : "Não foi possível salvar.");
    }
  });

  const erro = (campo: string) => erros[campo] && <p role="alert" className="text-destructive text-sm">{erros[campo]}</p>;

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-lg!">
        <SheetHeader className="border-b">
          <SheetTitle>{editando ? "Editar agendamento" : "Novo agendamento"}</SheetTitle>
          <SheetDescription>Quando o carro chegar, use "Chegou" na agenda para abrir a OS.</SheetDescription>
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
            <div className="grid grid-cols-2 gap-4">
              <Field className="gap-1.5" data-invalid={!!erros.data}>
                <FieldLabel htmlFor="ag-data">Dia</FieldLabel>
                <Input id="ag-data" type="date" value={data} aria-invalid={!!erros.data} onChange={(e) => setData(e.target.value)} />
                {erro("data")}
              </Field>
              <Field className="gap-1.5" data-invalid={!!erros.hora}>
                <FieldLabel htmlFor="ag-hora">Hora</FieldLabel>
                <Input id="ag-hora" type="time" step={900} value={hora} aria-invalid={!!erros.hora} onChange={(e) => setHora(e.target.value)} />
                {erro("hora")}
              </Field>
            </div>

            <Field className="gap-1.5" data-invalid={!!erros.clienteId}>
              <FieldLabel htmlFor="ag-cliente">Cliente</FieldLabel>
              <div className="flex gap-2">
                <CampoCliente id="ag-cliente" valor={clienteId} clientes={clientes.filter((c) => c.ativo || c.id === clienteId)} invalido={!!erros.clienteId} aoMudar={trocarCliente} aoCadastrar={(nome) => setClienteRapido((a) => ({ aberto: true, nome, abertura: a.abertura + 1 }))} />
                <Button type="button" variant="outline" size="icon" aria-label="Cadastrar cliente" onClick={() => setClienteRapido((a) => ({ aberto: true, nome: "", abertura: a.abertura + 1 }))}>
                  <UserPlus />
                </Button>
              </div>
              {erro("clienteId")}
            </Field>

            <Field className="gap-1.5" data-invalid={!!erros.veiculoId}>
              <FieldLabel htmlFor="ag-veiculo">Veículo</FieldLabel>
              <div className="flex gap-2">
                <NativeSelect id="ag-veiculo" className="w-full" disabled={!clienteId} value={veiculoId} aria-invalid={!!erros.veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
                  <NativeSelectOption value="">{clienteId ? (doCliente.length ? "Selecione" : "Nenhum veículo cadastrado") : "Escolha o cliente primeiro"}</NativeSelectOption>
                  {doCliente.map((v) => (
                    <NativeSelectOption key={v.id} value={v.id}>
                      {veiculoEmTexto(v)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Button type="button" variant="outline" size="icon" aria-label="Cadastrar veículo" disabled={!clienteId} onClick={() => setVeiculoRapido((a) => ({ aberto: true, abertura: a.abertura + 1 }))}>
                  <CarFront />
                </Button>
              </div>
              {erro("veiculoId")}
            </Field>

            <Field className="gap-1.5" data-invalid={!!erros.servico}>
              <FieldLabel htmlFor="ag-servico">Serviço previsto</FieldLabel>
              <Input id="ag-servico" value={servico} maxLength={200} aria-invalid={!!erros.servico} onChange={(e) => setServico(e.target.value)} placeholder="Ex.: Troca de óleo, revisão 40 mil km, barulho na suspensão" />
              {erro("servico")}
            </Field>

            <Field className="gap-1.5">
              <FieldLabel htmlFor="ag-obs">Observações (opcional)</FieldLabel>
              <Textarea id="ag-obs" rows={3} maxLength={500} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Ex.: cliente traz as peças, precisa do carro até as 17h" />
            </Field>
          </div>
          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" carregando={enviando}>
              {editando ? "Salvar alterações" : "Agendar"}
            </Button>
          </SheetFooter>
        </form>

        <ClienteRapido key={clienteRapido.abertura} aberto={clienteRapido.aberto} nomeInicial={clienteRapido.nome} aoFechar={() => setClienteRapido((a) => ({ ...a, aberto: false }))} aoCriado={trocarCliente} />
        <VeiculoRapido
          key={`v${veiculoRapido.abertura}`}
          aberto={veiculoRapido.aberto}
          clienteId={clienteId}
          aoFechar={() => setVeiculoRapido((a) => ({ ...a, aberto: false }))}
          aoCriado={(id) => setVeiculoId(id)}
        />
      </SheetContent>
    </Sheet>
  );
}
