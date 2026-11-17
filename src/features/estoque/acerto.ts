export type ItemAcerto = {
  produtoId: string;
  /** Guardados no acerto para o histórico continuar legível se o produto mudar depois. */
  descricao: string;
  unidade: string;
  /** Saldo do sistema no momento do acerto. */
  saldoSistema: number;
  /** Quantidade contada na prateleira. */
  contado: number;
};

export type Acerto = {
  id: string;
  /** ACE-0001 */
  numero: string;
  motivo: string;
  observacoes: string;
  itens: ItemAcerto[];
  criadoEm: string;
};

export const MOTIVOS_ACERTO = ["Inventário (contagem física)", "Correção de lançamento", "Perda ou avaria", "Outro"];

/** Quantos itens do acerto realmente mudaram o saldo. */
export function itensDivergentes(acerto: Pick<Acerto, "itens">): ItemAcerto[] {
  return acerto.itens.filter((item) => item.contado !== item.saldoSistema);
}
