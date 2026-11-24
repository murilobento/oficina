import { CATEGORIAS_AUDITORIA, type CategoriaAuditoria } from "../auditoria";

import { type Contexto, ErroApi } from "./util";

const POR_PAGINA = 50;

type Linha = {
  id: string;
  criado_em: string | Date;
  usuario_id: string | null;
  usuario: string;
  categoria: CategoriaAuditoria;
  acao: string;
  descricao: string;
  alvo_tipo: string | null;
  alvo_id: string | null;
  detalhes: unknown;
  ip: string | null;
};

const dataISO = (valor: string | Date) => (valor instanceof Date ? valor : new Date(valor)).toISOString();

const paraJson = (l: Linha) => ({
  id: l.id,
  criadoEm: dataISO(l.criado_em),
  usuarioId: l.usuario_id,
  usuario: l.usuario,
  categoria: l.categoria,
  acao: l.acao,
  descricao: l.descricao,
  alvo: l.alvo_tipo && l.alvo_id ? { tipo: l.alvo_tipo, id: l.alvo_id } : null,
  detalhes: typeof l.detalhes === "string" ? JSON.parse(l.detalhes) : (l.detalhes ?? null),
  ip: l.ip,
});

/**
 * Consulta da auditoria. Só leitura: os registros são gravados pelas próprias ações
 * (ver server/auditoria.ts) e não existe rota para alterar nem apagar.
 */
export function registrarRotasAuditoria({ app, banco, exigirSessao, exigirPermissao }: Contexto) {
  const ver = [exigirSessao, exigirPermissao("auditoria.ver")] as const;

  /**
   * Mais recentes primeiro, 50 por vez. Filtros: `de`/`ate` (datas ISO), `categoria`, `usuario` (id),
   * `busca` (texto na frase ou no nome). `antesDe` é o cursor devolvido em `proximo`.
   */
  app.get("/auditoria", ...ver, async (c) => {
    const condicoes: string[] = [];
    const valores: unknown[] = [];
    const filtro = (sql: string, valor: unknown) => {
      valores.push(valor);
      condicoes.push(sql.replace("?", `$${valores.length}`));
    };

    const { de, ate, categoria, usuario, busca, antesDe } = c.req.query();
    if (de) {
      if (Number.isNaN(Date.parse(de))) throw new ErroApi(400, "Data inicial inválida.");
      filtro("criado_em >= ?::timestamptz", de);
    }
    if (ate) {
      if (Number.isNaN(Date.parse(ate))) throw new ErroApi(400, "Data final inválida.");
      filtro("criado_em < ?::timestamptz", ate);
    }
    if (categoria) {
      if (!(CATEGORIAS_AUDITORIA as readonly string[]).includes(categoria)) throw new ErroApi(400, "Categoria inválida.");
      filtro("categoria = ?", categoria);
    }
    if (usuario) filtro("usuario_id = ?", usuario);
    if (busca?.trim()) {
      valores.push(`%${busca.trim().replace(/[\\%_]/g, (s) => `\\${s}`)}%`);
      condicoes.push(`(descricao ilike $${valores.length} or usuario ilike $${valores.length})`);
    }
    if (antesDe) {
      const [quando, id] = antesDe.split("|");
      if (!quando || !id || Number.isNaN(Date.parse(quando))) throw new ErroApi(400, "Cursor inválido.");
      valores.push(quando, id);
      condicoes.push(`(criado_em, id) < ($${valores.length - 1}::timestamptz, $${valores.length}::uuid)`);
    }

    const onde = condicoes.length > 0 ? `where ${condicoes.join(" and ")}` : "";
    const linhas = await banco.consultar<Linha>(`select * from auditoria ${onde} order by criado_em desc, id desc limit ${POR_PAGINA + 1}`, valores);
    const pagina = linhas.slice(0, POR_PAGINA);
    const ultimo = pagina.at(-1);
    return c.json({
      registros: pagina.map(paraJson),
      proximo: linhas.length > POR_PAGINA && ultimo ? `${dataISO(ultimo.criado_em)}|${ultimo.id}` : null,
    });
  });

  /** Quem aparece na auditoria (para o filtro por funcionário), inclusive quem já foi excluído. */
  app.get("/auditoria/usuarios", ...ver, async (c) => {
    const linhas = await banco.consultar<{ id: string; nome: string }>(
      `select distinct on (usuario_id) usuario_id as id, usuario as nome from auditoria where usuario_id is not null order by usuario_id, criado_em desc`,
    );
    return c.json(linhas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
  });
}
