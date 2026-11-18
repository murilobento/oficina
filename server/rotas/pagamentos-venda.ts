import { z } from "zod";

import { calcularTotais } from "../../src/features/orcamentos/calculo";
import type { Consulta } from "../banco";

import { ErroApi } from "./util";

export const FORMAS_RECEBIMENTO = ["dinheiro", "pix", "debito", "credito"] as const;
export type FormaRecebimento = (typeof FORMAS_RECEBIMENTO)[number];

const forma = z.enum(FORMAS_RECEBIMENTO, "Escolha a forma de pagamento.");
const valorCentavos = z.number().int("Informe o valor em centavos.").max(2_000_000_000, "Valor alto demais.");

/** Valor mínimo 0 aqui: quem não vê valores só escolhe a forma e a API paga o total (ver `conferirPagamentos`). */
export const camposPagamentos = {
  pagamentos: z.array(z.object({ forma, valor: valorCentavos.min(0, "O valor não pode ser negativo.") })).max(10, "Pagamentos demais."),
  /** O que fazer quando o pago é menor que o total: ficar devendo ou dar desconto da diferença. */
  divergencia: z.enum(["saldo", "desconto"]).optional(),
};

export const esquemaNovoPagamento = z.object({ forma, valor: valorCentavos.min(1, "Informe o valor pago.") });

export type PagamentoEntrada = { forma: FormaRecebimento; valor: number };

const brl = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Confere o que o cliente pagou contra o total da venda.
 * - Igual: ok. Maior: só dinheiro pode ter troco (o excesso sai do dinheiro). Menor: exige `divergencia`.
 * - "saldo" exige cliente cadastrado; "desconto" vira `ajuste` e exige algum valor pago.
 */
export function conferirPagamentos(total: number, pagamentos: PagamentoEntrada[], divergencia: "saldo" | "desconto" | undefined, temCliente: boolean): { pagamentos: PagamentoEntrada[]; ajuste: number } {
  if (pagamentos.some((p) => p.valor <= 0)) throw new ErroApi(400, "Informe o valor de cada pagamento.", { pagamentos: "Informe o valor de cada pagamento." });
  const pago = pagamentos.reduce((soma, p) => soma + p.valor, 0);
  if (pago === total) return { pagamentos, ajuste: 0 };

  if (pago > total) {
    let excesso = pago - total;
    const liquidos = pagamentos.map((p) => ({ ...p }));
    for (let i = liquidos.length - 1; i >= 0 && excesso > 0; i--) {
      if (liquidos[i].forma !== "dinheiro") continue;
      const tira = Math.min(liquidos[i].valor, excesso);
      liquidos[i].valor -= tira;
      excesso -= tira;
    }
    if (excesso > 0) throw new ErroApi(400, `O valor pago passa do total em ${brl(pago - total)}. Só o dinheiro pode ter troco.`, { pagamentos: "O valor pago passa do total." });
    return { pagamentos: liquidos.filter((p) => p.valor > 0), ajuste: 0 };
  }

  const falta = total - pago;
  if (divergencia === undefined) throw new ErroApi(400, `Faltam ${brl(falta)}. Escolha ficar devendo ou dar desconto.`, { divergencia: "Escolha ficar devendo ou dar desconto." });
  if (divergencia === "saldo") {
    if (!temCliente) throw new ErroApi(400, "Para ficar devendo, escolha o cliente.", { clienteId: "Para ficar devendo, escolha o cliente." });
    return { pagamentos, ajuste: 0 };
  }
  if (pago === 0) throw new ErroApi(400, "Informe o valor pago para dar desconto do restante.", { pagamentos: "Informe o valor pago." });
  return { pagamentos, ajuste: falta };
}

type ItemConta = { tipo: "produto" | "servico"; quantidade: number; valor: number };

/** Total da venda depois do desconto e do ajuste de acerto. */
export function totalDaVenda(itens: ItemConta[], descontoTipo: "valor" | "percentual", desconto: number, ajuste: number): number {
  return Math.max(0, calcularTotais(itens, descontoTipo, desconto).total - ajuste);
}

/** Total e o pago (sem estornos) de uma venda, lendo do banco. */
export async function contaDaVenda(q: Consulta, vendaId: string): Promise<{ total: number; pago: number }> {
  const [v] = await q<{ desconto_tipo: "valor" | "percentual"; desconto: string; ajuste: number }>("select desconto_tipo, desconto, ajuste from vendas where id = $1::uuid", [vendaId]);
  const itens = await q<{ tipo: "produto" | "servico"; quantidade: string; valor: number }>("select tipo, quantidade, valor from venda_itens where venda_id = $1::uuid", [vendaId]);
  const [{ pago }] = await q<{ pago: string }>("select coalesce(sum(valor), 0) as pago from venda_pagamentos where venda_id = $1::uuid and estornado_em is null", [vendaId]);
  return { total: totalDaVenda(itens.map((i) => ({ ...i, quantidade: Number(i.quantidade) })), v.desconto_tipo, Number(v.desconto), v.ajuste), pago: Number(pago) };
}

export async function gravarPagamentos(q: Consulta, vendaId: string, pagamentos: PagamentoEntrada[], quem: string) {
  for (const p of pagamentos) await q("insert into venda_pagamentos (venda_id, forma, valor, criado_por) values ($1::uuid, $2, $3, $4)", [vendaId, p.forma, p.valor, quem]);
}
