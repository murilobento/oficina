export type TipoMovimento = "entrada" | "saida";
/** De onde veio a movimentação: "inicial" é o saldo de partida dos dados de exemplo. */
export type OrigemMovimento = "compra" | "venda" | "acerto" | "inicial";

export type Movimento = {
  id: string;
  criadoEm: string;
  produtoId: string;
  tipo: TipoMovimento;
  /** Sempre positiva: o sentido vem de `tipo`. */
  quantidade: number;
  /** Saldo do produto logo depois desta movimentação. */
  saldoApos: number;
  origem: OrigemMovimento;
  /** Número do documento de origem (VND-0001, CMP-0001, ACE-0001); */
  documento: string;
  motivo: string;
};

export const ROTULO_ORIGEM: Record<OrigemMovimento, string> = {
  compra: "Compra",
  venda: "Venda",
  acerto: "Acerto",
  inicial: "Saldo inicial",
};
