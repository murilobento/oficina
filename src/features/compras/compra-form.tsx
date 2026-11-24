import { usePessoas } from "@/features/pessoas/api";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CampoTexto, CampoTextarea } from "@/components/layout/campos-form";
import { FolhaAbas } from "@/components/layout/folha-abas";
import { SecaoFormulario } from "@/components/layout/registro-partes";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { subtotalItem } from "@/features/orcamentos/calculo";
import { CampoCliente } from "@/features/pessoas/campo-cliente";
import { ClienteRapido } from "@/features/pessoas/cliente-rapido";
import { FORNECEDORES } from "@/features/pessoas/entidades";
import { SeletorProduto } from "@/features/produtos/seletor-produto";
import { centavosParaTexto, formatarBRL, mascararMoeda, mascararQuantidade, textoParaCentavos, textoParaNumero } from "@/lib/numeros";
import { useEnvioUnico } from "@/lib/envio-unico";

import { useRegistrarCompra } from "./api";
import { type CompraFormValores, esquemaCompra, FORM_VAZIO, paraCompra, totaisDaCompra } from "./tipos";
import { novoId } from "@/lib/id";

/**
 * Painel lateral de lançamento de compra. Compra lançada já vale: dá entrada no estoque e
 * atualiza o custo dos produtos, e só pode ser cancelada depois. Quem usa deve trocar a `key`
 * a cada abertura, para o formulário começar limpo.
 */
/** Campos que ficam na aba "Valores" (o resto fica em "Fornecedor e itens"). */
const CAMPOS_ABA_VALORES: string[] = ["frete", "desconto", "observacoes"];

