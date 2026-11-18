// Parcelas do saldo a receber. Valores em centavos; datas "AAAA-MM-DD" (sem fuso).

export type Parcela = { numero: number; vencimento: string; valor: number };
export type ParcelaSituacao = Parcela & { pago: number; aberto: number };

/** A data "AAAA-MM-DD" existe de verdade (31/02 não)? */
export function dataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const [a, m, d] = data.split("-").map(Number);
  if (a < 1900) return false;
  return new Date(Date.UTC(a, m - 1, d)).toISOString().slice(0, 10) === data;
}

/** Soma dias a uma data "AAAA-MM-DD" sem passar por fuso horário. Data inválida volta como está. */
export function somarDias(data: string, dias: number): string {
  if (!dataValida(data)) return data;
  const [a, m, d] = data.split("-").map(Number);
  const r = new Date(Date.UTC(a, m - 1, d + dias));
  return r.toISOString().slice(0, 10);
}

/** Hoje no aparelho, como "AAAA-MM-DD". */
export function hojeISO(agora = new Date()): string {
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
}

/** Divide em partes iguais; os centavos que sobram vão para a 1ª. As seguintes vencem a cada 30 dias. */
export function dividirParcelas(total: number, quantidade: number, primeiroVencimento: string): Parcela[] {
  const n = Math.max(1, Math.floor(quantidade));
  const base = Math.floor(total / n);
  const sobra = total - base * n;
  return Array.from({ length: n }, (_, i) => ({ numero: i + 1, vencimento: somarDias(primeiroVencimento, 30 * i), valor: base + (i === 0 ? sobra : 0) }));
}

/**
 * Quanto de cada parcela já foi pago, a partir do saldo atual da venda: o que foi recebido depois
 * quita da parcela mais antiga para a mais nova (e um estorno reabre na ordem inversa).
 */
export function situacaoParcelas(parcelas: Parcela[], saldo: number): ParcelaSituacao[] {
  const ordenadas = [...parcelas].sort((a, b) => a.numero - b.numero);
  const soma = ordenadas.reduce((s, p) => s + p.valor, 0);
  let pagoRestante = Math.max(0, soma - saldo);
  return ordenadas.map((p) => {
    const pago = Math.min(p.valor, pagoRestante);
    pagoRestante -= pago;
    return { ...p, pago, aberto: p.valor - pago };
  });
}

/** Há parcela em aberto com vencimento antes de hoje? */
export function temVencida(parcelas: ParcelaSituacao[], hoje = hojeISO()): boolean {
  return parcelas.some((p) => p.aberto > 0 && p.vencimento < hoje);
}

export type LinhaAReceber = { vendaId: string; numero: number; de: number; vencimento: string; aberto: number; vencida: boolean };

/**
 * Uma linha por parcela em aberto, da que vence antes para a depois. Se o saldo passar da soma das
 * parcelas (ex.: estorno de pagamento feito na hora), a diferença vira uma linha avulsa vencendo na data da venda.
 */
export function linhasAReceber(
  vendas: { id: string; status: string; saldo: number; criadoEm: string; parcelas: ParcelaSituacao[] }[],
  hoje = hojeISO(),
): LinhaAReceber[] {
  const linhas: LinhaAReceber[] = [];
  for (const v of vendas) {
    if (v.status !== "concluida" || v.saldo <= 0) continue;
    const abertas = v.parcelas.filter((p) => p.aberto > 0);
    for (const p of abertas) linhas.push({ vendaId: v.id, numero: p.numero, de: v.parcelas.length, vencimento: p.vencimento, aberto: p.aberto, vencida: p.vencimento < hoje });
    const avulso = v.saldo - abertas.reduce((s, p) => s + p.aberto, 0);
    if (avulso > 0) {
      const data = hojeISO(new Date(v.criadoEm));
      linhas.push({ vendaId: v.id, numero: 0, de: 0, vencimento: data, aberto: avulso, vencida: data < hoje });
    }
  }
  return linhas.sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.numero - b.numero);
}
