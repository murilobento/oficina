import { z } from "zod";

import { codigoPg, violaChaveEstrangeira, type Contexto, ErroApi, lerCorpo, montarInsert, montarUpdate, paraCamel } from "./util";

const texto = (max: number) => z.string().trim().max(max, `No máximo ${max} caracteres.`);
const LIMITE_CENTAVOS = 2_000_000_000;
const digitos = (v: string) => v.replace(/\D/g, "");

export const esquemaProdutoApi = z.object({
  codigo: texto(30),
  descricao: texto(150).min(1, "Informe a descrição."),
  categoria: texto(30),
  marca: texto(60),
  referencia: texto(60),
  codigoBarras: z.string().refine((v) => v === "" || [8, 12, 13, 14].includes(digitos(v).length), "O código de barras tem 8, 12, 13 ou 14 números."),
  unidade: texto(5).min(1, "Informe a unidade."),
  aplicacao: texto(300),
  custo: z.number().int("Informe o valor em centavos.").min(0, "O custo não pode ser negativo.").max(LIMITE_CENTAVOS, "Valor alto demais."),
  venda: z.number().int("Informe o valor em centavos.").min(0, "O preço não pode ser negativo.").max(LIMITE_CENTAVOS, "Valor alto demais."),
  estoqueMinimo: z.number().min(0, "O estoque mínimo não pode ser negativo.").max(999_999_999, "Quantidade alta demais."),
  localizacao: texto(60),
  fornecedorId: z.union([z.literal(""), z.uuid("Fornecedor inválido.")]),
  ncm: z.string().refine((v) => v === "" || digitos(v).length === 8, "O NCM tem 8 números."),
  observacoes: texto(1000),
  ativo: z.boolean(),
});

/** Saída para o front: sem `valores.ver`, custo e preço vêm zerados. */
function saida(linha: Record<string, unknown>, verValores: boolean) {
  const p = paraCamel<Record<string, unknown>>(linha);
  p.fornecedorId = p.fornecedorId ?? "";
  if (!verValores) {
    p.custo = 0;
    p.venda = 0;
  }
  return p;
}

export function registrarRotasProdutos({ app, banco, exigirSessao, exigirPermissao }: Contexto) {
  const ver = [exigirSessao, exigirPermissao("estoque.ver")] as const;
  const editar = [exigirSessao, exigirPermissao("estoque.editar")] as const;

  async function buscar(id: string) {
    const [linha] = await banco.consultar("select * from produtos where id = $1::uuid", [id]).catch(() => []);
    if (!linha) throw new ErroApi(404, "Produto não encontrado.");
    return linha;
  }

  const paraBanco = (d: z.infer<typeof esquemaProdutoApi>, verValores: boolean, atual?: Record<string, unknown>) => {
    const { custo, venda, ...resto } = d;
    return {
      ...resto,
      codigoBarras: digitos(d.codigoBarras),
      ncm: digitos(d.ncm),
      fornecedorId: d.fornecedorId === "" ? null : d.fornecedorId,
      // Sem `valores.ver`, o funcionário não altera preços: mantém o que já existe (ou 0, no cadastro novo).
      custo: verValores ? custo : Number(atual?.custo ?? 0),
      venda: verValores ? venda : Number(atual?.venda ?? 0),
    };
  };

  function mapearErro(erro: unknown): never {
    if (codigoPg(erro) === "23505") throw new ErroApi(409, "Já existe um produto com este código.", { codigo: "Já existe um produto com este código." });
    if (violaChaveEstrangeira(erro)) throw new ErroApi(400, "Fornecedor não encontrado.", { fornecedorId: "Fornecedor não encontrado." });
    throw erro;
  }

  app.get("/produtos", ...ver, async (c) => {
    const verValores = c.get("permissoes").includes("valores.ver");
    const linhas = await banco.consultar("select * from produtos order by lower(descricao)");
    return c.json(linhas.map((l) => saida(l, verValores)));
  });

  app.get("/produtos/:id", ...ver, async (c) => c.json(saida(await buscar(c.req.param("id")), c.get("permissoes").includes("valores.ver"))));

  app.post("/produtos", ...editar, async (c) => {
    const verValores = c.get("permissoes").includes("valores.ver");
    const dados = paraBanco(await lerCorpo(c, esquemaProdutoApi), verValores);
    try {
      if (dados.codigo !== "") {
        const { sql, valores } = montarInsert("produtos", dados);
        const [linha] = await banco.consultar(sql, valores);
        return c.json(saida(linha, verValores), 201);
      }
      // Código automático. Se alguém já digitou o próximo número à mão, tenta o seguinte.
      for (let tentativa = 0; tentativa < 20; tentativa++) {
        const { codigo: _vazio, ...semCodigo } = dados;
        const { sql, valores } = montarInsert("produtos", semCodigo, { codigo: `numero_com_zeros('PRD-', nextval('produto_codigo_seq'), 4)` });
        try {
          const [linha] = await banco.consultar(sql, valores);
          return c.json(saida(linha, verValores), 201);
        } catch (erro) {
          if (codigoPg(erro) !== "23505") throw erro;
        }
      }
      throw new ErroApi(409, "Não foi possível gerar o código. Informe um código.");
    } catch (erro) {
      if (erro instanceof ErroApi) throw erro;
      return mapearErro(erro);
    }
  });

  app.put("/produtos/:id", ...editar, async (c) => {
    const verValores = c.get("permissoes").includes("valores.ver");
    const atual = await buscar(c.req.param("id"));
    const dados = paraBanco(await lerCorpo(c, esquemaProdutoApi), verValores, atual);
    // O código vazio no cadastro existente mantém o atual.
    const { codigo, ...resto } = dados;
    const { sql, valores } = montarUpdate("produtos", String(atual.id), codigo === "" ? resto : dados);
    try {
      const [linha] = await banco.consultar(sql, valores);
      return c.json(saida(linha, verValores));
    } catch (erro) {
      return mapearErro(erro);
    }
  });

  app.patch("/produtos/:id/ativo", ...editar, async (c) => {
    const { ativo } = await lerCorpo(c, z.object({ ativo: z.boolean() }));
    const atual = await buscar(c.req.param("id"));
    const [linha] = await banco.consultar("update produtos set ativo = $1 where id = $2 returning *", [ativo, atual.id]);
    return c.json(saida(linha, c.get("permissoes").includes("valores.ver")));
  });

  app.delete("/produtos/:id", ...editar, async (c) => {
    const atual = await buscar(c.req.param("id"));
    try {
      await banco.consultar("delete from produtos where id = $1", [atual.id]);
    } catch (erro) {
      if (violaChaveEstrangeira(erro)) throw new ErroApi(409, "Este produto tem movimentações ou documentos ligados e não pode ser excluído. Inative o cadastro.");
      throw erro;
    }
    return c.body(null, 204);
  });
}
