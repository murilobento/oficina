import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CampoTexto, CampoTextarea } from "@/components/layout/campos-form";
import { SecaoFormulario } from "@/components/layout/registro-partes";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CLIENTES } from "@/features/pessoas/entidades";
import {
  centavosParaTexto,
  formatarBRL,
  mascararMoeda,
  mascararQuantidade,
  proximoCodigo,
  textoParaCentavos,
  textoParaNumero,
} from "@/lib/numeros";

import { calcularTotais, subtotalItem } from "./calculo";
import { CampoCliente } from "./campo-cliente";
import { ClienteRapido } from "./cliente-rapido";
import { ResumoTotais } from "./orcamento-partes";
import { type ItemEscolhido, SeletorItem } from "./seletor-item";
import { useOrcamentosStore } from "./store";
import {
  esquemaOrcamento,
  FORM_VAZIO,
  mascararPlaca,
  type Orcamento,
  type OrcamentoFormValores,
  paraFormulario,
  paraOrcamento,
} from "./tipos";

const PREFIXO = "orcamento";
const soDigitos = (limite: number) => (valor: string) => valor.replace(/\D/g, "").slice(0, limite);

/**
 * Painel lateral de criação e edição de orçamento. `orcamento` preenchido = edição; `null` = novo.
 * Quem usa deve trocar a `key` a cada abertura, para o formulário começar limpo.
 */
