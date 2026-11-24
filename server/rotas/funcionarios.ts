import { z } from "zod";
import { auditar, diferencas } from "../auditoria";

import type { Auth } from "../auth";
import type { Consulta } from "../banco";
import { permissoesDoPerfil } from "../perfis";
import { gerarSenhaProvisoria } from "../senha";

import { codigoPg, type Contexto, ErroApi, lerCorpo } from "./util";

const esquemaFuncionario = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo.").max(100, "No máximo 100 caracteres."),
  email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.")).pipe(z.string().max(120, "No máximo 120 caracteres.")),
  perfilId: z.string().min(1, "Escolha um perfil."),
});
const esquemaAtivo = z.object({ ativo: z.boolean() });

type Linha = { id: string; name: string; email: string; role: string; banned: boolean | null; trocarSenha: boolean | null; createdAt: Date | string; ultimoAcesso: Date | string | null };

const paraJson = (l: Linha) => ({
  id: l.id,
  nome: l.name,
  email: l.email,
  perfilId: l.role,
  ativo: !l.banned,
  trocarSenha: !!l.trocarSenha,
  criadoEm: new Date(l.createdAt).toISOString(),
  ultimoAcesso: l.ultimoAcesso ? new Date(l.ultimoAcesso).toISOString() : null,
});

const SELECIONAR = `select u.id, u.name, u.email, u.role, u.banned, u."trocarSenha", u."createdAt",
  (select max(s."createdAt") from session s where s."userId" = u.id) as "ultimoAcesso" from "user" u`;

