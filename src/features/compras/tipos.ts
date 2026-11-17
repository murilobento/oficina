import { z } from "zod";

import type { StatusDocumento } from "@/components/layout/documento-partes";
import { subtotalItem } from "@/features/orcamentos/calculo";
import { textoParaCentavos, textoParaNumero } from "@/lib/numeros";

export type ItemCompra = {
  id: string;
  produtoId: string;
  /** Guardados na compra para o histórico continuar legível se o produto mudar depois. */
  descricao: string;
  unidade: string;
  quantidade: number;
  /** Custo unitário em centavos. */
  custo: number;
};

export type Compra = {
  id: string;
  /** CMP-0001 */
  numero: string;
  fornecedorId: string;
  /** Número da nota fiscal do fornecedor (opcional). */
  notaFiscal: string;
  itens: ItemCompra[];
  /** Em centavos. */
  frete: number;
  /** Em centavos. */
  desconto: number;
  observacoes: string;
  status: StatusDocumento;
  criadoEm: string;
};

export function totaisDaCompra(compra: Pick<Compra, "itens" | "frete" | "desconto">) {
  const subtotal = compra.itens.reduce((soma, item) => soma + subtotalItem({ quantidade: item.quantidade, valor: item.custo }), 0);
  const total = Math.max(subtotal + compra.frete - compra.desconto, 0);
  return { subtotal, frete: compra.frete, desconto: compra.desconto, total };
}

const esquemaItem = z.object({
  id: z.string(),
  produtoId: z.string(),
  descricao: z.string(),
  unidade: z.string(),
  quantidade: z.string().refine((valor) => textoParaNumero(valor) > 0, "A quantidade precisa ser maior que zero."),
  custo: z.string().refine((valor) => textoParaCentavos(valor) > 0, "Informe o custo unitário."),
});

export const esquemaCompra = z
  .object({
    fornecedorId: z.string().min(1, "Escolha o fornecedor."),
    notaFiscal: z.string().trim().max(20, "No máximo 20 caracteres."),
    itens: z.array(esquemaItem).min(1, "Adicione ao menos um produto."),
    frete: z.string(),
    desconto: z.string(),
    observacoes: z.string().trim().max(500, "No máximo 500 caracteres."),
  })
  .superRefine((valores, contexto) => {
    const subtotal = valores.itens.reduce(
      (soma, item) => soma + Math.round(textoParaNumero(item.quantidade) * textoParaCentavos(item.custo)),
      0,
    );
    if (textoParaCentavos(valores.desconto) > subtotal + textoParaCentavos(valores.frete)) {
      contexto.addIssue({ code: "custom", path: ["desconto"], message: "O desconto não pode ser maior que o total da compra." });
    }
  });

export type CompraFormValores = z.infer<typeof esquemaCompra>;

export const FORM_VAZIO: CompraFormValores = { fornecedorId: "", notaFiscal: "", itens: [], frete: "", desconto: "", observacoes: "" };

/** Dados do formulário prontos para gravar (sem id, número, status e data). */
export function paraCompra(valores: CompraFormValores): Omit<Compra, "id" | "numero" | "status" | "criadoEm"> {
  return {
    fornecedorId: valores.fornecedorId,
    notaFiscal: valores.notaFiscal,
    itens: valores.itens.map((item) => ({
      id: item.id,
      produtoId: item.produtoId,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: textoParaNumero(item.quantidade),
      custo: textoParaCentavos(item.custo),
    })),
    frete: textoParaCentavos(valores.frete),
    desconto: textoParaCentavos(valores.desconto),
    observacoes: valores.observacoes,
  };
}
