import { z } from "zod";

import type { StatusDocumento } from "@/components/layout/documento-partes";
import type { TipoDesconto } from "@/features/orcamentos/calculo";
import {
  esquemaItem,
  type ItemOrcamento,
  validarDesconto,
  totaisDoOrcamento,
} from "@/features/orcamentos/tipos";
import { textoParaCentavos, textoParaNumero } from "@/lib/numeros";

export type Venda = {
  id: string;
  /** VND-0001 */
  numero: string;
  /** Vazio = consumidor final (venda de balcão, sem cadastro). */
  clienteId: string;
  /** Vazio = venda sem veículo (peça no balcão). */
  veiculoId: string;
  km: number;
  /** Orçamento de origem, quando a venda nasceu de um orçamento aprovado. */
  orcamentoId: string;
  itens: ItemOrcamento[];
  descontoTipo: TipoDesconto;
  desconto: number;
  formaPagamento: string;
  observacoes: string;
  status: StatusDocumento;
  criadoEm: string;
};

export const FORMAS_PAGAMENTO = [
  { valor: "dinheiro", texto: "Dinheiro" },
  { valor: "pix", texto: "Pix" },
  { valor: "debito", texto: "Cartão de débito" },
  { valor: "credito", texto: "Cartão de crédito" },
  { valor: "prazo", texto: "A prazo / fiado" },
];

export function rotuloPagamento(valor: string): string {
  return FORMAS_PAGAMENTO.find((forma) => forma.valor === valor)?.texto ?? valor;
}

export function totaisDaVenda(venda: Pick<Venda, "itens" | "descontoTipo" | "desconto">) {
  return totaisDoOrcamento(venda);
}

export const esquemaVenda = z
  .object({
    clienteId: z.string(),
    veiculoId: z.string(),
    km: z.string(),
    itens: z.array(esquemaItem).min(1, "Adicione ao menos um produto ou serviço."),
    descontoTipo: z.enum(["valor", "percentual"]),
    desconto: z.string(),
    formaPagamento: z.string().min(1, "Escolha a forma de pagamento."),
    observacoes: z.string().trim().max(500, "No máximo 500 caracteres."),
  })
  .superRefine(validarDesconto);

export type VendaFormValores = z.infer<typeof esquemaVenda>;

export const FORM_VAZIO: VendaFormValores = {
  clienteId: "",
  veiculoId: "",
  km: "",
  itens: [],
  descontoTipo: "percentual",
  desconto: "",
  formaPagamento: "",
  observacoes: "",
};

/** Dados do formulário prontos para gravar (sem id, número, status e data). */
export function paraVenda(valores: VendaFormValores): Omit<Venda, "id" | "numero" | "status" | "criadoEm"> {
  return {
    clienteId: valores.clienteId,
    veiculoId: valores.clienteId === "" ? "" : valores.veiculoId,
    km: Number(valores.km || 0),
    orcamentoId: "",
    itens: valores.itens.map((item) => ({
      id: item.id,
      tipo: item.tipo,
      origemId: item.origemId,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: textoParaNumero(item.quantidade),
      valor: textoParaCentavos(item.valor),
    })),
    descontoTipo: valores.descontoTipo,
    desconto: valores.descontoTipo === "valor" ? textoParaCentavos(valores.desconto) : textoParaNumero(valores.desconto),
    formaPagamento: valores.formaPagamento,
    observacoes: valores.observacoes,
  };
}
