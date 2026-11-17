import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { CarFront, Plus, Trash2, UserPlus } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CampoTexto, CampoTextarea } from "@/components/layout/campos-form";
import { SecaoFormulario } from "@/components/layout/registro-partes";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEmpresa } from "@/features/empresa/store";
import { CampoCliente } from "@/features/pessoas/campo-cliente";
import { ClienteRapido } from "@/features/pessoas/cliente-rapido";
import { CLIENTES } from "@/features/pessoas/entidades";
import { historicoDoVeiculo, kmAbaixoDoUltimo } from "@/features/veiculos/historico";
import { useVeiculosStore } from "@/features/veiculos/store";
import { veiculoEmTexto } from "@/features/veiculos/tipos";
import { VeiculoRapido } from "@/features/veiculos/veiculo-rapido";
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
import { ResumoTotais } from "./orcamento-partes";
import { type ItemEscolhido, SeletorItem } from "./seletor-item";
import { useOrcamentosStore } from "./store";
import {
  esquemaOrcamento,
  FORM_VAZIO,
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
  const veiculos = useVeiculosStore((estado) => estado.itens);
  const atualizarVeiculo = useVeiculosStore((estado) => estado.atualizar);
  const empresa = useEmpresa();

  const [seletorAberto, setSeletorAberto] = useState(false);
  // Cadastro rápido de cliente: `abertura` troca a key para o formulário abrir limpo.
  const [clienteRapido, setClienteRapido] = useState({ aberto: false, nome: "", abertura: 0 });
  const [veiculoRapido, setVeiculoRapido] = useState({ aberto: false, abertura: 0 });
  const editando = orcamento !== null;

  const form = useForm<OrcamentoFormValores>({
    resolver: zodResolver(esquemaOrcamento),
    // Orçamento novo já vem com a validade e as condições definidas em Administração > Empresa.
    defaultValues: orcamento
      ? paraFormulario(orcamento)
      : { ...FORM_VAZIO, validadeDias: String(empresa.validadeOrcamentoDias), observacoes: empresa.condicoesOrcamento },
  });
  const { control, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "itens" });

  const clienteId = useWatch({ control, name: "clienteId" });
  const veiculoId = useWatch({ control, name: "veiculoId" });
  const kmTexto = useWatch({ control, name: "km" });
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

  // Veículos do cliente escolhido; o já usado neste orçamento continua na lista mesmo se inativado.
  const veiculosDisponiveis = veiculos
    .filter((v) => v.clienteId === clienteId && (v.ativo || v.id === orcamento?.veiculoId))
    .sort((a, b) => a.modelo.localeCompare(b.modelo, "pt-BR"));
  const veiculo = veiculos.find((v) => v.id === veiculoId);
  // Histórico do carro sem contar este próprio orçamento (na edição).
  const historico = veiculo
    ? historicoDoVeiculo(
        orcamentos.filter((o) => o.id !== orcamento?.id),
        veiculo.id,
      )
    : null;
  const kmBaixo = historico ? kmAbaixoDoUltimo(Number(kmTexto || 0), historico.ultimoKm) : false;

  function trocarCliente(id: string) {
    if (id === clienteId) return;
    form.setValue("clienteId", id, { shouldDirty: true, shouldValidate: true });
    // O carro é do cliente: ao trocar de cliente, a escolha anterior não vale mais.
    form.setValue("veiculoId", "", { shouldDirty: true });
    form.setValue("km", "", { shouldDirty: true });
  }

  function escolherVeiculo(id: string, kmSugerido?: number) {
    form.setValue("veiculoId", id, { shouldDirty: true, shouldValidate: true });
    const escolhido = veiculos.find((v) => v.id === id);
    const km = kmSugerido ?? escolhido?.km ?? 0;
    form.setValue("km", km > 0 ? String(km) : "", { shouldDirty: true });
  }

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
    // O carro guarda o km mais recente: sobe quando a visita registra um valor maior.
    const alvo = veiculos.find((v) => v.id === dados.veiculoId);
    if (alvo && dados.km > alvo.km) atualizarVeiculo(alvo.id, { km: dados.km });
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
                        aoMudar={trocarCliente}
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
                <Controller
                  control={control}
                  name="veiculoId"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5 sm:col-span-2" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="orcamento-veiculoId">Veículo do cliente</FieldLabel>
                      <div className="flex gap-2">
                        <NativeSelect
                          id="orcamento-veiculoId"
                          className="w-full"
                          disabled={!clienteId}
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={(evento) => escolherVeiculo(evento.target.value)}
                          aria-invalid={fieldState.invalid}
                        >
                          <NativeSelectOption value="">
                            {!clienteId
                              ? "Escolha o cliente primeiro"
                              : veiculosDisponiveis.length === 0
                                ? "Nenhum veículo cadastrado"
                                : "Selecione o veículo"}
                          </NativeSelectOption>
                          {veiculosDisponiveis.map((v) => (
                            <NativeSelectOption key={v.id} value={v.id}>
                              {veiculoEmTexto(v)}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={!clienteId}
                          aria-label="Cadastrar novo veículo"
                          title="Novo veículo"
                          onClick={() => setVeiculoRapido((atual) => ({ aberto: true, abertura: atual.abertura + 1 }))}
                        >
                          <CarFront />
                        </Button>
                      </div>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                {veiculo && historico && (
                  <div
                    data-testid="resumo-veiculo"
                    className="bg-muted/50 text-muted-foreground flex flex-col gap-1 rounded-lg border p-3 text-sm sm:col-span-2"
                  >
                    {historico.ultimaVisita ? (
                      <>
                        <p>
                          Última visita em{" "}
                          <span className="text-foreground font-medium">
                            {new Date(historico.ultimaVisita).toLocaleDateString("pt-BR")}
                          </span>
                          {historico.ultimoKm > 0 && (
                            <>
                              , com <span className="text-foreground font-medium">{historico.ultimoKm.toLocaleString("pt-BR")} km</span>
                            </>
                          )}
                          . {historico.realizadas} {historico.realizadas === 1 ? "serviço realizado" : "visitas realizadas"} no total.
                        </p>
                        {historico.aplicados.length > 0 && (
                          <p>
                            Feito por último:{" "}
                            {historico.aplicados
                              .filter((a) => a.tipo === "servico")
                              .slice(0, 3)
                              .map((a) => a.descricao)
                              .join(", ") || "só peças"}
                            .
                          </p>
                        )}
                      </>
                    ) : (
                      <p>Primeira visita deste veículo.</p>
                    )}
                  </div>
                )}
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="km"
                  rotulo="Quilometragem desta visita (opcional)"
                  inputMode="numeric"
                  placeholder="48200"
                  mascara={soDigitos(7)}
                />
                {kmBaixo && historico && (
                  <FieldDescription role="status" className="text-amber-600 sm:col-span-2 dark:text-amber-400">
                    Atenção: a última visita registrou {historico.ultimoKm.toLocaleString("pt-BR")} km, mais que este valor.
                  </FieldDescription>
                )}
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
          aoCriado={(id) => trocarCliente(id)}
        />
        <VeiculoRapido
          key={`v${veiculoRapido.abertura}`}
          aberto={veiculoRapido.aberto}
          clienteId={clienteId}
          aoFechar={() => setVeiculoRapido((atual) => ({ ...atual, aberto: false }))}
          aoCriado={(id, km) => escolherVeiculo(id, km)}
        />
        <SeletorItem aberto={seletorAberto} aoFechar={() => setSeletorAberto(false)} aoEscolher={adicionarItem} />
      </SheetContent>
    </Sheet>
  );
}
