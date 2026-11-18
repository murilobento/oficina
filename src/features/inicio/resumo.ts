import type { StatusDocumento } from "@/components/layout/documento-partes";
import { type Orcamento, statusExibido } from "@/features/orcamentos/tipos";
import { totaisDaVenda, type Venda } from "@/features/vendas/tipos";
import type { Produto } from "@/features/produtos/tipos";

type EntradaOrcamento = Pick<Orcamento, "status" | "criadoEm" | "validadeDias">;
type EntradaVenda = Pick<Venda, "itens" | "descontoTipo" | "desconto" | "criadoEm"> & { status: StatusDocumento };
type EntradaProduto = Pick<Produto, "id" | "descricao" | "codigo" | "ativo" | "saldo" | "estoqueMinimo">;

export type ResumoDoDia = {
  orcamentosAbertos: number;
  vendasHoje: number;
  /** Em centavos. */
  totalVendidoHoje: number;
  /** Do mais crítico (menor saldo) ao menos crítico. */
  abaixoDoMinimo: EntradaProduto[];
};

const mesmoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** Números do painel de Início, calculados no aparelho a partir das listas já carregadas. */
export function resumoDoDia(
  dados: { orcamentos: EntradaOrcamento[]; vendas: EntradaVenda[]; produtos: EntradaProduto[] },
  hoje = new Date(),
): ResumoDoDia {
  const orcamentosAbertos = dados.orcamentos.filter((o) => {
    const status = statusExibido(o, hoje);
    return status === "rascunho" || status === "enviado";
  }).length;

  const vendasDeHoje = dados.vendas.filter((v) => v.status === "concluida" && mesmoDia(new Date(v.criadoEm), hoje));
  const totalVendidoHoje = vendasDeHoje.reduce((soma, v) => soma + totaisDaVenda(v).total, 0);

  const abaixoDoMinimo = dados.produtos
    .filter((p) => p.ativo && p.estoqueMinimo > 0 && p.saldo <= p.estoqueMinimo)
    .sort((a, b) => a.saldo - b.saldo);

  return { orcamentosAbertos, vendasHoje: vendasDeHoje.length, totalVendidoHoje, abaixoDoMinimo };
}