export function OrcamentoForm({
  aberto,
  orcamento,
  aoFechar,
}: {
  aberto: boolean;
  orcamento: Orcamento | null;
  aoFechar: () => void;
}) {
  const orcamentos = useOrcamentosStore((estado) => estado.itens);
  const adicionar = useOrcamentosStore((estado) => estado.adicionar);
  const atualizar = useOrcamentosStore((estado) => estado.atualizar);
  const clientes = CLIENTES.useStore((estado) => estado.pessoas);

  const [seletorAberto, setSeletorAberto] = useState(false);
  // Cadastro rápido de cliente: `abertura` troca a key para o formulário abrir limpo.
  const [clienteRapido, setClienteRapido] = useState({ aberto: false, nome: "", abertura: 0 });
  const editando = orcamento !== null;

  const form = useForm<OrcamentoFormValores>({
    resolver: zodResolver(esquemaOrcamento),
    defaultValues: orcamento ? paraFormulario(orcamento) : FORM_VAZIO,
  });
  const { control, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "itens" });

  const itens = useWatch({ control, name: "itens" });
  const descontoTipo = useWatch({ control, name: "descontoTipo" });
  const desconto = useWatch({ control, name: "desconto" });

  const totais = calcularTotais(
    itens.map((item) => ({
      tipo: item.tipo,
      quantidade: textoParaNumero(item.quantidade) || 0,
      valor: textoParaCentavos(item.valor),
    })),
    descontoTipo,
    descontoTipo === "valor" ? textoParaCentavos(desconto) : textoParaNumero(desconto) || 0,
  );

  // Clientes ativos; o já escolhido continua na lista mesmo se foi inativado depois.
  const clientesDisponiveis = clientes
    .filter((cliente) => cliente.ativo || cliente.id === orcamento?.clienteId)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  function cadastrarCliente(nome: string) {
    setClienteRapido((atual) => ({ aberto: true, nome, abertura: atual.abertura + 1 }));
  }

  function adicionarItem(escolhido: ItemEscolhido) {
    append({
      id: crypto.randomUUID(),
      tipo: escolhido.tipo,
      origemId: escolhido.origemId,
      descricao: escolhido.descricao,
      unidade: escolhido.unidade,
      quantidade: "1",
      valor: centavosParaTexto(escolhido.valor),
    });
  }

  function trocarTipoDesconto(novo: "valor" | "percentual") {
    if (novo === descontoTipo) return;
    form.setValue("descontoTipo", novo, { shouldDirty: true });
    form.setValue("desconto", "", { shouldDirty: true });
    form.clearErrors("desconto");
  }

  const enviar = form.handleSubmit((valores) => {
    const dados = paraOrcamento(valores);
    if (orcamento) {
      atualizar(orcamento.id, dados);
      toast.success(`${orcamento.numero} atualizado.`);
    } else {
      const criado = adicionar({
        ...dados,
        numero: proximoCodigo("ORC", orcamentos.map((item) => item.numero)),
        status: "rascunho",
      });
      toast.success(`${criado.numero} criado como rascunho.`);
    }
    aoFechar();
  });

  const erroItens = formState.errors.itens?.message ?? formState.errors.itens?.root?.message;

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-2xl!">
        <SheetHeader className="border-b">
          <SheetTitle>{editando ? `Editar ${orcamento.numero}` : "Novo orçamento"}</SheetTitle>
          <SheetDescription>Cliente, veículo e ao menos um item. O restante é opcional.</SheetDescription>
        </SheetHeader>

        <form noValidate onSubmit={enviar} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-8 overflow-y-auto p-4">
            <SecaoFormulario titulo="Cliente">
              <Controller
                control={control}
                name="clienteId"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="orcamento-clienteId">Cliente</FieldLabel>
                    <div className="flex gap-2">
                      <CampoCliente
                        id="orcamento-clienteId"
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

            <SecaoFormulario titulo="Veículo">
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="modelo"
                  rotulo="Marca e modelo"
                  placeholder="Ex.: Hyundai HB20 1.0"
                  className="sm:col-span-2"
                />
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="placa"
                  rotulo="Placa (opcional)"
                  placeholder="ABC-1D23"
                  mascara={mascararPlaca}
                />
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="ano"
                  rotulo="Ano (opcional)"
                  inputMode="numeric"
                  placeholder="2019"
                  mascara={soDigitos(4)}
                />
                <CampoTexto control={control} prefixo={PREFIXO} nome="cor" rotulo="Cor (opcional)" />
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="km"
                  rotulo="Quilometragem (opcional)"
                  inputMode="numeric"
                  placeholder="48200"
                  mascara={soDigitos(7)}
                />
                <CampoTextarea
                  control={control}
                  prefixo={PREFIXO}
                  nome="problema"
                  rotulo="Problema relatado (opcional)"
                  descricao="O que o cliente contou: barulho, luz acesa, vibração..."
                  className="sm:col-span-2"
                  linhas={2}
                />
              </div>
            </SecaoFormulario>

            <SecaoFormulario titulo="Itens" descricao="Peças e serviços. Preço e quantidade podem ser ajustados neste orçamento.">
              <div className="flex flex-col gap-3">
                {fields.map((campo, indice) => {
                  const tipo = itens[indice]?.tipo ?? campo.tipo;
                  const subtotal = subtotalItem({
                    quantidade: textoParaNumero(itens[indice]?.quantidade ?? "") || 0,
                    valor: textoParaCentavos(itens[indice]?.valor ?? ""),
                  });
                  return (
                    <div key={campo.id} className="bg-card flex flex-col gap-3 rounded-xl border p-3">
                      <div className="flex items-start gap-2">
                        <CampoTexto
                          control={control}
                          prefixo={PREFIXO}
                          nome={`itens.${indice}.descricao`}
                          rotulo={tipo === "servico" ? "Serviço" : "Peça"}
                          className="min-w-0 flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground mt-6 shrink-0"
                          aria-label={`Remover item ${indice + 1}`}
                          onClick={() => remove(indice)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <CampoTexto
                          control={control}
                          prefixo={PREFIXO}
                          nome={`itens.${indice}.quantidade`}
                          rotulo={`Quantidade (${itens[indice]?.unidade || "UN"})`}
                          inputMode="decimal"
                          mascara={mascararQuantidade}
                        />
                        <CampoTexto
                          control={control}
                          prefixo={PREFIXO}
                          nome={`itens.${indice}.valor`}
                          rotulo="Valor unitário (R$)"
                          inputMode="numeric"
                          placeholder="0,00"
                          mascara={mascararMoeda}
                        />
                      </div>
                      <p className="text-muted-foreground text-right text-sm tabular-nums">
                        Subtotal <span className="text-foreground font-medium">{formatarBRL(subtotal)}</span>
                      </p>
                    </div>
                  );
                })}

                <Button type="button" variant="outline" onClick={() => setSeletorAberto(true)}>
                  <Plus /> Adicionar item
                </Button>
                {erroItens && (
                  <p role="alert" className="text-destructive text-sm">
                    {erroItens}
                  </p>
                )}
              </div>
            </SecaoFormulario>

            <SecaoFormulario titulo="Desconto e validade">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field className="gap-1.5 sm:col-span-2">
                  <FieldLabel id="orcamento-desconto-tipo">Tipo de desconto</FieldLabel>
                  <div role="radiogroup" aria-labelledby="orcamento-desconto-tipo" className="flex flex-wrap gap-2">
                    {(
                      [
                        ["percentual", "Em %"],
                        ["valor", "Em R$"],
                      ] as const
                    ).map(([valor, texto]) => (
                      <Button
                        key={valor}
                        type="button"
                        role="radio"
                        aria-checked={descontoTipo === valor}
                        variant={descontoTipo === valor ? "default" : "outline"}
                        onClick={() => trocarTipoDesconto(valor)}
                      >
                        {texto}
                      </Button>
                    ))}
                  </div>
                </Field>
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="desconto"
                  rotulo={descontoTipo === "valor" ? "Desconto (R$) (opcional)" : "Desconto (%) (opcional)"}
                  inputMode={descontoTipo === "valor" ? "numeric" : "decimal"}
                  placeholder={descontoTipo === "valor" ? "0,00" : "0"}
                  mascara={descontoTipo === "valor" ? mascararMoeda : mascararQuantidade}
                />
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="validadeDias"
                  rotulo="Validade (dias)"
                  inputMode="numeric"
                  mascara={soDigitos(2)}
                />
              </div>
            </SecaoFormulario>

            <SecaoFormulario titulo="Para o cliente">
              <CampoTextarea
                control={control}
                prefixo={PREFIXO}
                nome="observacoes"
                rotulo="Observações (opcional)"
                descricao="Aparecem na impressão. Ex.: prazo de execução, forma de pagamento."
                linhas={3}
              />
            </SecaoFormulario>
          </div>

          <div className="border-t px-4 py-3">
            <ResumoTotais totais={totais} />
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none">
              {editando ? "Salvar alterações" : "Criar orçamento"}
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
        <SeletorItem aberto={seletorAberto} aoFechar={() => setSeletorAberto(false)} aoEscolher={adicionarItem} />
      </SheetContent>
    </Sheet>
  );
}
