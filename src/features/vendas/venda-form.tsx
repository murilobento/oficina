import { useProdutos } from "@/features/produtos/api";
import { useVeiculos } from "@/features/veiculos/api";
import { usePessoas } from "@/features/pessoas/api";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { CarFront, TriangleAlert, UserPlus, X } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CampoTexto, CampoTextarea } from "@/components/layout/campos-form";
import { FolhaAbas } from "@/components/layout/folha-abas";
import { SecaoFormulario } from "@/components/layout/registro-partes";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { itensSemSaldo } from "@/features/estoque/movimentar";
import { calcularTotais } from "@/features/orcamentos/calculo";
import { ItensDoDocumento } from "@/features/orcamentos/itens-form";
import { ResumoTotais } from "@/features/orcamentos/orcamento-partes";
import { CampoCliente } from "@/features/pessoas/campo-cliente";
import { ClienteRapido } from "@/features/pessoas/cliente-rapido";
import { veiculoEmTexto } from "@/features/veiculos/tipos";
import { VeiculoRapido } from "@/features/veiculos/veiculo-rapido";
import { formatarBRL, formatarQuantidade, mascararMoeda, mascararQuantidade, textoParaCentavos, textoParaNumero } from "@/lib/numeros";
import { useEnvioUnico } from "@/lib/envio-unico";

import { useRegistrarVenda } from "./api";
import { usePode } from "@/features/auth/sessao";
import type { CorpoRecebimento } from "./pagamentos";
import { RecebimentoEtapa } from "./recebimento-etapa";
import { esquemaVenda, FORM_VAZIO, paraVenda, type VendaFormValores } from "./tipos";

const soDigitos = (limite: number) => (valor: string) => valor.replace(/\D/g, "").slice(0, limite);

/**
 * Painel lateral de lançamento manual de venda (sem orçamento). Venda lançada já vale: dá baixa
 * no estoque e só pode ser cancelada depois. Quem usa deve trocar a `key` a cada abertura.
 */
/** Campos da aba "Cliente e itens" e da aba "Pagamento". */
const CAMPOS_ABA_DADOS = ["clienteId", "veiculoId", "km", "itens"] as const;
const CAMPOS_ABA_VALORES: string[] = ["descontoTipo", "desconto", "observacoes"];

