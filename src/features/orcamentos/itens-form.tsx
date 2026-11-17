import { useState } from "react";

import { Plus, Trash2 } from "lucide-react";
import { type Control, useFieldArray, useWatch } from "react-hook-form";

import { CampoTexto } from "@/components/layout/campos-form";
import { SecaoFormulario } from "@/components/layout/registro-partes";
import { Button } from "@/components/ui/button";
import {
  centavosParaTexto,
  formatarBRL,
  mascararMoeda,
  mascararQuantidade,
  textoParaCentavos,
  textoParaNumero,
} from "@/lib/numeros";

import { subtotalItem } from "./calculo";
import { type ItemEscolhido, SeletorItem } from "./seletor-item";
import type { ItemFormValores } from "./tipos";

/** O formulário precisa ter `itens: ItemFormValores[]`; serve para orçamento e venda. */
type FormComItens = { itens: ItemFormValores[] };

/** Seção "Itens" dos formulários de orçamento e venda: lista editável e janela de escolha. */
export function ItensDoDocumento<T extends FormComItens>({
  control,
  prefixo,
  documento,
  erro,
}: {
  control: Control<T>;
  prefixo: string;
  /** "orçamento" ou "venda", usado nos textos da janela de escolha. */
  documento: string;
  erro?: string;
}) {
  const [seletorAberto, setSeletorAberto] = useState(false);
  const tipado = control as unknown as Control<FormComItens>;
  const { fields, append, remove } = useFieldArray({
    control: tipado,
    name: "itens",
  });
  const itens = useWatch({ control: tipado, name: "itens" });

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

  return (
    <>
      <SecaoFormulario
        titulo="Itens"
        descricao={`Peças e serviços. Preço e quantidade podem ser ajustados ${documento === "venda" ? "nesta" : "neste"} ${documento}.`}
      >
        <div className="flex flex-col gap-3">
          {fields.map((campo, indice) => {
            const tipo = itens[indice]?.tipo ?? campo.tipo;
            const subtotal = subtotalItem({
              quantidade: textoParaNumero(itens[indice]?.quantidade ?? "") || 0,
              valor: textoParaCentavos(itens[indice]?.valor ?? ""),
            });
            return (
              <div
                key={campo.id}
                className="bg-card flex flex-col gap-3 rounded-xl border p-3"
              >
                <div className="flex items-start gap-2">
                  <CampoTexto
                    control={tipado}
                    prefixo={prefixo}
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
                    control={tipado}
                    prefixo={prefixo}
                    nome={`itens.${indice}.quantidade`}
                    rotulo={`Quantidade (${itens[indice]?.unidade || "UN"})`}
                    inputMode="decimal"
                    mascara={mascararQuantidade}
                  />
                  <CampoTexto
                    control={tipado}
                    prefixo={prefixo}
                    nome={`itens.${indice}.valor`}
                    rotulo="Valor unitário (R$)"
                    inputMode="numeric"
                    placeholder="0,00"
                    mascara={mascararMoeda}
                  />
                </div>
                <p className="text-muted-foreground text-right text-sm tabular-nums">
                  Subtotal{" "}
                  <span className="text-foreground font-medium">
                    {formatarBRL(subtotal)}
                  </span>
                </p>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            onClick={() => setSeletorAberto(true)}
          >
            <Plus /> Adicionar item
          </Button>
          {erro && (
            <p role="alert" className="text-destructive text-sm">
              {erro}
            </p>
          )}
        </div>
      </SecaoFormulario>

      <SeletorItem
        aberto={seletorAberto}
        aoFechar={() => setSeletorAberto(false)}
        aoEscolher={adicionarItem}
        documento={documento}
      />
    </>
  );
}
