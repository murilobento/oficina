import { z } from "zod";
import { auditar } from "../auditoria";

import { codigoPg, type Contexto, ErroApi, lerCorpo, montarInsert, montarUpdate, paraCamel, violaChaveEstrangeira } from "./util";

const texto = (max: number) => z.string().trim().max(max, `No máximo ${max} caracteres.`);

/** Placa sem hífen nem espaço, em maiúsculas ("abc-1234" → "ABC1234"). */
export const normalizarPlaca = (placa: string) => placa.toUpperCase().replace(/[^A-Z0-9]/g, "");

export const esquemaVeiculoApi = z.object({
  clienteId: z.uuid("Escolha o cliente."),
  placa: z.string().transform(normalizarPlaca).refine((v) => v === "" || v.length === 7, "A placa tem 7 letras e números, por exemplo ABC1D23."),
  modelo: texto(100).min(1, "Informe o modelo."),
  ano: texto(9),
  cor: texto(30),
  km: z.number().int("Informe km inteiros.").min(0, "A quilometragem não pode ser negativa.").max(9_999_999, "Quilometragem alta demais."),
  combustivel: texto(20),
  cambio: texto(20),
  motor: texto(30),
  observacoes: texto(1000),
  ativo: z.boolean(),
});

export function registrarRotasVeiculos({ app, banco, exigirSessao, exigirPermissao }: Contexto) {
  const ver = [exigirSessao, exigirPermissao("veiculos.ver")] as const;
  const editar = [exigirSessao, exigirPermissao("veiculos.editar")] as const;

  async function buscar(id: string) {
    const [linha] = await banco.consultar("select * from veiculos where id = $1::uuid", [id]).catch(() => []);
    if (!linha) throw new ErroApi(404, "Veículo não encontrado.");
    return linha;
  }

  /** O dono do veículo precisa ser um cliente (não um fornecedor). */
  async function conferirCliente(clienteId: string) {
    const [cliente] = await banco.consultar("select 1 from pessoas where id = $1::uuid and papel = 'cliente'", [clienteId]);
    if (!cliente) throw new ErroApi(400, "Cliente não encontrado.", { clienteId: "Cliente não encontrado." });
  }

  function mapearErro(erro: unknown): never {
    if (codigoPg(erro) === "23505") throw new ErroApi(409, "Já existe um veículo com esta placa.", { placa: "Já existe um veículo com esta placa." });
    if (violaChaveEstrangeira(erro)) throw new ErroApi(400, "Cliente não encontrado.", { clienteId: "Cliente não encontrado." });
    throw erro;
  }

  app.get("/veiculos", ...ver, async (c) => {
    const clienteId = c.req.query("clienteId");
    const linhas = clienteId
      ? await banco.consultar("select * from veiculos where cliente_id = $1::uuid order by lower(modelo)", [clienteId]).catch(() => [])
      : await banco.consultar("select * from veiculos order by lower(modelo)");
    return c.json(linhas.map(paraCamel));
  });

  app.get("/veiculos/:id", ...ver, async (c) => c.json(paraCamel(await buscar(c.req.param("id")))));

  app.post("/veiculos", ...editar, async (c) => {
    const dados = await lerCorpo(c, esquemaVeiculoApi);
    await conferirCliente(dados.clienteId);
    try {
      const { sql, valores } = montarInsert("veiculos", dados);
      const [linha] = await banco.consultar(sql, valores);
      return c.json(paraCamel(linha), 201);
    } catch (erro) {
      return mapearErro(erro);
    }
  });

  app.put("/veiculos/:id", ...editar, async (c) => {
    const atual = await buscar(c.req.param("id"));
    const dados = await lerCorpo(c, esquemaVeiculoApi);
    await conferirCliente(dados.clienteId);
    try {
      const { sql, valores } = montarUpdate("veiculos", String(atual.id), dados);
      const [linha] = await banco.consultar(sql, valores);
      return c.json(paraCamel(linha));
    } catch (erro) {
      return mapearErro(erro);
    }
  });

  app.patch("/veiculos/:id/ativo", ...editar, async (c) => {
    const { ativo } = await lerCorpo(c, z.object({ ativo: z.boolean() }));
    const atual = await buscar(c.req.param("id"));
    const [linha] = await banco.consultar("update veiculos set ativo = $1 where id = $2 returning *", [ativo, atual.id]);
    return c.json(paraCamel(linha));
  });

  app.delete("/veiculos/:id", ...editar, async (c) => {
    const atual = await buscar(c.req.param("id"));
    try {
      await banco.transacao(async (q) => {
        await q("delete from veiculos where id = $1", [atual.id]);
        await auditar(q, c, {
          categoria: "cadastros",
          acao: "veiculo.excluido",
          descricao: `Excluiu o veículo ${String(atual.modelo ?? "")}${atual.placa ? ` (${String(atual.placa)})` : ""}.`,
          alvo: { tipo: "veiculo", id: String(atual.id) },
        });
      });
    } catch (erro) {
      if (violaChaveEstrangeira(erro)) throw new ErroApi(409, "Este veículo tem orçamentos ou vendas ligados e não pode ser excluído. Inative o cadastro.");
      throw erro;
    }
    return c.body(null, 204);
  });
}