export function VendaForm({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const clientes = usePessoas("cliente");
  const veiculos = useVeiculos();
  const [clienteRapido, setClienteRapido] = useState({ aberto: false, nome: "", abertura: 0 });
  const [veiculoRapido, setVeiculoRapido] = useState({ aberto: false, abertura: 0 });

  const { enviando, enviar: enviarUnico, proteger } = useEnvioUnico();

  const form = useForm<VendaFormValores>({ resolver: zodResolver(esquemaVenda), defaultValues: FORM_VAZIO });
  const { control, formState } = form;
  const clienteId = useWatch({ control, name: "clienteId" });
  const veiculoId = useWatch({ control, name: "veiculoId" });
  const itens = useWatch({ control, name: "itens" });
  const descontoTipo = useWatch({ control, name: "descontoTipo" });
  const desconto = useWatch({ control, name: "desconto" });

  const totais = calcularTotais(
    itens.map((item) => ({ tipo: item.tipo, quantidade: textoParaNumero(item.quantidade) || 0, valor: textoParaCentavos(item.valor) })),
    descontoTipo,
    descontoTipo === "valor" ? textoParaCentavos(desconto) : textoParaNumero(desconto) || 0,
  );
  const verValores = usePode("valores.ver");
  const [aba, setAba] = useState("dados");
  const registrar = useRegistrarVenda();
  const produtos = useProdutos();
  const faltas = itensSemSaldo(
    itens.filter((item) => item.tipo === "produto").map((item) => ({ origemId: item.origemId, quantidade: textoParaNumero(item.quantidade) || 0 })),
    produtos,
  );

  const clientesDisponiveis = clientes.filter((c) => c.ativo).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const veiculosDisponiveis = veiculos
    .filter((v) => v.clienteId === clienteId && v.ativo)
    .sort((a, b) => a.modelo.localeCompare(b.modelo, "pt-BR"));

  function trocarCliente(id: string) {
    if (id === clienteId) return;
    form.setValue("clienteId", id, { shouldDirty: true });
    form.setValue("veiculoId", "", { shouldDirty: true });
    form.setValue("km", "", { shouldDirty: true });
  }

  function escolherVeiculo(id: string, kmSugerido?: number) {
    form.setValue("veiculoId", id, { shouldDirty: true });
    const km = kmSugerido ?? veiculos.find((v) => v.id === id)?.km ?? 0;
    form.setValue("km", id !== "" && km > 0 ? String(km) : "", { shouldDirty: true });
  }

  function trocarTipoDesconto(novo: "valor" | "percentual") {
    if (novo === descontoTipo) return;
    form.setValue("descontoTipo", novo, { shouldDirty: true });
    form.setValue("desconto", "", { shouldDirty: true });
    form.clearErrors("desconto");
  }

  /** "Continuar para pagamento": confere cliente, veículo e itens antes de abrir a aba Pagamento. */
  const enviar = enviarUnico(form, () => setAba("pagamento"), () => setAba("dados"));

  async function trocarAba(id: string) {
    if (id === "pagamento" && !(await form.trigger(CAMPOS_ABA_DADOS))) return setAba("dados");
    setAba(id);
  }

  // Lança com os valores atuais do formulário (o desconto pode ter mudado na aba Pagamento).
  const concluir = proteger(async (corpo: CorpoRecebimento) => {
    const valido = await form.trigger();
    if (!valido) {
      setAba(Object.keys(form.formState.errors).some((c) => !CAMPOS_ABA_VALORES.includes(c)) ? "dados" : "pagamento");
      return;
    }
    try {
      const venda = await registrar.mutateAsync({ ...paraVenda(form.getValues()), ...corpo });
      toast.success(venda.saldo > 0 ? `${venda.numero} lançada. Saldo a receber: ${formatarBRL(venda.saldo)}.` : `${venda.numero} lançada.`);
      aoFechar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível lançar a venda. Tente de novo.");
    }
  });

  const erroItens = formState.errors.itens?.message ?? formState.errors.itens?.root?.message;

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-2xl!">
        <SheetHeader className="border-b">
          <SheetTitle>Nova venda</SheetTitle>
          <SheetDescription>Lançamento direto, sem orçamento. Sem cliente, a venda é de consumidor final.</SheetDescription>
        </SheetHeader>

        <form noValidate onSubmit={enviar} className="flex min-h-0 flex-1 flex-col">
<FolhaAbas
            valor={aba}
            aoMudar={trocarAba}
            abas={[
              { id: "dados", titulo: "Cliente e itens", comErro: Object.keys(formState.errors).some((c) => !CAMPOS_ABA_VALORES.includes(c)), conteudo: (
                <>
            <SecaoFormulario titulo="Cliente e veículo" descricao="Opcional: peça vendida no balcão não precisa de cadastro.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field className="gap-1.5 sm:col-span-2">
                  <FieldLabel htmlFor="venda-clienteId">Cliente</FieldLabel>
                  <div className="flex gap-2">
                    <CampoCliente
                      id="venda-clienteId"
                      valor={clienteId}
                      clientes={clientesDisponiveis}
                      aoMudar={trocarCliente}
                      aoCadastrar={(nome) => setClienteRapido((atual) => ({ aberto: true, nome, abertura: atual.abertura + 1 }))}
                    />
                    {clienteId !== "" && (
                      <Button type="button" variant="outline" size="icon" aria-label="Tirar cliente (consumidor final)" title="Consumidor final" onClick={() => trocarCliente("")}>
                        <X />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Cadastrar novo cliente"
                      title="Novo cliente"
                      onClick={() => setClienteRapido((atual) => ({ aberto: true, nome: "", abertura: atual.abertura + 1 }))}
                    >
                      <UserPlus />
                    </Button>
                  </div>
                  {clienteId === "" && <p className="text-muted-foreground text-sm">Consumidor final</p>}
                </Field>

                {clienteId !== "" && (
                  <>
                    <Field className="gap-1.5 sm:col-span-2">
                      <FieldLabel htmlFor="venda-veiculoId">Veículo (opcional)</FieldLabel>
                      <div className="flex gap-2">
                        <NativeSelect id="venda-veiculoId" className="w-full uppercase" value={veiculoId} onChange={(evento) => escolherVeiculo(evento.target.value)}>
                          <NativeSelectOption value="">{veiculosDisponiveis.length === 0 ? "Nenhum veículo cadastrado" : "Sem veículo"}</NativeSelectOption>
                          {veiculosDisponiveis.map((v) => (
                            <NativeSelectOption key={v.id} value={v.id} className="uppercase">
                              {veiculoEmTexto(v)}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Cadastrar novo veículo"
                          title="Novo veículo"
                          onClick={() => setVeiculoRapido((atual) => ({ aberto: true, abertura: atual.abertura + 1 }))}
                        >
                          <CarFront />
                        </Button>
                      </div>
                    </Field>
                    {veiculoId !== "" && (
                      <CampoTexto control={control} prefixo="venda" nome="km" rotulo="Quilometragem (opcional)" inputMode="numeric" placeholder="48200" mascara={soDigitos(7)} />
                    )}
                  </>
                )}
              </div>
            </SecaoFormulario>

            <ItensDoDocumento control={control} prefixo="venda" documento="venda" erro={erroItens} />

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
                  <p className="mt-1">A venda pode ser lançada, mas o saldo ficará negativo até a entrada da compra.</p>
                </div>
              </div>
            )}
                </>
              ) },
              { id: "pagamento", titulo: "Pagamento", comErro: Object.keys(formState.errors).some((c) => CAMPOS_ABA_VALORES.includes(c)), conteudo: (
                <>
            <SecaoFormulario titulo="Desconto">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field className="gap-1.5 sm:col-span-2">
                  <FieldLabel id="venda-desconto-tipo">Tipo de desconto</FieldLabel>
                  <div role="radiogroup" aria-labelledby="venda-desconto-tipo" className="flex flex-wrap gap-2">
                    {(
                      [
                        ["percentual", "Em %"],
                        ["valor", "Em R$"],
                      ] as const
                    ).map(([valor, texto]) => (
                      <Button key={valor} type="button" role="radio" aria-checked={descontoTipo === valor} variant={descontoTipo === valor ? "default" : "outline"} onClick={() => trocarTipoDesconto(valor)}>
                        {texto}
                      </Button>
                    ))}
                  </div>
                </Field>
                <CampoTexto
                  control={control}
                  prefixo="venda"
                  nome="desconto"
                  rotulo={descontoTipo === "valor" ? "Desconto (R$) (opcional)" : "Desconto (%) (opcional)"}
                  inputMode={descontoTipo === "valor" ? "numeric" : "decimal"}
                  placeholder={descontoTipo === "valor" ? "0,00" : "0"}
                  mascara={descontoTipo === "valor" ? mascararMoeda : mascararQuantidade}
                />
              </div>
            </SecaoFormulario>

            <SecaoFormulario titulo="Outras informações">
              <CampoTextarea control={control} prefixo="venda" nome="observacoes" rotulo="Observações (opcional)" linhas={3} />
            </SecaoFormulario>

            <ResumoTotais totais={totais} className="rounded-md border p-3" />

            <RecebimentoEtapa modo="venda" total={totais.total} temCliente={clienteId !== ""} enviando={registrar.isPending} aoConcluir={concluir} />
                </>
              ) },
            ]}
          />

          {aba === "dados" && (
          <>
          <div className="border-t px-4 py-3">
            <ResumoTotais totais={totais} />
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" disabled={enviando || registrar.isPending}>
              <span className="sm:hidden">Continuar</span>
              <span className="hidden sm:inline">Continuar para pagamento</span>
              {verValores && <span className="font-mono">· {formatarBRL(totais.total)}</span>}
            </Button>
          </SheetFooter>
          </>
          )}
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
