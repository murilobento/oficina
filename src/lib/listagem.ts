// Funções e constantes do padrão de listagem (as peças visuais estão em components/layout/listagem.tsx).

export const POR_PAGINA = 10;

/** Texto sem acentos e em minúsculas, para a busca não depender de acentuação. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Recorta a página pedida (corrigindo página além do fim, comum depois de filtrar ou excluir). */
export function paginar<T>(itens: T[], pagina: number, porPagina = POR_PAGINA) {
  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina));
  const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas);
  return {
    totalPaginas,
    paginaAtual,
    visiveis: itens.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina),
  };
}

/** Classes padrão do <Table> dentro de <ListagemTabela>. */
export const CLASSE_TABELA = "[&_tbody]:uppercase [&_tbody_button]:uppercase **:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4";