export function CompraForm({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const fornecedores = usePessoas("fornecedor");
  const registrar = useRegistrarCompra();
  const [aba, setAba] = useState("dados");
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [fornecedorRapido, setFornecedorRapido] = useState({ aberto: false, nome: "", abertura: 0 });

  const { enviando, enviar: enviarUnico } = useEnvioUnico();

  const form = useForm<CompraFormValores>({ resolver: zodResolver(esquemaCompra), defaultValues: FORM_VAZIO });
  const { control, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "itens" });
  const itens = useWatch({ control, name: "itens" });
  const frete = useWatch({ control, name: "frete" });
  const desconto = useWatch({ control, name: "desconto" });

  const totais = totaisDaCompra({
    itens: itens.map((item) => ({ id: item.id, produtoId: item.produtoId, descricao: item.descricao, unidade: item.unidade, quantidade: textoParaNumero(item.quantidade) || 0, custo: textoParaCentavos(item.custo) })),
    frete: textoParaCentavos(frete),
    desconto: textoParaCentavos(desconto),
  });

  const fornecedoresDisponiveis = fornecedores.filter((f) => f.ativo).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const enviar = enviarUnico(form, async (valores) => {
    try {
      const compra = await registrar.mutateAsync(paraCompra(valores));
      toast.success(`${compra.numero} lançada. O estoque já recebeu as peças.`);
      aoFechar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível lançar a compra. Tente de novo.");
    }
  }, (erros) => setAba(Object.keys(erros).some((c) => !CAMPOS_ABA_VALORES.includes(c)) ? "dados" : "valores"));

  const erroItens = formState.errors.itens?.message ?? formState.errors.itens?.root?.message;

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-2xl!">
        <SheetHeader className="border-b">
          <SheetTitle>Nova compra</SheetTitle>
          <SheetDescription>Peças compradas de um fornecedor. Dá entrada no estoque e atualiza o custo.</SheetDescription>
        </SheetHeader>

        <form noValidate onSubmit={enviar} className="flex min-h-0 flex-1 flex-col">
<FolhaAbas
            valor={aba}
            aoMudar={setAba}
            abas={[
              { id: "dados", titulo: "Fornecedor e itens", comErro: Object.keys(formState.errors).some((c) => !CAMPOS_ABA_VALORES.includes(c)), conteudo: (
                <>
            <SecaoFormulario titulo="Fornecedor">
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="fornecedorId"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5 sm:col-span-2" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="compra-fornecedorId">Fornecedor</FieldLabel>
                      <div className="flex gap-2">
                        <CampoCliente
                          id="compra-fornecedorId"
                          entidade="fornecedor"
                          valor={field.value}
                          clientes={fornecedoresDisponiveis}
                          invalido={fieldState.invalid}
                          aoMudar={(id) => field.onChange(id)}
                          aoCadastrar={(nome) => setFornecedorRapido((atual) => ({ aberto: true, nome, abertura: atual.abertura + 1 }))}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Cadastrar novo fornecedor"
                          title="Novo fornecedor"
                          onClick={() => setFornecedorRapido((atual) => ({ aberto: true, nome: "", abertura: atual.abertura + 1 }))}
                        >
                          <UserPlus />
                        </Button>
                      </div>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <CampoTexto control={control} prefixo="compra" nome="notaFiscal" rotulo="Nota fiscal (opcional)" placeholder="Número da nota" />
              </div>
            </SecaoFormulario>

            <SecaoFormulario titulo="Produtos" descricao="O custo informado vira o novo custo do produto no cadastro.">
              <div className="flex flex-col gap-3">
                {fields.map((campo, indice) => {
                  const subtotal = subtotalItem({ quantidade: textoParaNumero(itens[indice]?.quantidade ?? "") || 0, valor: textoParaCentavos(itens[indice]?.custo ?? "") });
                  return (
                    <div key={campo.id} className="bg-card flex flex-col gap-3 rounded-xl border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 text-sm font-medium break-words">{campo.descricao}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground -mt-1 shrink-0"
                          aria-label={`Remover ${campo.descricao}`}
                          onClick={() => remove(indice)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <CampoTexto control={control} prefixo="compra" nome={`itens.${indice}.quantidade`} rotulo={`Quantidade (${campo.unidade})`} inputMode="decimal" mascara={mascararQuantidade} />
                        <CampoTexto control={control} prefixo="compra" nome={`itens.${indice}.custo`} rotulo="Custo unitário (R$)" inputMode="numeric" placeholder="0,00" mascara={mascararMoeda} />
                      </div>
                      <p className="text-muted-foreground text-right text-sm tabular-nums">
                        Subtotal <span className="text-foreground font-medium">{formatarBRL(subtotal)}</span>
                      </p>
                    </div>
                  );
                })}
                <Button type="button" variant="outline" onClick={() => setSeletorAberto(true)}>
                  <Plus /> Adicionar produto
                </Button>
                {erroItens && (
                  <p role="alert" className="text-destructive text-sm">
                    {erroItens}
                  </p>
                )}
              </div>
            </SecaoFormulario>
                </>
              ) },
              { id: "valores", titulo: "Valores", comErro: Object.keys(formState.errors).some((c) => CAMPOS_ABA_VALORES.includes(c)), conteudo: (
                <>
            <SecaoFormulario titulo="Frete e desconto">
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoTexto control={control} prefixo="compra" nome="frete" rotulo="Frete (R$) (opcional)" inputMode="numeric" placeholder="0,00" mascara={mascararMoeda} />
                <CampoTexto control={control} prefixo="compra" nome="desconto" rotulo="Desconto (R$) (opcional)" inputMode="numeric" placeholder="0,00" mascara={mascararMoeda} />
              </div>
            </SecaoFormulario>

            <SecaoFormulario titulo="Outras informações">
              <CampoTextarea control={control} prefixo="compra" nome="observacoes" rotulo="Observações (opcional)" linhas={3} />
            </SecaoFormulario>
                </>
              ) },
            ]}
          />

          <div className="border-t px-4 py-3">
            <dl className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Produtos</dt>
                <dd className="tabular-nums">{formatarBRL(totais.subtotal)}</dd>
              </div>
              {totais.frete > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Frete</dt>
                  <dd className="tabular-nums">{formatarBRL(totais.frete)}</dd>
                </div>
              )}
              {totais.desconto > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Desconto</dt>
                  <dd className="tabular-nums">− {formatarBRL(totais.desconto)}</dd>
                </div>
              )}
              <div className="mt-1 flex items-baseline justify-between gap-4 border-t pt-2">
                <dt className="font-semibold">Total</dt>
                <dd className="text-lg font-semibold tabular-nums">{formatarBRL(totais.total)}</dd>
              </div>
            </dl>
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" carregando={enviando || registrar.isPending}>
              Lançar compra
            </Button>
          </SheetFooter>
        </form>

        <ClienteRapido
          key={fornecedorRapido.abertura}
          config={FORNECEDORES}
          aberto={fornecedorRapido.aberto}
          nomeInicial={fornecedorRapido.nome}
          aoFechar={() => setFornecedorRapido((atual) => ({ ...atual, aberto: false }))}
          aoCriado={(id) => form.setValue("fornecedorId", id, { shouldDirty: true, shouldValidate: true })}
        />
        <SeletorProduto
          aberto={seletorAberto}
          aoFechar={() => setSeletorAberto(false)}
          ocultar={itens.map((item) => item.produtoId)}
          aoEscolher={(produto) =>
            append({
              id: novoId(),
              produtoId: produto.id,
              descricao: produto.descricao,
              unidade: produto.unidade,
              quantidade: "1",
              custo: centavosParaTexto(produto.custo),
            })
          }
        />
      </SheetContent>
    </Sheet>
  );
}
