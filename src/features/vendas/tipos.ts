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

import type { ParcelaSituacao } from "./parcelas";

export type PagamentoVenda = {
  id: string;
  forma: string;
  /** Centavos. */
  valor: number;
  /** Crédito parcelado no cartão (só informativo). */
  parcelasCartao: number | null;
  criadoEm: string;
  criadoPor: string;
  /** Preenchido quando o pagamento foi desfeito. */
  estornadoEm: string | null;
};

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
  /** Resumo vindo da API: uma forma, "varias" ou vazio (nada recebido ainda). */
  formaPagamento: string;
  pagamentos: PagamentoVenda[];
  /** Parcelas do que ficou a receber, com o quanto de cada uma já foi pago. */
  parcelas: ParcelaSituacao[];
  /** Centavos recebidos (sem estornos). */
  totalPago: number;
  /** Há algum pagamento recebido (visível mesmo sem ver valores): impede cancelar. */
  temPagamento: boolean;
  /** Centavos ainda a receber; 0 quando quitada ou cancelada. */
  saldo: number;
  /** Desconto dado no acerto quando o cliente pagou menos (centavos). */
  ajuste: number;
  observacoes: string;
  status: StatusDocumento;
  criadoEm: string;
};

export const FORMAS_PAGAMENTO = [
  { valor: "dinheiro", texto: "Dinheiro" },
  { valor: "pix", texto: "Pix" },
  { valor: "debito", texto: "Cartão de débito" },
  { valor: "credito", texto: "Cartão de crédito" },
];

export function rotuloPagamento(valor: string): string {
  if (valor === "varias") return "Várias formas";
  if (valor === "" || valor === "prazo") return "A receber";
  return FORMAS_PAGAMENTO.find((forma) => forma.valor === valor)?.texto ?? valor;
}

/** Totais com o desconto de acerto (`ajuste`) somado ao desconto. */
export function totaisDaVenda(venda: Pick<Venda, "itens" | "descontoTipo" | "desconto"> & { ajuste?: number }) {
  const t = totaisDoOrcamento(venda);
  const ajuste = Math.min(venda.ajuste ?? 0, t.total);
  return { ...t, desconto: t.desconto + ajuste, total: t.total - ajuste };
}

/** Corpo base para gravar (os pagamentos entram à parte, na hora de lançar). */
export type DadosBaseVenda = Omit<Venda, "id" | "numero" | "status" | "criadoEm" | "formaPagamento" | "pagamentos" | "parcelas" | "totalPago" | "temPagamento" | "saldo" | "ajuste">;

export const esquemaVenda = z
  .object({
    clienteId: z.string(),
    veiculoId: z.string(),
    km: z.string(),
    itens: z.array(esquemaItem).min(1, "Adicione ao menos um produto ou serviço."),
    descontoTipo: z.enum(["valor", "percentual"]),
    desconto: z.string(),
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
  observacoes: "",
};

/** Dados do formulário prontos para gravar (sem id, número, status e data). */
export function paraVenda(valores: VendaFormValores): DadosBaseVenda {
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
    observacoes: valores.observacoes,
  };
}
