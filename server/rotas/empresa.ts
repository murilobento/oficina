import { z } from "zod";
import { auditar, diferencas } from "../auditoria";

import { limparCNPJ, soDigitos, validarCNPJ } from "../../src/features/pessoas/documento";

import { type Contexto, lerCorpo, montarUpdate, paraCamel } from "./util";

const ROTULOS_EMPRESA: Record<string, string> = {
  razaoSocial: "Razão social", nomeFantasia: "Nome fantasia", cnpj: "CNPJ", inscricaoEstadual: "Inscrição estadual",
  inscricaoMunicipal: "Inscrição municipal", cep: "CEP", logradouro: "Logradouro", numero: "Número", complemento: "Complemento",
  bairro: "Bairro", cidade: "Cidade", uf: "UF", whatsapp: "WhatsApp", email: "E-mail", site: "Site", instagram: "Instagram",
  horario: "Horário", validadeOrcamentoDias: "Validade do orçamento", condicoesOrcamento: "Condições do orçamento", rodape: "Rodapé", logo: "Logo",
};

const texto = (max: number) => z.string().trim().max(max, `No máximo ${max} caracteres.`);
const telefone = z.string().refine((v) => [0, 10, 11].includes(soDigitos(v).length), "Informe o telefone com DDD, por exemplo (11) 3333-4444.");

/** Corpo do PUT: os mesmos dados do formulário, já sem máscara. */
export const esquemaEmpresaApi = z
  .object({
    razaoSocial: texto(120),
    nomeFantasia: texto(80).min(1, "Informe o nome da oficina."),
    cnpj: z.string(),
    inscricaoEstadual: texto(20),
    inscricaoMunicipal: texto(20),
    cep: z.string().refine((v) => [0, 8].includes(soDigitos(v).length), "O CEP tem 8 números, por exemplo 01001-000."),
    logradouro: texto(120),
    numero: texto(20),
    complemento: texto(60),
    bairro: texto(60),
    cidade: texto(60),
    uf: z.string(),
    telefone,
    whatsapp: telefone,
    email: z.union([z.literal(""), z.email("Informe um e-mail válido, como contato@oficina.com.br.")]),
    site: texto(100),
    instagram: texto(50),
    horario: texto(200),
    validadeOrcamentoDias: z.number().int("Entre 1 e 90 dias.").min(1, "Entre 1 e 90 dias.").max(90, "Entre 1 e 90 dias."),
    condicoesOrcamento: texto(500),
    rodape: texto(200),
    logo: z.string().max(500_000, "A logo é grande demais. Use uma imagem menor (até 500 KB)."),
  })
  .superRefine((v, ctx) => {
    const cnpj = limparCNPJ(v.cnpj);
    if (cnpj !== "" && !validarCNPJ(cnpj)) ctx.addIssue({ code: "custom", path: ["cnpj"], message: "CNPJ inválido. Confira os números digitados ou deixe o campo em branco." });
  });

export function registrarRotasEmpresa({ app, banco, exigirSessao, exigirPermissao }: Contexto) {
  // Pública: a tela de entrada mostra o nome e a logo da oficina antes do login.
  app.get("/empresa", async (c) => {
    const [linha] = await banco.consultar("select * from empresa where id = 1");
    const { id: _id, ...dados } = paraCamel(linha);
    return c.json(dados);
  });

  app.put("/empresa", exigirSessao, exigirPermissao("empresa.gerenciar"), async (c) => {
    const dados = await lerCorpo(c, esquemaEmpresaApi);
    const novos = { ...dados, cnpj: limparCNPJ(dados.cnpj) };
    const { sql, valores } = montarUpdate("empresa", "1", novos);
    const linha = await banco.transacao(async (q) => {
      const [antes] = await q("select * from empresa where id = 1");
      const [depois] = await q(sql, valores);
      const anterior: Record<string, unknown> = antes ? paraCamel(antes) : {};
      const mudancas = diferencas(anterior, paraCamel(depois), ROTULOS_EMPRESA).map((m) =>
        m.campo === "Logo" ? { campo: "Logo", antes: anterior.logo ? "imagem anterior" : "sem logo", depois: novos.logo ? "imagem nova" : "sem logo" } : m,
      );
      if (mudancas.length > 0) {
        await auditar(q, c, {
          categoria: "acesso",
          acao: "empresa.alterada",
          descricao: `Alterou os dados da empresa: ${mudancas.map((m) => m.campo).join(", ")}.`,
          alvo: { tipo: "empresa", id: "1" },
          detalhes: { mudancas },
        });
      }
      return depois;
    });
    const { id: _id, ...saida } = paraCamel(linha);
    return c.json(saida);
  });
}
