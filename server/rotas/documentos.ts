import type { Consulta } from "../banco";

import { paraCamel } from "./util";

type Linha = Record<string, unknown>;

/** Itens de vários documentos de uma vez, agrupados pelo id do documento e em ordem de `posicao`. */
export async function itensPorDocumento(q: Consulta, tabela: string, fk: string, ids: string[]): Promise<Map<string, Linha[]>> {
  const mapa = new Map<string, Linha[]>();
  if (ids.length === 0) return mapa;
  const linhas = await q(`select * from ${tabela} where ${fk} = any($1::uuid[]) order by ${fk}, posicao`, [ids]);
  for (const linha of linhas) {
    const doc = String(linha[fk]);
    const { posicao: _p, [fk]: _f, ...resto } = linha;
    const item = paraCamel<Linha>(resto);
    if ("origemId" in item) item.origemId = item.origemId ?? "";
    mapa.set(doc, [...(mapa.get(doc) ?? []), item]);
  }
  return mapa;
}

/** Documento com `itens` anexados, no formato do front. */
export async function comItens(q: Consulta, tabela: string, fk: string, linhas: Linha[]): Promise<Linha[]> {
  const itens = await itensPorDocumento(q, tabela, fk, linhas.map((l) => String(l.id)));
  return linhas.map((linha) => ({ ...paraCamel<Linha>(linha), itens: itens.get(String(linha.id)) ?? [] }));
}
