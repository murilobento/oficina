import { centavosParaTexto, textoParaCentavos } from "@/lib/numeros";

export type FormaRecebimento = "dinheiro" | "pix" | "debito" | "credito";

/** Uma forma de pagamento na tela de recebimento. `valor` e `entregue` são texto com máscara ("1.234,56"). */
export type LinhaRecebimento = { id: string; forma: FormaRecebimento; valor: string; entregue: string; vezes: number };

let proximoId = 0;

export type ResumoRecebimento = { pago: number; falta: number; excesso: number };

export function resumoRecebimento(linhas: LinhaRecebimento[], total: number): ResumoRecebimento {
  const pago = linhas.reduce((soma, l) => soma + textoParaCentavos(l.valor), 0);
  return { pago, falta: Math.max(0, total - pago), excesso: Math.max(0, pago - total) };
}

/** Nova forma já preenchida com o que falta (ou com `sugerido`, se for a primeira e houver sugestão). */
export function adicionarForma(linhas: LinhaRecebimento[], forma: FormaRecebimento, total: number, sugerido?: number): LinhaRecebimento[] {
  const { falta } = resumoRecebimento(linhas, total);
  const valor = linhas.length === 0 && sugerido !== undefined ? Math.min(sugerido, total) : falta;
  return [...linhas, { id: `rc-${++proximoId}`, forma, valor: valor > 0 ? centavosParaTexto(valor) : "", entregue: "", vezes: 1 }];
}

/** Troco de uma linha em dinheiro: o que o cliente entregou além do valor. */
export function trocoDaLinha(linha: LinhaRecebimento): number {
  if (linha.forma !== "dinheiro" || linha.entregue === "") return 0;
  return Math.max(0, textoParaCentavos(linha.entregue) - textoParaCentavos(linha.valor));
}

/** O que impede de registrar os pagamentos, ou "". */
export function problemaRecebimento(linhas: LinhaRecebimento[], total: number): string {
  if (linhas.some((l) => textoParaCentavos(l.valor) <= 0)) return "Informe o valor de cada forma de pagamento.";
  if (linhas.some((l) => l.forma === "dinheiro" && l.entregue !== "" && textoParaCentavos(l.entregue) < textoParaCentavos(l.valor))) {
    return "O valor entregue em dinheiro é menor que o valor pago.";
  }
  if (resumoRecebimento(linhas, total).excesso > 0) return "O valor passa do total. Para dar troco, use o campo Entregue do dinheiro.";
  return "";
}

export type PagamentoApi = { forma: FormaRecebimento; valor: number; parcelasCartao?: number };

export function pagamentosParaApi(linhas: LinhaRecebimento[]): PagamentoApi[] {
  return linhas.map((l) => ({ forma: l.forma, valor: textoParaCentavos(l.valor), ...(l.forma === "credito" && l.vezes > 1 ? { parcelasCartao: l.vezes } : {}) }));
}

/** Corpo que a tela de recebimento entrega a quem a usa (venda nova ou orçamento → venda). */
export type CorpoRecebimento = {
  pagamentos: PagamentoApi[];
  divergencia?: "saldo" | "desconto";
  parcelamento?: { parcelas: number; primeiroVencimento: string };
};
