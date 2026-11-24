import { z } from "zod";
import { auditar, diferencas, reais } from "../auditoria";

import { codigoPg, type Contexto, ErroApi, lerCorpo, montarInsert, montarUpdate, paraCamel, violaChaveEstrangeira } from "./util";

const texto = (max: number) => z.string().trim().max(max, `No máximo ${max} caracteres.`);

export const esquemaServicoApi = z.object({
  codigo: texto(30),
  descricao: texto(150).min(1, "Informe a descrição."),
  categoria: texto(30),
  valor: z.number().int("Informe o valor em centavos.").min(0, "O valor não pode ser negativo.").max(2_000_000_000, "Valor alto demais."),
  tempoHoras: z.number().min(0, "O tempo não pode ser negativo.").max(999, "Tempo grande demais."),
  garantiaDias: z.number().int("Informe dias inteiros.").min(0, "A garantia não pode ser negativa.").max(99_999, "Valor alto demais."),
  garantiaKm: z.number().int("Informe km inteiros.").min(0, "A garantia não pode ser negativa.").max(9_999_999, "Valor alto demais."),
  observacoes: texto(1000),
  ativo: z.boolean(),
});

function saida(linha: Record<string, unknown>, verValores: boolean) {
  const s = paraCamel<Record<string, unknown>>(linha);
  if (!verValores) s.valor = 0;
  return s;
}

export function registrarRotasServicos({ app, banco, exigirSessao, exigirPermissao }: Contexto) {
  const ver = [exigirSessao, exigirPermissao("servicos.ver")] as const;
  const editar = [exigirSessao, exigirPermissao("servicos.editar")] as const;

  async function buscar(id: string) {
    const [linha] = await banco.consultar("select * from servicos where id = $1::uuid", [id]).catch(() => []);
    if (!linha) throw new ErroApi(404, "Serviço não encontrado.");
    return linha;
  }

  const paraBanco = (d: z.infer<typeof esquemaServicoApi>, verValores: boolean, atual?: Record<string, unknown>) => ({
    ...d,
    valor: verValores ? d.valor : Number(atual?.valor ?? 0),
  });

  const erroCodigo = () => new ErroApi(409, "Já existe um serviço com este código.", { codigo: "Já existe um serviço com este código." });

  app.get("/servicos", ...ver, async (c) => {
    const verValores = c.get("permissoes").includes("valores.ver");
    return c.json((await banco.consultar("select * from servicos order by lower(descricao)")).map((l) => saida(l, verValores)));
  });

  app.get("/servicos/:id", ...ver, async (c) => c.json(saida(await buscar(c.req.param("id")), c.get("permissoes").includes("valores.ver"))));

  app.post("/servicos", ...editar, async (c) => {
    const verValores = c.get("permissoes").includes("valores.ver");
    const dados = paraBanco(await lerCorpo(c, esquemaServicoApi), verValores);
    if (dados.codigo !== "") {
      try {
        const { sql, valores } = montarInsert("servicos", dados);
        const [linha] = await banco.consultar(sql, valores);
        return c.json(saida(linha, verValores), 201);
      } catch (erro) {
        if (codigoPg(erro) === "23505") throw erroCodigo();
        throw erro;
      }
    }
    // Código automático. Se alguém já digitou o próximo número à mão, tenta o seguinte.
    const { codigo: _vazio, ...semCodigo } = dados;
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      try {
        const { sql, valores } = montarInsert("servicos", semCodigo, { codigo: `numero_com_zeros('SRV-', nextval('servico_codigo_seq'), 3)` });
        const [linha] = await banco.consultar(sql, valores);
        return c.json(saida(linha, verValores), 201);
      } catch (erro) {
        if (codigoPg(erro) !== "23505") throw erro;
      }
    }
    throw new ErroApi(409, "Não foi possível gerar o código. Informe um código.");
  });

  app.put("/servicos/:id", ...editar, async (c) => {
    const verValores = c.get("permissoes").includes("valores.ver");
    const atual = await buscar(c.req.param("id"));
    const dados = paraBanco(await lerCorpo(c, esquemaServicoApi), verValores, atual);
    const { codigo, ...resto } = dados;
    const { sql, valores } = montarUpdate("servicos", String(atual.id), codigo === "" ? resto : dados);
    try {
      const linha = await banco.transacao(async (q) => {
        const [nova] = await q(sql, valores);
        const mudancas = diferencas(atual, nova, { valor: "Valor" });
        if (mudancas.length > 0) {
          await auditar(q, c, {
            categoria: "precos",
            acao: "servico.preco_alterado",
            descricao: `Alterou o valor do serviço ${String(nova.descricao)}: ${reais(Number(mudancas[0].antes))} → ${reais(Number(mudancas[0].depois))}.`,
            alvo: { tipo: "servico", id: String(nova.id) },
            detalhes: { mudancas, moeda: true },
          });
        }
        return nova;
      });
      return c.json(saida(linha, verValores));
    } catch (erro) {
      if (codigoPg(erro) === "23505") throw erroCodigo();
      throw erro;
    }
  });

  app.patch("/servicos/:id/ativo", ...editar, async (c) => {
    const { ativo } = await lerCorpo(c, z.object({ ativo: z.boolean() }));
    const atual = await buscar(c.req.param("id"));
    const [linha] = await banco.consultar("update servicos set ativo = $1 where id = $2 returning *", [ativo, atual.id]);
    return c.json(saida(linha, c.get("permissoes").includes("valores.ver")));
  });

  app.delete("/servicos/:id", ...editar, async (c) => {
    const atual = await buscar(c.req.param("id"));
    try {
      await banco.transacao(async (q) => {
        await q("delete from servicos where id = $1", [atual.id]);
        await auditar(q, c, {
          categoria: "cadastros",
          acao: "servico.excluido",
          descricao: `Excluiu o serviço ${String(atual.descricao)}${atual.codigo ? ` (${String(atual.codigo)})` : ""}.`,
          alvo: { tipo: "servico", id: String(atual.id) },
        });
      });
    } catch (erro) {
      if (violaChaveEstrangeira(erro)) throw new ErroApi(409, "Este serviço tem documentos ligados e não pode ser excluído. Inative o cadastro.");
      throw erro;
    }
    return c.body(null, 204);
  });
}
