import { z } from "zod";

import { limparDocumento, soDigitos, validarDocumento } from "../../src/features/pessoas/documento";

import { type Contexto, ErroApi, lerCorpo, montarInsert, montarUpdate, paraCamel, violaChaveEstrangeira } from "./util";

const texto = (max: number) => z.string().trim().max(max, `No máximo ${max} caracteres.`);
const telefone = z.string().refine((v) => [0, 10, 11].includes(soDigitos(v).length), "Informe o telefone com DDD, por exemplo (11) 3333-4444.");

/** Corpo do POST/PUT: os dados do formulário já sem máscara. */
export const esquemaPessoaApi = z
  .object({
    tipo: z.enum(["PF", "PJ"]),
    documento: z.string(),
    nome: z.string().trim().min(2, "Informe o nome.").max(150, "No máximo 150 caracteres."),
    nomeFantasia: texto(150),
    email: z.union([z.literal(""), z.email("Informe um e-mail válido, como nome@exemplo.com.br.")]),
    telefone,
    celular: telefone,
    cep: z.string().refine((v) => [0, 8].includes(soDigitos(v).length), "O CEP tem 8 números, por exemplo 01001-000."),
    logradouro: texto(150),
    numero: texto(20),
    complemento: texto(80),
    bairro: texto(80),
    cidade: texto(80),
    uf: z.string().max(2),
    observacoes: texto(1000),
    situacaoCadastral: texto(100),
    cnaePrincipal: texto(200),
    ativo: z.boolean(),
    extras: z.record(z.string(), z.string()),
  })
  .superRefine((v, ctx) => {
    const documento = limparDocumento(v.tipo, v.documento);
    if (documento === "" || validarDocumento(v.tipo, documento)) return;
    const nome = v.tipo === "PF" ? "CPF" : "CNPJ";
    ctx.addIssue({ code: "custom", path: ["documento"], message: `${nome} inválido. Confira os números digitados ou deixe o campo em branco.` });
  });

const PAPEIS = z.enum(["cliente", "fornecedor"]);

export function registrarRotasPessoas({ app, banco, exigirSessao, exigirPermissao }: Contexto) {
  const ver = [exigirSessao, exigirPermissao("clientes.ver")] as const;
  const editar = [exigirSessao, exigirPermissao("clientes.editar")] as const;

  const lerPapel = (valor: string | undefined) => {
    const papel = PAPEIS.safeParse(valor);
    if (!papel.success) throw new ErroApi(400, "Informe se é cliente ou fornecedor.");
    return papel.data;
  };

  async function buscar(id: string) {
    const [linha] = await banco.consultar("select * from pessoas where id = $1::uuid", [id]).catch(() => []);
    if (!linha) throw new ErroApi(404, "Cadastro não encontrado.");
    return linha;
  }

  /** Documento repetido dentro do mesmo papel (cliente ou fornecedor). */
  async function conferirDocumento(papel: string, documento: string, tipo: "PF" | "PJ", ignorarId?: string) {
    if (documento === "") return;
    const [outra] = await banco.consultar<{ nome: string }>(
      `select nome from pessoas where papel = $1 and documento = $2 and ($3::uuid is null or id <> $3::uuid) limit 1`,
      [papel, documento, ignorarId ?? null],
    );
    if (outra) {
      const rotulo = tipo === "PF" ? "CPF" : "CNPJ";
      const mensagem = `Este ${rotulo} já está no cadastro de ${outra.nome}.`;
      throw new ErroApi(409, mensagem, { documento: mensagem });
    }
  }

  const paraBanco = (dados: z.infer<typeof esquemaPessoaApi>) => ({
    ...dados,
    documento: limparDocumento(dados.tipo, dados.documento),
    email: dados.email.toLowerCase(),
    extras: JSON.stringify(dados.extras),
    // Situação cadastral e CNAE só existem para empresa.
    situacaoCadastral: dados.tipo === "PF" ? "" : dados.situacaoCadastral,
    cnaePrincipal: dados.tipo === "PF" ? "" : dados.cnaePrincipal,
  });

  app.get("/pessoas", ...ver, async (c) => {
    const papel = lerPapel(c.req.query("papel"));
    const linhas = await banco.consultar("select * from pessoas where papel = $1 order by lower(nome)", [papel]);
    return c.json(linhas.map(paraCamel));
  });

  app.get("/pessoas/:id", ...ver, async (c) => c.json(paraCamel(await buscar(c.req.param("id")))));

  app.post("/pessoas", ...editar, async (c) => {
    const papel = lerPapel(c.req.query("papel"));
    const dados = paraBanco(await lerCorpo(c, esquemaPessoaApi));
    await conferirDocumento(papel, dados.documento, dados.tipo);
    const { sql, valores } = montarInsert("pessoas", { papel, ...dados });
    const [linha] = await banco.consultar(sql, valores);
    return c.json(paraCamel(linha), 201);
  });

  app.put("/pessoas/:id", ...editar, async (c) => {
    const atual = await buscar(c.req.param("id"));
    const dados = paraBanco(await lerCorpo(c, esquemaPessoaApi));
    await conferirDocumento(String(atual.papel), dados.documento, dados.tipo, String(atual.id));
    const { sql, valores } = montarUpdate("pessoas", String(atual.id), dados);
    const [linha] = await banco.consultar(sql, valores);
    return c.json(paraCamel(linha));
  });

  app.patch("/pessoas/:id/ativo", ...editar, async (c) => {
    const { ativo } = await lerCorpo(c, z.object({ ativo: z.boolean() }));
    const atual = await buscar(c.req.param("id"));
    const [linha] = await banco.consultar("update pessoas set ativo = $1 where id = $2 returning *", [ativo, atual.id]);
    return c.json(paraCamel(linha));
  });

  app.delete("/pessoas/:id", ...editar, async (c) => {
    const atual = await buscar(c.req.param("id"));
    const [veiculo] = await banco.consultar("select 1 from veiculos where cliente_id = $1 limit 1", [atual.id]);
    if (veiculo) throw new ErroApi(409, "Este cliente tem veículos cadastrados e não pode ser excluído. Inative o cadastro.");
    try {
      await banco.consultar("delete from pessoas where id = $1", [atual.id]);
    } catch (erro) {
      if (violaChaveEstrangeira(erro)) throw new ErroApi(409, "Este cadastro tem orçamentos, vendas ou compras ligados e não pode ser excluído. Inative o cadastro.");
      throw erro;
    }
    return c.body(null, 204);
  });
}