/** Funcionários: criação, edição, ativar/desativar e redefinição de senha, com as proteções de acesso. */
export function registrarRotasFuncionarios({ app, banco, exigirSessao, exigirPermissao }: Contexto, auth: Auth) {
  const guarda = [exigirSessao, exigirPermissao("funcionarios.gerenciar")] as const;

  const quemChama = (c: { get: (k: "sessao") => unknown }) => (c.get("sessao") as { user: { id: string; role?: string } }).user;
  const ehProtegido = async (q: Consulta, perfilId: string) => (await q<{ protegido: boolean }>("select protegido from perfis where id = $1", [perfilId]))[0]?.protegido === true;
  const emailRepetido = () => new ErroApi(409, "Já existe um funcionário com este e-mail.", { email: "Já existe um funcionário com este e-mail." });

  async function buscar(q: Consulta, id: string): Promise<Linha> {
    const [linha] = await q<Linha>(`${SELECIONAR} where u.id = $1`, [id]);
    if (!linha) throw new ErroApi(404, "Funcionário não encontrado.");
    return linha;
  }

  async function exigirPerfilValido(q: Consulta, perfilId: string) {
    const existe = await q("select 1 from perfis where id = $1", [perfilId]);
    if (existe.length === 0) throw new ErroApi(400, "Perfil inexistente.", { perfilId: "Escolha um perfil válido." });
  }

  /**
   * Ninguém gerencia (cria, edita, atribui, redefine, desativa) funcionários cujo perfil tenha
   * permissões que o próprio chamador não tem. O Administrador tem todas, então pode tudo;
   * os demais não alcançam administradores nem perfis acima do seu.
   */
  async function exigirPoderSobre(q: Consulta, chamador: { role?: string }, ...perfisEnvolvidos: string[]) {
    const minhas = new Set(await permissoesDoPerfil({ consultar: q }, chamador.role ?? ""));
    for (const perfil of perfisEnvolvidos) {
      const dele = await permissoesDoPerfil({ consultar: q }, perfil);
      if (dele.some((permissao) => !minhas.has(permissao))) throw new ErroApi(403, "Você não pode gerenciar funcionários com mais permissões do que as suas.");
    }
  }

  /** Antes de tirar um administrador ativo do jogo: precisa sobrar outro ativo. Trava as linhas para evitar corrida. */
  async function garantirOutroAdministrador(q: Consulta, idAlvo: string) {
    // Trava todos os administradores (o alvo incluído) sempre na mesma ordem: sem deadlock entre duas operações simultâneas.
    const administradores = await q<{ id: string; banned: boolean | null }>(
      `select u.id, u.banned from "user" u join perfis p on p.id = u.role where p.protegido order by u.id for update of u`,
    );
    const outros = administradores.filter((a) => a.id !== idAlvo && !a.banned);
    if (outros.length === 0) throw new ErroApi(409, "Este é o último administrador ativo. Cadastre outro antes de continuar.");
  }

  const nomePerfil = async (q: Consulta, perfilId: string) => (await q<{ nome: string }>("select nome from perfis where id = $1", [perfilId]))[0]?.nome ?? perfilId;

  async function emailLivre(q: Consulta, email: string, ignorarId = "") {
    const existe = await q(`select 1 from "user" where lower(email) = $1 and id <> $2`, [email, ignorarId]);
    if (existe.length > 0) throw emailRepetido();
  }

  app.get("/funcionarios", ...guarda, async (c) => {
    const linhas = await banco.consultar<Linha>(`${SELECIONAR} order by u.name`);
    return c.json(linhas.map(paraJson));
  });

  app.post("/funcionarios", ...guarda, async (c) => {
    const dados = await lerCorpo(c, esquemaFuncionario);
    const chamador = quemChama(c);
    await exigirPerfilValido(banco.consultar, dados.perfilId);
    await exigirPoderSobre(banco.consultar, chamador, dados.perfilId);
    await emailLivre(banco.consultar, dados.email);

    const contexto = await auth.$context;
    const senha = gerarSenhaProvisoria();
    let usuario: { id: string };
    try {
      usuario = await contexto.internalAdapter.createUser({ name: dados.nome, email: dados.email, emailVerified: false, role: dados.perfilId, trocarSenha: true }, { method: "admin" });
    } catch (erro) {
      if (codigoPg(erro) === "23505" || (await banco.consultar(`select 1 from "user" where lower(email) = $1`, [dados.email])).length > 0) throw emailRepetido();
      throw erro;
    }
    try {
      await contexto.internalAdapter.linkAccount({ userId: usuario.id, providerId: "credential", accountId: usuario.id, password: await contexto.password.hash(senha) });
    } catch (erro) {
      await contexto.internalAdapter.deleteUser(usuario.id).catch(() => {}); // não deixa funcionário sem senha para trás
      throw erro;
    }
    await auditar(banco.consultar, c, {
      categoria: "acesso",
      acao: "funcionario.criado",
      descricao: `Cadastrou o funcionário ${dados.nome} (${dados.email}) com o perfil ${await nomePerfil(banco.consultar, dados.perfilId)}.`,
      alvo: { tipo: "funcionario", id: usuario.id },
    });
    return c.json({ funcionario: paraJson(await buscar(banco.consultar, usuario.id)), senhaProvisoria: senha }, 201);
  });

  app.put("/funcionarios/:id", ...guarda, async (c) => {
    const id = c.req.param("id");
    const dados = await lerCorpo(c, esquemaFuncionario);
    const chamador = quemChama(c);
    await banco.transacao(async (q) => {
      const atual = await buscar(q, id);
      await exigirPerfilValido(q, dados.perfilId);
      await q("select 1 from perfis where id = $1 for share", [dados.perfilId]); // impede excluir o perfil no meio da troca
      await exigirPoderSobre(q, chamador, atual.role, dados.perfilId);
      await emailLivre(q, dados.email, id);
      if (atual.role !== dados.perfilId) {
        if (id === chamador.id) throw new ErroApi(409, "Você não pode mudar o seu próprio perfil.");
        if ((await ehProtegido(q, atual.role)) && !atual.banned) await garantirOutroAdministrador(q, id);
      }
      try {
        await q(`update "user" set name = $2, email = $3, role = $4, "updatedAt" = now() where id = $1`, [id, dados.nome, dados.email, dados.perfilId]);
      } catch (erro) {
        if (codigoPg(erro) === "23505") throw emailRepetido();
        throw erro;
      }
      const mudancas = diferencas(
        { nome: atual.name, email: atual.email, perfil: await nomePerfil(q, atual.role) },
        { nome: dados.nome, email: dados.email, perfil: await nomePerfil(q, dados.perfilId) },
        { nome: "Nome", email: "E-mail", perfil: "Perfil" },
      );
      if (mudancas.length > 0) {
        const trocouPerfil = mudancas.find((m) => m.campo === "Perfil");
        await auditar(q, c, {
          categoria: "acesso",
          acao: trocouPerfil ? "funcionario.perfil_alterado" : "funcionario.editado",
          descricao: trocouPerfil
            ? `Mudou o perfil de ${dados.nome}: ${String(trocouPerfil.antes)} → ${String(trocouPerfil.depois)}.`
            : `Editou o cadastro do funcionário ${dados.nome}.`,
          alvo: { tipo: "funcionario", id },
          detalhes: { mudancas },
        });
      }
    });
    return c.json(paraJson(await buscar(banco.consultar, id)));
  });

  app.patch("/funcionarios/:id/ativo", ...guarda, async (c) => {
    const id = c.req.param("id");
    const { ativo } = await lerCorpo(c, esquemaAtivo);
    const chamador = quemChama(c);
    await banco.transacao(async (q) => {
      const atual = await buscar(q, id);
      await exigirPoderSobre(q, chamador, atual.role);
      if (!ativo) {
        if (id === chamador.id) throw new ErroApi(409, "Você não pode desativar o seu próprio acesso.");
        if ((await ehProtegido(q, atual.role)) && !atual.banned) await garantirOutroAdministrador(q, id);
      }
      await q(`update "user" set banned = $2, "banReason" = null, "banExpires" = null, "updatedAt" = now() where id = $1`, [id, !ativo]);
      if (!ativo) await q(`delete from session where "userId" = $1`, [id]);
      if (Boolean(atual.banned) === ativo) {
        await auditar(q, c, {
          categoria: "acesso",
          acao: ativo ? "funcionario.reativado" : "funcionario.desativado",
          descricao: `${ativo ? "Reativou" : "Desativou"} o acesso de ${atual.name}.`,
          alvo: { tipo: "funcionario", id },
        });
      }
    });
    return c.json(paraJson(await buscar(banco.consultar, id)));
  });

  app.post("/funcionarios/:id/redefinir-senha", ...guarda, async (c) => {
    const id = c.req.param("id");
    const chamador = quemChama(c);
    const atual = await buscar(banco.consultar, id);
    await exigirPoderSobre(banco.consultar, chamador, atual.role);
    if (id === chamador.id) throw new ErroApi(409, "Para mudar a sua própria senha, use “Trocar senha” no menu do usuário.");
    if (atual.banned) throw new ErroApi(409, "Reative o funcionário antes de redefinir a senha.");
    const [conta] = await banco.consultar(`select 1 from account where "userId" = $1 and "providerId" = 'credential'`, [id]);
    if (!conta) throw new ErroApi(409, "Este funcionário não tem senha cadastrada. Crie o cadastro de novo.");
    const contexto = await auth.$context;
    const senha = gerarSenhaProvisoria();
    await contexto.internalAdapter.updatePassword(id, await contexto.password.hash(senha));
    await banco.consultar(`update "user" set "trocarSenha" = true where id = $1`, [id]);
    await banco.consultar(`delete from session where "userId" = $1`, [id]);
    await auditar(banco.consultar, c, {
      categoria: "acesso",
      acao: "funcionario.senha_redefinida",
      descricao: `Redefiniu a senha de ${atual.name}.`,
      alvo: { tipo: "funcionario", id },
    });
    return c.json({ funcionario: paraJson(await buscar(banco.consultar, id)), senhaProvisoria: senha });
  });
}
