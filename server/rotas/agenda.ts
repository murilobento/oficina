import { createHash, randomBytes } from "node:crypto";

import { z } from "zod";

import { dataValida, somarDias } from "../../src/features/vendas/parcelas";
import { auditar } from "../auditoria";

import { conferirClienteEVeiculo, subirKm } from "./itens-venda";
import { type Contexto, ErroApi, lerCorpo } from "./util";
import { quemSou } from "./venda-gravar";

const texto = (max: number) => z.string().trim().max(max, `No máximo ${max} caracteres.`);
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const esquemaAgendamento = z.object({
  data: z.string().refine(dataValida, "Data inválida."),
  hora: z.string().regex(HORA, "Hora inválida. Use o formato 08:30."),
  clienteId: z.uuid("Escolha o cliente."),
  veiculoId: z.uuid("Escolha o veículo."),
  servico: texto(200).min(1, "Diga o serviço previsto."),
  observacoes: texto(500),
});

const esquemaChegada = z.object({
  km: z.number().int("Informe km inteiros.").min(0, "A quilometragem não pode ser negativa.").max(9_999_999, "Quilometragem alta demais."),
});

type LinhaAgendamento = {
  id: string;
  data: string | Date;
  hora: string;
  cliente_id: string;
  veiculo_id: string;
  servico: string;
  observacoes: string;
  status: "agendado" | "chegou" | "faltou" | "cancelado";
  ordem_id: string | null;
  ordem_numero: string | null;
  criado_por: string;
  criado_em: string | Date;
};

/** Data do banco ("date") sempre como AAAA-MM-DD, sem fuso. */
const dataTexto = (valor: string | Date) => (valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10));
const horaTexto = (valor: string) => String(valor).slice(0, 5);
const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const paraJson = (l: LinhaAgendamento) => ({
  id: l.id,
  data: dataTexto(l.data),
  hora: horaTexto(l.hora),
  clienteId: l.cliente_id,
  veiculoId: l.veiculo_id,
  servico: l.servico,
  observacoes: l.observacoes,
  status: l.status,
  ordemId: l.ordem_id ?? "",
  ordemNumero: l.ordem_numero ?? "",
  criadoPor: l.criado_por,
  criadoEm: new Date(l.criado_em).toISOString(),
});

const SELECIONAR = `select a.*, o.numero as ordem_numero from agendamentos a left join ordens o on o.id = a.ordem_id`;

