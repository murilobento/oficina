import type { Consulta } from "./banco";

export type PedidoMovimento = {
  produtoId: string;
  /** Positivo entra, negativo sai. */
  delta: number;
  origem: "compra" | "venda" | "acerto" | "inicial";
  documento: string;
  motivo: string;
};

/**
 * Único caminho para alterar `produtos.saldo`: soma o delta (atômico, trava a linha) e grava o movimento.
 * Deve rodar dentro de `banco.transacao`. Delta zero não faz nada.
 */
export async function movimentar(q: Consulta, pedido: PedidoMovimento): Promise<{ saldoApos: number }> {
  const [linha] = await q<{ saldo: string }>("update produtos set saldo = saldo + $1 where id = $2::uuid returning saldo", [pedido.delta, pedido.produtoId]);
  if (!linha) throw new Error("Produto não encontrado para movimentar o estoque.");
  const saldoApos = Number(linha.saldo);
  if (pedido.delta !== 0) {
    await q(
      "insert into movimentos_estoque (produto_id, tipo, quantidade, saldo_apos, origem, documento, motivo) values ($1, $2, $3, $4, $5, $6, $7)",
      [pedido.produtoId, pedido.delta > 0 ? "entrada" : "saida", Math.abs(pedido.delta), saldoApos, pedido.origem, pedido.documento, pedido.motivo],
    );
  }
  return { saldoApos };
}
