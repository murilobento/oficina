import { usePessoas } from "@/features/pessoas/api";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { useSalvarVeiculo } from "./api";
import { CampoModeloFipe } from "./campo-modelo-fipe";
import { anosModelo } from "./fipe";

import { CampoAtivo, CampoSelect, CampoTexto, CampoTextarea } from "@/components/layout/campos-form";
import { SecaoFormulario } from "@/components/layout/registro-partes";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CampoCliente } from "@/features/pessoas/campo-cliente";
import { ClienteRapido } from "@/features/pessoas/cliente-rapido";

import {
  CAMBIOS,
  COMBUSTIVEIS,
  esquemaVeiculo,
  FORM_VAZIO,
  mascararPlaca,
  paraFormulario,
  paraVeiculo,
  type Veiculo,
  type VeiculoFormValores,
} from "./tipos";

const PREFIXO = "veiculo";
const soDigitos = (limite: number) => (valor: string) => valor.replace(/\D/g, "").slice(0, limite);

/**
 * Painel lateral de cadastro e edição de veículo. `veiculo` preenchido = edição; `null` = novo
 * (`clienteInicial` já escolhe o dono, quando se cadastra a partir do cliente). Quem usa deve
 * trocar a `key` a cada abertura, para o formulário começar limpo.
 */
export function VeiculoForm({
  aberto,
  veiculo,
  clienteInicial = "",
  aoFechar,
}: {
  aberto: boolean;
  veiculo: Veiculo | null;
  clienteInicial?: string;
  aoFechar: () => void;
}) {
  const salvar = useSalvarVeiculo();
  const clientes = usePessoas("cliente");
  const [clienteRapido, setClienteRapido] = useState({ aberto: false, nome: "", abertura: 0 });

  const editando = veiculo !== null;
  const form = useForm<VeiculoFormValores>({
    resolver: zodResolver(esquemaVeiculo),
    defaultValues: veiculo ? paraFormulario(veiculo) : { ...FORM_VAZIO, clienteId: clienteInicial },
  });
  const { control } = form;
  // Anos da lista; um ano antigo já cadastrado fora dela continua aparecendo.
  const anoAtual = form.getValues("ano");
  const opcoesAno = [...new Set([...anosModelo(), ...(anoAtual ? [anoAtual] : [])])].map((ano) => ({ valor: ano, texto: ano }));

  const clientesDisponiveis = clientes
    .filter((cliente) => cliente.ativo || cliente.id === veiculo?.clienteId || cliente.id === clienteInicial)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  function cadastrarCliente(nome: string) {
    setClienteRapido((atual) => ({ aberto: true, nome, abertura: atual.abertura + 1 }));
  }

  const enviar = form.handleSubmit(async (valores) => {
    try {
      await salvar.mutateAsync({ id: veiculo?.id, dados: paraVeiculo(valores) });
    } catch (erro) {
      const campos = (erro as { campos?: Record<string, string> }).campos ?? {};
      const primeiro = Object.keys(campos)[0];
      for (const [campo, texto] of Object.entries(campos)) {
        form.setError(campo as keyof VeiculoFormValores, { message: texto }, { shouldFocus: campo === primeiro });
      }
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar. Tente de novo.");
      return;
    }
    toast.success(veiculo ? "Veículo atualizado." : "Veículo cadastrado.");
    aoFechar();
  });

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-xl!">
        <SheetHeader className="border-b">
          <SheetTitle>{editando ? "Editar veículo" : "Novo veículo"}</SheetTitle>
          <SheetDescription>Só o cliente e o modelo são obrigatórios.</SheetDescription>
        </SheetHeader>

        <form noValidate onSubmit={enviar} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-8 overflow-y-auto p-4">
            <SecaoFormulario titulo="Dono do veículo">
              <Controller
                control={control}
                name="clienteId"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="veiculo-clienteId">Cliente</FieldLabel>
                    <div className="flex gap-2">
                      <CampoCliente
                        id="veiculo-clienteId"
                        valor={field.value}
                        clientes={clientesDisponiveis}
                        invalido={fieldState.invalid}
                        aoMudar={(id) => field.onChange(id)}
                        aoCadastrar={cadastrarCliente}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Cadastrar novo cliente"
                        title="Novo cliente"
                        onClick={() => cadastrarCliente("")}
                      >
                        <UserPlus />
                      </Button>
                    </div>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </SecaoFormulario>

            <SecaoFormulario titulo="Identificação">
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoModeloFipe form={form} prefixo={PREFIXO} emEdicao={editando} />
                <CampoTexto control={control} prefixo={PREFIXO} nome="placa" rotulo="Placa (opcional)" placeholder="ABC-1D23" mascara={mascararPlaca} />
                <CampoSelect control={control} prefixo={PREFIXO} nome="ano" rotulo="Ano (opcional)" opcoes={opcoesAno} />
                <CampoTexto control={control} prefixo={PREFIXO} nome="cor" rotulo="Cor (opcional)" />
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="km"
                  rotulo="Km atual (opcional)"
                  descricao="Sobe sozinho quando um orçamento registra um km maior."
                  inputMode="numeric"
                  placeholder="48200"
                  mascara={soDigitos(7)}
                />
              </div>
            </SecaoFormulario>

            <SecaoFormulario titulo="Mecânica">
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoSelect control={control} prefixo={PREFIXO} nome="combustivel" rotulo="Combustível (opcional)" opcoes={COMBUSTIVEIS} />
                <CampoSelect control={control} prefixo={PREFIXO} nome="cambio" rotulo="Câmbio (opcional)" opcoes={CAMBIOS} />
                <CampoTexto control={control} prefixo={PREFIXO} nome="motor" rotulo="Motorização (opcional)" placeholder="1.0, 1.6 16V..." />
              </div>
            </SecaoFormulario>

            <SecaoFormulario titulo="Outras informações">
              <div className="flex flex-col gap-5">
                <CampoTextarea
                  control={control}
                  prefixo={PREFIXO}
                  nome="observacoes"
                  rotulo="Observações do carro (opcional)"
                  descricao="Ex.: pneu desgastado, riscos na lateral, peça já trocada."
                  linhas={3}
                />
                <CampoAtivo
                  control={control}
                  prefixo={PREFIXO}
                  nome="ativo"
                  titulo="Veículo ativo"
                  descricao="Inativo continua no histórico, mas deixa de aparecer para novos orçamentos."
                />
              </div>
            </SecaoFormulario>
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none">
              {editando ? "Salvar alterações" : "Cadastrar veículo"}
            </Button>
          </SheetFooter>
        </form>

        <ClienteRapido
          key={clienteRapido.abertura}
          aberto={clienteRapido.aberto}
          nomeInicial={clienteRapido.nome}
          aoFechar={() => setClienteRapido((atual) => ({ ...atual, aberto: false }))}
          aoCriado={(id) => form.setValue("clienteId", id, { shouldDirty: true, shouldValidate: true })}
        />
      </SheetContent>
    </Sheet>
  );
}
