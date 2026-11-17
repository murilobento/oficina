import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronsUpDown } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { CampoSelect, CampoTexto } from "@/components/layout/campos-form";
import { SecaoFormulario } from "@/components/layout/registro-partes";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SeletorProduto } from "@/features/produtos/seletor-produto";
import { useProdutosStore } from "@/features/produtos/store";
import { formatarQuantidade, mascararQuantidade, textoParaNumero } from "@/lib/numeros";

import { movimentarEstoque } from "./movimentar";
import { MOTIVOS_ENTRADA, MOTIVOS_SAIDA } from "./tipos";

const esquema = z.object({
  tipo: z.enum(["entrada", "saida"]),
  produtoId: z.string().min(1, "Escolha o produto."),
  quantidade: z.string().refine((valor) => textoParaNumero(valor) > 0, "A quantidade precisa ser maior que zero."),
  motivo: z.string().min(1, "Escolha o motivo."),
  observacao: z.string().trim().max(200, "No máximo 200 caracteres."),
});
type Valores = z.infer<typeof esquema>;

/**
 * Painel lateral de movimentação manual: entrada ou saída avulsa de uma peça (devolução, perda,
 * uso interno...). Compras e vendas movimentam o estoque sozinhas; contagem física é o Acerto.
 * Quem usa deve trocar a `key` a cada abertura, para o formulário começar limpo.
 */
export function MovimentacaoForm({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const produtos = useProdutosStore((estado) => estado.itens);
  const [seletorAberto, setSeletorAberto] = useState(false);

  const form = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: { tipo: "entrada", produtoId: "", quantidade: "", motivo: "", observacao: "" },
  });
  const { control } = form;
  const tipo = useWatch({ control, name: "tipo" });
  const produtoId = useWatch({ control, name: "produtoId" });
  const produto = produtos.find((item) => item.id === produtoId);
  const motivos = (tipo === "entrada" ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA).map((texto) => ({ valor: texto, texto }));

  function trocarTipo(novo: "entrada" | "saida") {
    if (novo === tipo) return;
    form.setValue("tipo", novo, { shouldDirty: true });
    form.setValue("motivo", "");
  }

  const enviar = form.handleSubmit((valores) => {
    const quantidade = textoParaNumero(valores.quantidade);
    if (valores.tipo === "saida" && produto && quantidade > produto.saldo) {
      form.setError(
        "quantidade",
        { message: `Saldo insuficiente: há ${formatarQuantidade(produto.saldo)} ${produto.unidade} em estoque.` },
        { shouldFocus: true },
      );
      return;
    }
    movimentarEstoque({
      produtoId: valores.produtoId,
      delta: valores.tipo === "entrada" ? quantidade : -quantidade,
      origem: "manual",
      documento: "",
      motivo: [valores.motivo, valores.observacao].filter(Boolean).join(" · "),
    });
    toast.success(valores.tipo === "entrada" ? "Entrada registrada." : "Saída registrada.");
    aoFechar();
  });

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-xl!">
        <SheetHeader className="border-b">
          <SheetTitle>Nova movimentação</SheetTitle>
          <SheetDescription>Entrada ou saída avulsa. Compras e vendas já movimentam o estoque sozinhas.</SheetDescription>
        </SheetHeader>

        <form noValidate onSubmit={enviar} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-8 overflow-y-auto p-4">
            <SecaoFormulario titulo="Movimentação">
              <div className="flex flex-col gap-4">
                <Field className="gap-1.5">
                  <FieldLabel id="movimentacao-tipo">Tipo</FieldLabel>
                  <div role="radiogroup" aria-labelledby="movimentacao-tipo" className="flex flex-wrap gap-2">
                    {(
                      [
                        ["entrada", "Entrada"],
                        ["saida", "Saída"],
                      ] as const
                    ).map(([valor, texto]) => (
                      <Button
                        key={valor}
                        type="button"
                        role="radio"
                        aria-checked={tipo === valor}
                        variant={tipo === valor ? "default" : "outline"}
                        onClick={() => trocarTipo(valor)}
                      >
                        {texto}
                      </Button>
                    ))}
                  </div>
                </Field>

                <Controller
                  control={control}
                  name="produtoId"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="movimentacao-produtoId">Produto</FieldLabel>
                      <Button
                        id="movimentacao-produtoId"
                        type="button"
                        variant="outline"
                        aria-invalid={fieldState.invalid}
                        className="w-full justify-between px-3 font-normal"
                        onClick={() => setSeletorAberto(true)}
                      >
                        <span className={produto ? "truncate" : "text-muted-foreground truncate"}>
                          {produto ? produto.descricao : "Escolher produto"}
                        </span>
                        <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
                      </Button>
                      {produto && (
                        <p className="text-muted-foreground text-sm">
                          Saldo atual: <span className="text-foreground font-medium">{formatarQuantidade(produto.saldo)} {produto.unidade}</span>
                        </p>
                      )}
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      <SeletorProduto
                        aberto={seletorAberto}
                        aoFechar={() => setSeletorAberto(false)}
                        aoEscolher={(escolhido) => field.onChange(escolhido.id)}
                      />
                    </Field>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <CampoTexto
                    control={control}
                    prefixo="movimentacao"
                    nome="quantidade"
                    rotulo={`Quantidade${produto ? ` (${produto.unidade})` : ""}`}
                    inputMode="decimal"
                    placeholder="0"
                    mascara={mascararQuantidade}
                  />
                  <CampoSelect control={control} prefixo="movimentacao" nome="motivo" rotulo="Motivo" opcoes={motivos} />
                  <CampoTexto
                    control={control}
                    prefixo="movimentacao"
                    nome="observacao"
                    rotulo="Observação (opcional)"
                    className="sm:col-span-2"
                  />
                </div>
              </div>
            </SecaoFormulario>
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none">
              Registrar movimentação
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
