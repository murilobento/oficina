import { useVeiculos } from "@/features/veiculos/api";
import { useEnvioUnico } from "@/lib/envio-unico";
import { usePessoas } from "@/features/pessoas/api";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { CarFront, UserPlus } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CampoTexto, CampoTextarea } from "@/components/layout/campos-form";
import { SecaoFormulario } from "@/components/layout/registro-partes";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEmpresa } from "@/features/empresa/api";
import { CampoCliente } from "@/features/pessoas/campo-cliente";
import { ClienteRapido } from "@/features/pessoas/cliente-rapido";
import { historicoDoVeiculo, kmAbaixoDoUltimo } from "@/features/veiculos/historico";
import { veiculoEmTexto } from "@/features/veiculos/tipos";
import { VeiculoRapido } from "@/features/veiculos/veiculo-rapido";
import {
  mascararMoeda,
  mascararQuantidade,
  textoParaCentavos,
  textoParaNumero,
} from "@/lib/numeros";

import { calcularTotais } from "./calculo";
import { ResumoTotais } from "./orcamento-partes";
import { useOrcamentos, useSalvarOrcamento } from "./api";
import { ItensDoDocumento } from "./itens-form";
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
  const orcamentos = useOrcamentos();
  const salvar = useSalvarOrcamento();
  const clientes = usePessoas("cliente");
  const veiculos = useVeiculos();
  const empresa = useEmpresa();

  // Cadastro rápido de cliente: `abertura` troca a key para o formulário abrir limpo.
  const [clienteRapido, setClienteRapido] = useState({ aberto: false, nome: "", abertura: 0 });
  const [veiculoRapido, setVeiculoRapido] = useState({ aberto: false, abertura: 0 });
  const editando = orcamento !== null;

  const { enviando, enviar: enviarUnico } = useEnvioUnico();

  const form = useForm<OrcamentoFormValores>({
    resolver: zodResolver(esquemaOrcamento),
    // Orçamento novo já vem com a validade e as condições definidas em Administração > Empresa.
    defaultValues: orcamento
      ? paraFormulario(orcamento)
      : { ...FORM_VAZIO, validadeDias: String(empresa.validadeOrcamentoDias), observacoes: empresa.condicoesOrcamento },
  });
  const { control, formState } = form;

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

  function trocarTipoDesconto(novo: "valor" | "percentual") {
    if (novo === descontoTipo) return;
    form.setValue("descontoTipo", novo, { shouldDirty: true });
    form.setValue("desconto", "", { shouldDirty: true });
    form.clearErrors("desconto");
  }

  const enviar = enviarUnico(form, async (valores) => {
    // A API grava o orçamento e sobe o km do carro quando a visita registra um valor maior.
    try {
      const salvo = await salvar.mutateAsync({ id: orcamento?.id, dados: paraOrcamento(valores) });
      toast.success(orcamento ? `${salvo.numero} atualizado.` : `${salvo.numero} criado como rascunho.`);
      aoFechar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar. Tente de novo.");
    }
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

            <ItensDoDocumento control={control} prefixo={PREFIXO} documento="orçamento" erro={erroItens} />

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
            <Button type="submit" className="flex-1 sm:flex-none" disabled={enviando || salvar.isPending}>
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
      </SheetContent>
    </Sheet>
  );
}
