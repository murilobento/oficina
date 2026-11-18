import { centavosParaTexto, formatarBRL, textoParaCentavos } from "@/lib/numeros";

export type LinhaPagamento = { id: string; forma: string; valor: string };
export type Divergencia = "" | "saldo" | "desconto";
export type EstadoPagamento = { linhas: LinhaPagamento[]; divergencia: Divergencia };

let proximoId = 0;
export const novaLinha = (forma = "", valor = ""): LinhaPagamento => ({ id: `pg-${++proximoId}`, forma, valor });

/** Começa com uma linha: valor em branco quer dizer "o total" (muda sozinho se os itens mudarem). */
export const estadoInicial = (): EstadoPagamento => ({ linhas: [novaLinha()], divergencia: "" });

/** Valor da linha em centavos; a única linha em branco vale o total. */
export function valorDaLinha(estado: EstadoPagamento, linha: LinhaPagamento, total: number): number {
  if (linha.valor === "" && estado.linhas.length === 1) return total;
  return textoParaCentavos(linha.valor);
}

export type ResumoPagamento = { pago: number; falta: number; excesso: number };

export function resumoPagamento(estado: EstadoPagamento, total: number): ResumoPagamento {
  const pago = estado.linhas.reduce((soma, l) => soma + valorDaLinha(estado, l, total), 0);
  return { pago, falta: Math.max(0, total - pago), excesso: Math.max(0, pago - total) };
}

/** Linhas completas (forma e valor), no formato da API. */
export function pagamentosParaApi(estado: EstadoPagamento, total: number): { forma: string; valor: number }[] {
  return estado.linhas
    .map((l) => ({ forma: l.forma, valor: valorDaLinha(estado, l, total) }))
    .filter((p) => p.forma !== "" && p.valor > 0);
}

/** Mensagem do que impede de concluir, ou "" se está tudo certo (a API confere de novo). */
export function validarPagamento(estado: EstadoPagamento, total: number, temCliente: boolean, verValores = true): string {
  // Sem ver valores só se escolhe a forma; a API paga o total.
  if (!verValores) return estado.linhas[0].forma === "" ? "Escolha a forma de pagamento." : "";
  for (const l of estado.linhas) {
    const valor = valorDaLinha(estado, l, total);
    if (l.forma === "" && (valor > 0 || estado.linhas.length === 1)) return "Escolha a forma de pagamento.";
    if (l.forma !== "" && valor <= 0 && total > 0) return "Informe o valor de cada pagamento.";
  }
  const { pago, falta, excesso } = resumoPagamento(estado, total);
  if (excesso > 0) {
    const dinheiro = estado.linhas.filter((l) => l.forma === "dinheiro").reduce((soma, l) => soma + valorDaLinha(estado, l, total), 0);
    if (dinheiro < excesso) return "O valor pago passa do total. Só o dinheiro pode ter troco.";
  }
  if (falta > 0) {
    if (estado.divergencia === "") return `Faltam ${formatarBRL(falta)}. Escolha ficar devendo ou dar desconto.`;
    if (estado.divergencia === "saldo" && !temCliente) return "Para ficar devendo, escolha o cliente.";
    if (estado.divergencia === "desconto" && pago === 0) return "Informe o valor pago para dar desconto do restante.";
  }
  return "";
}

/** O que enviar à API. A decisão só vale quando de fato falta valor. */
export function corpoPagamento(estado: EstadoPagamento, total: number, verValores = true) {
  if (!verValores) return { pagamentos: [{ forma: estado.linhas[0].forma, valor: 0 }] };
  const { falta } = resumoPagamento(estado, total);
  return {
    pagamentos: pagamentosParaApi(estado, total),
    ...(falta > 0 && estado.divergencia !== "" ? { divergencia: estado.divergencia } : {}),
  };
}

export const textoValor = (centavos: number) => centavosParaTexto(centavos);
