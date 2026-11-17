export type TipoMovimento = "entrada" | "saida";
/** De onde veio a movimentação: "inicial" é o saldo de partida dos dados de exemplo. */
export type OrigemMovimento = "manual" | "compra" | "venda" | "acerto" | "inicial";

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
  /** Número do documento de origem (VND-0001, CMP-0001, ACE-0001); vazio na manual. */
  documento: string;
  motivo: string;
};

export const ROTULO_ORIGEM: Record<OrigemMovimento, string> = {
  manual: "Manual",
  compra: "Compra",
  venda: "Venda",
  acerto: "Acerto",
  inicial: "Saldo inicial",
};

export const MOTIVOS_ENTRADA = ["Devolução de cliente", "Sobra de serviço", "Bonificação do fornecedor", "Outro"];
export const MOTIVOS_SAIDA = ["Uso interno da oficina", "Perda ou avaria", "Devolução ao fornecedor", "Garantia", "Outro"];
