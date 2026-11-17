import { z } from "zod";

import type { Consulta } from "../banco";

import { ErroApi } from "./util";

const texto = (max: number) => z.string().trim().max(max, `No máximo ${max} caracteres.`);

/** Quantidade positiva com no máximo 3 casas (o banco guarda numeric(12,3)). */
export const quantidadeApi = z
  .number()
  .gt(0, "A quantidade precisa ser maior que zero.")
  .max(999_999_999, "Quantidade alta demais.")
  .refine((v) => Math.round(v * 1000) / 1000 === v, "Use no máximo 3 casas decimais.");

export const esquemaItemVendaApi = z.object({
  tipo: z.enum(["produto", "servico"]),
  /** Produto ou serviço do cadastro; vazio no item avulso. */
  origemId: z.union([z.literal(""), z.uuid("Item inválido.")]),
  descricao: texto(120).min(1, "Informe a descrição."),
  unidade: texto(5),
  quantidade: quantidadeApi,
  valor: z.number().int("Informe o valor em centavos.").min(0, "O valor não pode ser negativo.").max(2_000_000_000, "Valor alto demais."),
});
export type ItemVendaApi = z.infer<typeof esquemaItemVendaApi>;

export const camposItensEDesconto = {
  itens: z.array(esquemaItemVendaApi).min(1, "Adicione ao menos um produto ou serviço.").max(200, "Itens demais."),
  descontoTipo: z.enum(["valor", "percentual"]),
  desconto: z.number().min(0, "O desconto não pode ser negativo.").max(2_000_000_000, "Valor alto demais."),
};

/** Desconto não passa de 100% nem do total dos itens; em valor, é um número inteiro de centavos. */
export function validarDescontoApi(v: { itens: ItemVendaApi[]; descontoTipo: "valor" | "percentual"; desconto: number }, ctx: z.RefinementCtx) {
  if (v.descontoTipo === "percentual") {
    if (Math.round(v.desconto * 100) / 100 !== v.desconto) ctx.addIssue({ code: "custom", path: ["desconto"], message: "Use no máximo 2 casas decimais no percentual." });
    if (v.desconto > 100) ctx.addIssue({ code: "custom", path: ["desconto"], message: "O desconto não pode passar de 100%." });
    return;
  }
  if (!Number.isInteger(v.desconto)) ctx.addIssue({ code: "custom", path: ["desconto"], message: "Informe o valor em centavos." });
  const subtotal = v.itens.reduce((soma, i) => soma + Math.round(i.quantidade * i.valor), 0);
  if (v.desconto > subtotal) ctx.addIssue({ code: "custom", path: ["desconto"], message: "O desconto não pode ser maior que o total dos itens." });
}

/** Quem não vê valores não define preço: os itens do cadastro entram com o preço do catálogo, o avulso com 0, e sem desconto. */
export async function precificar<T extends { itens: ItemVendaApi[]; desconto: number }>(q: Consulta, dados: T, verValores: boolean): Promise<T> {
  if (verValores) return dados;
  const itens: ItemVendaApi[] = [];
  for (const item of dados.itens) {
    let valor = 0;
    if (item.origemId !== "") {
      const tabela = item.tipo === "produto" ? "produtos" : "servicos";
      const coluna = item.tipo === "produto" ? "venda" : "valor";
      const [linha] = await q<{ v: number }>(`select ${coluna} as v from ${tabela} where id = $1::uuid`, [item.origemId]);
      valor = linha?.v ?? 0;
    }
    itens.push({ ...item, valor });
  }
  return { ...dados, itens, desconto: 0 };
}

/**
 * Edição por quem não vê valores: itens que já existiam mantêm o valor negociado, os novos entram com o preço do
 * catálogo (avulso = 0) e o desconto não muda.
 */
export async function precificarEdicao<T extends { itens: ItemVendaApi[]; descontoTipo: "valor" | "percentual"; desconto: number }>(
  q: Consulta,
  dados: T,
  anteriores: { tipo: string; origem_id: string | null; descricao: string; valor: number }[],
  descontoAtual: { desconto_tipo: "valor" | "percentual"; desconto: string | number },
): Promise<T> {
  const livres = [...anteriores];
  const novos: ItemVendaApi[] = [];
  for (const item of dados.itens) {
    const i = livres.findIndex((a) => a.tipo === item.tipo && (a.origem_id ?? "") === item.origemId && a.descricao === item.descricao);
    if (i >= 0) {
      novos.push({ ...item, valor: livres[i].valor });
      livres.splice(i, 1);
    } else {
      novos.push((await precificar(q, { ...dados, itens: [item] }, false)).itens[0]);
    }
  }
  return { ...dados, itens: novos, descontoTipo: descontoAtual.desconto_tipo, desconto: Number(descontoAtual.desconto) };
}

/** Quantidade total por produto, em ordem fixa de id: travar as linhas sempre na mesma ordem evita deadlock entre documentos simultâneos. */
export function somarPorProduto(itens: { produtoId: string; quantidade: number }[]): [string, number][] {
  const mapa = new Map<string, number>();
  for (const item of itens) mapa.set(item.produtoId, Math.round(((mapa.get(item.produtoId) ?? 0) + item.quantidade) * 1000) / 1000);
  return [...mapa.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

export async function gravarItens(q: Consulta, tabela: "orcamento_itens" | "venda_itens", fk: string, documentoId: string, itens: ItemVendaApi[]) {
  let posicao = 0;
  for (const item of itens) {
    await q(`insert into ${tabela} (${fk}, posicao, tipo, origem_id, descricao, unidade, quantidade, valor) values ($1, $2, $3, $4, $5, $6, $7, $8)`, [
      documentoId, posicao++, item.tipo, item.origemId === "" ? null : item.origemId, item.descricao, item.unidade, item.quantidade, item.valor,
    ]);
  }
}

/** O carro guarda o km mais recente: sobe quando a visita registra um valor maior. */
export async function subirKm(q: Consulta, veiculoId: string | null, km: number) {
  if (veiculoId && km > 0) await q("update veiculos set km = $1 where id = $2::uuid and km < $1", [km, veiculoId]);
}

/** Cliente existe (papel cliente) e o veículo é dele. */
export async function conferirClienteEVeiculo(q: Consulta, clienteId: string, veiculoId: string) {
  const [cliente] = await q("select 1 from pessoas where id = $1::uuid and papel = 'cliente'", [clienteId]);
  if (!cliente) throw new ErroApi(400, "Cliente não encontrado.", { clienteId: "Cliente não encontrado." });
  if (veiculoId === "") return;
  const [veiculo] = await q("select 1 from veiculos where id = $1::uuid and cliente_id = $2::uuid", [veiculoId, clienteId]);
  if (!veiculo) throw new ErroApi(400, "Este veículo não é do cliente escolhido.", { veiculoId: "Este veículo não é do cliente escolhido." });
}

/** Sem `valores.ver`, valores dos itens e desconto saem zerados. */
export function protegerValores(documentos: Record<string, unknown>[], verValores: boolean) {
  if (verValores) return documentos;
  return documentos.map((d) => ({ ...d, desconto: 0, itens: (d.itens as Record<string, unknown>[]).map((i) => ({ ...i, valor: 0 })) }));
}
