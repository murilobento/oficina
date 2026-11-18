import { z } from "zod";

import { PERMISSOES, type Permissao } from "../../src/features/auth/permissoes";

import { permissoesDoPerfil } from "../perfis";

import { codigoPg, type Contexto, ErroApi, lerCorpo } from "./util";

const CHAVES = Object.keys(PERMISSOES) as [Permissao, ...Permissao[]];

export const esquemaPerfilApi = z.object({
  nome: z.string().trim().min(3, "Informe o nome do perfil.").max(60, "No máximo 60 caracteres."),
  descricao: z.string().trim().max(200, "No máximo 200 caracteres."),
  permissoes: z.array(z.enum(CHAVES, "Permissão inexistente.")).max(CHAVES.length),
});

type Linha = { id: string; nome: string; descricao: string; protegido: boolean };

export function registrarRotasPerfis({ app, banco, exigirSessao, exigirPermissao }: Contexto) {
  const podeListar: ReturnType<typeof exigirPermissao> = async (c, proximo) => {
    const permissoes = c.get("permissoes");
    if (!permissoes.includes("perfis.gerenciar") && !permissoes.includes("funcionarios.gerenciar")) return c.json({ erro: "Sem permissão para esta ação." }, 403);
    await proximo();
  };

  async function montar(id?: string) {
    const perfis = await banco.consultar<Linha & { funcionarios: string }>(
      `select p.id, p.nome, p.descricao, p.protegido, (select count(*) from "user" u where u.role = p.id) as funcionarios
         from perfis p ${id ? "where p.id = $1" : ""} order by p.protegido desc, p.nome`,
      id ? [id] : [],
    );
    const permissoes = await banco.consultar<{ perfil_id: string; permissao: Permissao }>("select perfil_id, permissao from perfil_permissoes order by permissao");
    return perfis.map((p) => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      protegido: p.protegido,
      funcionarios: Number(p.funcionarios),
      permissoes: p.protegido ? (CHAVES.slice() as Permissao[]) : permissoes.filter((x) => x.perfil_id === p.id).map((x) => x.permissao),
    }));
  }

  /** Quem não é administrador só concede permissões que ele mesmo tem. */
  async function exigirConcedivel(c: { get: (k: "sessao") => unknown }, pedidas: Permissao[]) {
    const role = (c.get("sessao") as { user: { role?: string } }).user.role ?? "";
    const minhas = new Set(await permissoesDoPerfil(banco, role));
    if (pedidas.some((permissao) => !minhas.has(permissao))) throw new ErroApi(403, "Você só pode conceder permissões que você mesmo tem.");
  }

  const nomeRepetido = () => new ErroApi(409, "Já existe um perfil com este nome.", { nome: "Já existe um perfil com este nome." });

  async function nomeLivre(nome: string, ignorarId?: string) {
    const existentes = await banco.consultar(`select 1 from perfis where lower(nome) = lower($1) and id <> $2`, [nome, ignorarId ?? ""]);
    if (existentes.length > 0) throw nomeRepetido();
  }

  async function exigirEditavel(id: string): Promise<Linha> {
    const [perfil] = await banco.consultar<Linha>("select id, nome, descricao, protegido from perfis where id = $1", [id]);
    if (!perfil) throw new ErroApi(404, "Perfil não encontrado.");
    if (perfil.protegido) throw new ErroApi(403, "O perfil Administrador não pode ser alterado.");
    return perfil;
  }

  app.get("/perfis", exigirSessao, podeListar, async (c) => c.json(await montar()));

  app.post("/perfis", exigirSessao, exigirPermissao("perfis.gerenciar"), async (c) => {
    const dados = await lerCorpo(c, esquemaPerfilApi);
    await exigirConcedivel(c, dados.permissoes);
    await nomeLivre(dados.nome);
    const id = crypto.randomUUID();
    await banco
      .transacao(async (q) => {
        await q("insert into perfis (id, nome, descricao, protegido) values ($1, $2, $3, false)", [id, dados.nome, dados.descricao]);
        for (const permissao of new Set(dados.permissoes)) await q("insert into perfil_permissoes (perfil_id, permissao) values ($1, $2)", [id, permissao]);
      })
      .catch((erro) => {
        throw codigoPg(erro) === "23505" ? nomeRepetido() : erro;
      });
    return c.json((await montar(id))[0], 201);
  });

  app.put("/perfis/:id", exigirSessao, exigirPermissao("perfis.gerenciar"), async (c) => {
    const id = c.req.param("id");
    await exigirEditavel(id);
    const dados = await lerCorpo(c, esquemaPerfilApi);
    await exigirConcedivel(c, dados.permissoes);
    await nomeLivre(dados.nome, id);
    await banco
      .transacao(async (q) => {
        await q("update perfis set nome = $2, descricao = $3 where id = $1", [id, dados.nome, dados.descricao]);
        await q("delete from perfil_permissoes where perfil_id = $1", [id]);
        for (const permissao of new Set(dados.permissoes)) await q("insert into perfil_permissoes (perfil_id, permissao) values ($1, $2)", [id, permissao]);
      })
      .catch((erro) => {
        throw codigoPg(erro) === "23505" ? nomeRepetido() : erro;
      });
    return c.json((await montar(id))[0]);
  });

  app.delete("/perfis/:id", exigirSessao, exigirPermissao("perfis.gerenciar"), async (c) => {
    const id = c.req.param("id");
    await exigirEditavel(id);
    await banco.transacao(async (q) => {
      await q("select 1 from perfis where id = $1 for update", [id]); // espera quem estiver atribuindo este perfil
      const [{ total }] = await q<{ total: string }>(`select count(*) as total from "user" where role = $1`, [id]);
      if (Number(total) > 0) throw new ErroApi(409, "Este perfil tem funcionários. Troque o perfil deles antes de excluir.");
      await q("delete from perfis where id = $1", [id]);
    });
    return c.body(null, 204);
  });
}