/** O token da TV nunca é gravado: só o hash (quem vê o banco não consegue montar o link). */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function registrarRotasAgenda({ app, banco, exigirSessao, exigirPermissao }: Contexto) {
  const ver = [exigirSessao, exigirPermissao("agenda.ver")] as const;
  const editar = [exigirSessao, exigirPermissao("agenda.editar")] as const;
  const gerenciarTv = [exigirSessao, exigirPermissao("empresa.gerenciar")] as const;

  async function buscar(id: string) {
    const [linha] = await banco.consultar<LinhaAgendamento>(`${SELECIONAR} where a.id = $1::uuid`, [id]).catch(() => []);
    if (!linha) throw new ErroApi(404, "Agendamento não encontrado.");
    return linha;
  }

  /** Agendamentos de um período (padrão: a semana a partir de hoje), por dia e hora. */
  app.get("/agendamentos", ...ver, async (c) => {
    const de = c.req.query("de") ?? "";
    const ate = c.req.query("ate") ?? "";
    if (!dataValida(de) || !dataValida(ate)) throw new ErroApi(400, "Informe o período (de e ate, AAAA-MM-DD).");
    if (ate < de || ate > somarDias(de, 62)) throw new ErroApi(400, "Período inválido (no máximo 62 dias).");
    const linhas = await banco.consultar<LinhaAgendamento>(`${SELECIONAR} where a.data between $1::date and $2::date order by a.data, a.hora, a.criado_em`, [de, ate]);
    return c.json(linhas.map(paraJson));
  });

  app.post("/agendamentos", ...editar, async (c) => {
    const dados = await lerCorpo(c, esquemaAgendamento);
    // Tolerância de 1 dia: o servidor pode estar em outro fuso que o aparelho.
    const hoje = new Date().toISOString().slice(0, 10);
    if (dados.data < somarDias(hoje, -1)) throw new ErroApi(400, "A data não pode ser no passado.", { data: "A data não pode ser no passado." });
    await conferirClienteEVeiculo(banco.consultar, dados.clienteId, dados.veiculoId);
    const [{ id }] = await banco.consultar<{ id: string }>(
      "insert into agendamentos (data, hora, cliente_id, veiculo_id, servico, observacoes, criado_por) values ($1::date, $2::time, $3, $4, $5, $6, $7) returning id",
      [dados.data, dados.hora, dados.clienteId, dados.veiculoId, dados.servico, dados.observacoes, quemSou(c)],
    );
    return c.json(paraJson(await buscar(id)), 201);
  });

  app.put("/agendamentos/:id", ...editar, async (c) => {
    const atual = await buscar(c.req.param("id"));
    if (atual.status !== "agendado") throw new ErroApi(409, "Só dá para editar agendamentos que ainda não aconteceram.");
    const dados = await lerCorpo(c, esquemaAgendamento);
    await conferirClienteEVeiculo(banco.consultar, dados.clienteId, dados.veiculoId);
    await banco.consultar(
      "update agendamentos set data = $2::date, hora = $3::time, cliente_id = $4, veiculo_id = $5, servico = $6, observacoes = $7 where id = $1::uuid",
      [atual.id, dados.data, dados.hora, dados.clienteId, dados.veiculoId, dados.servico, dados.observacoes],
    );
    return c.json(paraJson(await buscar(atual.id)));
  });

  /** Faltou ou cancelado (o cancelamento fica na auditoria). */
  app.post("/agendamentos/:id/status", ...editar, async (c) => {
    const { status } = await lerCorpo(c, z.object({ status: z.enum(["faltou", "cancelado"], "Situação inválida.") }));
    const id = c.req.param("id");
    await buscar(id);
    await banco.transacao(async (q) => {
      const [feito] = await q<{ data: string | Date; hora: string; servico: string; placa: string; modelo: string }>(
        `update agendamentos a set status = $2 from veiculos v
          where a.id = $1::uuid and a.status = 'agendado' and v.id = a.veiculo_id
          returning a.data, a.hora, a.servico, v.placa, v.modelo`,
        [id, status],
      );
      if (!feito) throw new ErroApi(409, "Este agendamento já foi resolvido (chegou, faltou ou foi cancelado).");
      if (status === "cancelado") {
        await auditar(q, c, {
          categoria: "documentos",
          acao: "agendamento.cancelado",
          descricao: `Cancelou o agendamento de ${dataBR(dataTexto(feito.data))} ${horaTexto(feito.hora)}: ${feito.modelo}${feito.placa ? ` (${feito.placa})` : ""}, ${feito.servico}.`,
          alvo: { tipo: "agendamento", id },
        });
      }
    });
    return c.json(paraJson(await buscar(id)));
  });

  /** O carro chegou: abre a OS com o serviço previsto e liga ao agendamento, tudo junto. */
  app.post("/agendamentos/:id/ordem", exigirSessao, exigirPermissao("ordens.editar"), async (c) => {
    const { km } = await lerCorpo(c, esquemaChegada);
    const id = c.req.param("id");
    await buscar(id);
    await banco.transacao(async (q) => {
      const [ag] = await q<LinhaAgendamento>("select * from agendamentos where id = $1::uuid for update", [id]);
      if (ag.status !== "agendado") throw new ErroApi(409, ag.status === "chegou" ? "Este carro já chegou e a OS já foi aberta." : "Este agendamento já foi resolvido.");
      await conferirClienteEVeiculo(q, ag.cliente_id, ag.veiculo_id);
      const problema = [ag.servico, ag.observacoes].filter(Boolean).join("\n").slice(0, 500);
      const [nova] = await q<{ id: string }>("insert into ordens (cliente_id, veiculo_id, km, problema) values ($1, $2, $3, $4) returning id", [ag.cliente_id, ag.veiculo_id, km, problema]);
      await subirKm(q, ag.veiculo_id, km);
      await q("insert into ordem_eventos (ordem_id, texto, quem) values ($1::uuid, $2, $3)", [
        nova.id,
        `OS aberta a partir do agendamento de ${dataBR(dataTexto(ag.data))} às ${horaTexto(ag.hora)}.`,
        quemSou(c),
      ]);
      await q("update agendamentos set status = 'chegou', ordem_id = $2 where id = $1::uuid", [id, nova.id]);
    });
    return c.json(paraJson(await buscar(id)), 201);
  });

  // ---------- Links da TV do pátio ----------

  app.get("/tv-acessos", ...gerenciarTv, async (c) => {
    const linhas = await banco.consultar<{ id: string; nome: string; criado_por: string; criado_em: string | Date; ultimo_uso: string | Date | null; revogado_em: string | Date | null }>(
      "select id, nome, criado_por, criado_em, ultimo_uso, revogado_em from tv_acessos order by revogado_em nulls first, criado_em desc",
    );
    const iso = (v: string | Date | null) => (v ? new Date(v).toISOString() : null);
    return c.json(linhas.map((l) => ({ id: l.id, nome: l.nome, criadoPor: l.criado_por, criadoEm: iso(l.criado_em), ultimoUso: iso(l.ultimo_uso), revogadoEm: iso(l.revogado_em) })));
  });

  /** Gera o link. O token volta só nesta resposta; depois, nem a oficina consegue ver de novo. */
  app.post("/tv-acessos", ...gerenciarTv, async (c) => {
    const { nome } = await lerCorpo(c, z.object({ nome: texto(60).min(1, "Dê um nome para a TV, ex.: TV do pátio.") }));
    const token = randomBytes(32).toString("base64url");
    const id = await banco.transacao(async (q) => {
      const [linha] = await q<{ id: string }>("insert into tv_acessos (nome, token_hash, criado_por) values ($1, $2, $3) returning id", [nome, hashToken(token), quemSou(c)]);
      await auditar(q, c, { categoria: "acesso", acao: "tv.link_criado", descricao: `Criou o link de TV "${nome}".`, alvo: { tipo: "tv", id: linha.id } });
      return linha.id;
    });
    return c.json({ id, nome, token }, 201);
  });

  app.delete("/tv-acessos/:id", ...gerenciarTv, async (c) => {
    const id = c.req.param("id");
    await banco.transacao(async (q) => {
      const [linha] = await q<{ nome: string }>("update tv_acessos set revogado_em = now() where id = $1::uuid and revogado_em is null returning nome", [id]).catch(() => []);
      if (!linha) throw new ErroApi(404, "Link de TV não encontrado ou já revogado.");
      await auditar(q, c, { categoria: "acesso", acao: "tv.link_revogado", descricao: `Revogou o link de TV "${linha.nome}".`, alvo: { tipo: "tv", id } });
    });
    return c.body(null, 204);
  });

  /**
   * Painel da TV, sem login: agenda do dia e o pátio. Sem valores e sem dados do cliente,
   * porque a tela fica à vista de todos. `dia` é a data local da TV (evita erro de fuso do servidor).
   */
  app.get("/tv/:token", async (c) => {
    const [acesso] = await banco.consultar<{ id: string; ultimo_uso: string | Date | null }>(
      "select id, ultimo_uso from tv_acessos where token_hash = $1 and revogado_em is null",
      [hashToken(c.req.param("token"))],
    );
    if (!acesso) throw new ErroApi(404, "Link de TV inválido ou revogado.");
    const cincoMinutos = 5 * 60 * 1000;
    if (!acesso.ultimo_uso || Date.now() - new Date(acesso.ultimo_uso).getTime() > cincoMinutos) {
      await banco.consultar("update tv_acessos set ultimo_uso = now() where id = $1", [acesso.id]);
    }

    const diaPedido = c.req.query("dia") ?? "";
    const dia = dataValida(diaPedido) ? diaPedido : new Date().toISOString().slice(0, 10);
    const [empresa] = await banco.consultar<{ nome_fantasia: string; logo: string }>("select nome_fantasia, logo from empresa where id = 1");
    const agenda = await banco.consultar<{ id: string; hora: string; status: string; servico: string; modelo: string; placa: string; cor: string; ordem_numero: string | null }>(
      `select a.id, a.hora, a.status, a.servico, v.modelo, v.placa, v.cor, o.numero as ordem_numero
         from agendamentos a join veiculos v on v.id = a.veiculo_id left join ordens o on o.id = a.ordem_id
        where a.data = $1::date and a.status <> 'cancelado' order by a.hora, a.criado_em`,
      [dia],
    );
    const patio = await banco.consultar<{ id: string; numero: string; status: string; problema: string; modelo: string; placa: string; cor: string; atualizado_em: string | Date; criado_em: string | Date }>(
      `select o.id, o.numero, o.status, o.problema, v.modelo, v.placa, v.cor, o.atualizado_em, o.criado_em
         from ordens o join veiculos v on v.id = o.veiculo_id
        where o.status in ('fila', 'execucao', 'aguardando_peca', 'pronto') order by o.atualizado_em`,
    );
    return c.json({
      dia,
      geradoEm: new Date().toISOString(),
      empresa: { nome: empresa?.nome_fantasia ?? "", logo: empresa?.logo ?? "" },
      agenda: agenda.map((a) => ({ id: a.id, hora: horaTexto(a.hora), status: a.status, servico: a.servico, modelo: a.modelo, placa: a.placa, cor: a.cor, ordemNumero: a.ordem_numero ?? "" })),
      patio: patio.map((o) => ({
        id: o.id,
        numero: o.numero,
        status: o.status,
        problema: o.problema.slice(0, 160),
        modelo: o.modelo,
        placa: o.placa,
        cor: o.cor,
        desde: new Date(o.atualizado_em).toISOString(),
      })),
    });
  });
}
