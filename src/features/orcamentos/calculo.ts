// Contas do orçamento. Tudo em centavos (inteiros); quantidade pode ter casas (1,5 L).

export type TipoItem = "produto" | "servico";
export type TipoDesconto = "valor" | "percentual";

export type ItemCalculo = { tipo: TipoItem; quantidade: number; valor: number };

/** Quantidade x valor unitário, arredondado ao centavo. */
export function subtotalItem(item: Pick<ItemCalculo, "quantidade" | "valor">): number {
  return Math.round(item.quantidade * item.valor);
}

export type Totais = {
  /** Soma dos produtos (peças). */
  pecas: number;
  /** Soma dos serviços (mão de obra). */
  maoDeObra: number;
  subtotal: number;
  /** Desconto já limitado ao subtotal (nunca deixa o total negativo). */
  desconto: number;
  total: number;
};

/**
 * `desconto` é centavos quando `tipo` = "valor", ou o percentual (0 a 100) quando "percentual".
 * O desconto vale sobre o subtotal geral e é limitado a ele.
 */
export function calcularTotais(itens: ItemCalculo[], tipo: TipoDesconto, desconto: number): Totais {
  const pecas = itens.filter((item) => item.tipo === "produto").reduce((soma, item) => soma + subtotalItem(item), 0);
  const maoDeObra = itens
    .filter((item) => item.tipo === "servico")
    .reduce((soma, item) => soma + subtotalItem(item), 0);
  const subtotal = pecas + maoDeObra;
  const bruto = tipo === "percentual" ? Math.round((subtotal * Math.min(Math.max(desconto, 0), 100)) / 100) : desconto;
  const aplicado = Math.min(Math.max(bruto, 0), subtotal);
  return { pecas, maoDeObra, subtotal, desconto: aplicado, total: subtotal - aplicado };
}

/** Fim do último dia de validade: emitido em 10/11 com 7 dias vale até o fim de 17/11. */
export function validoAte(criadoEm: string, validadeDias: number): Date {
  const emissao = new Date(criadoEm);
  return new Date(emissao.getFullYear(), emissao.getMonth(), emissao.getDate() + validadeDias, 23, 59, 59, 999);
}
