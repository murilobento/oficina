import { z } from "zod";

import { limparCNPJ, mascararCEP, mascararCNPJ, mascararTelefone, soDigitos, validarCNPJ } from "@/features/pessoas/documento";
import { numeroParaTexto, textoParaNumero } from "@/lib/numeros";

/** Dados da oficina, usados no menu, na tela de entrada e no cabeçalho dos documentos impressos. */
export type Empresa = {
  razaoSocial: string;
  /** O nome que as pessoas conhecem: aparece no menu e nos documentos. */
  nomeFantasia: string;
  /** Sem máscara (14 caracteres; pode ter letras no CNPJ alfanumérico). */
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  /** Só dígitos (8). */
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  /** Só dígitos. */
  telefone: string;
  whatsapp: string;
  email: string;
  site: string;
  instagram: string;
  horario: string;
  /** Validade que todo orçamento novo já vem preenchido. */
  validadeOrcamentoDias: number;
  /** Texto que todo orçamento novo já traz nas observações (formas de pagamento, prazo...). */
  condicoesOrcamento: string;
  /** Linha no fim dos documentos impressos. */
  rodape: string;
  /** Imagem em data URL (PNG, JPG ou SVG); "" = sem logo. */
  logo: string;
};

export const EMPRESA_PADRAO: Empresa = {
  razaoSocial: "",
  nomeFantasia: "Nome da oficina",
  cnpj: "",
  inscricaoEstadual: "",
  inscricaoMunicipal: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  telefone: "",
  whatsapp: "",
  email: "",
  site: "",
  instagram: "",
  horario: "",
  validadeOrcamentoDias: 7,
  condicoesOrcamento: "",
  rodape: "",
  logo: "",
};

const telefoneOpcional = z.string().refine((valor) => [0, 10, 11].includes(soDigitos(valor).length), {
  message: "Informe o telefone com DDD, por exemplo (11) 3333-4444.",
});

// No formulário os valores ficam com máscara; `paraEmpresa` tira a máscara ao salvar.
export const esquemaEmpresa = z
  .object({
    razaoSocial: z.string().trim().max(120, "No máximo 120 caracteres."),
    nomeFantasia: z.string().trim().min(1, "Informe o nome da oficina.").max(80, "No máximo 80 caracteres."),
    cnpj: z.string(),
    inscricaoEstadual: z.string().trim().max(20, "No máximo 20 caracteres."),
    inscricaoMunicipal: z.string().trim().max(20, "No máximo 20 caracteres."),
    cep: z.string().refine((valor) => [0, 8].includes(soDigitos(valor).length), {
      message: "O CEP tem 8 números, por exemplo 01001-000.",
    }),
    logradouro: z.string().trim().max(120, "No máximo 120 caracteres."),
    numero: z.string().trim().max(20, "No máximo 20 caracteres."),
    complemento: z.string().trim().max(60, "No máximo 60 caracteres."),
    bairro: z.string().trim().max(60, "No máximo 60 caracteres."),
    cidade: z.string().trim().max(60, "No máximo 60 caracteres."),
    uf: z.string(),
    telefone: telefoneOpcional,
    whatsapp: telefoneOpcional,
    email: z.union([z.literal(""), z.email({ message: "Informe um e-mail válido, como contato@oficina.com.br." })]),
    site: z.string().trim().max(100, "No máximo 100 caracteres."),
    instagram: z.string().trim().max(50, "No máximo 50 caracteres."),
    horario: z.string().trim().max(200, "No máximo 200 caracteres."),
    validadeOrcamentoDias: z
      .string()
      .refine((valor) => /^\d+$/.test(valor) && Number(valor) >= 1 && Number(valor) <= 90, "Entre 1 e 90 dias."),
    condicoesOrcamento: z.string().trim().max(500, "No máximo 500 caracteres."),
    rodape: z.string().trim().max(200, "No máximo 200 caracteres."),
    logo: z.string(),
  })
  .superRefine((valores, contexto) => {
    // O CNPJ não é obrigatório; se foi preenchido, precisa ser válido.
    const cnpj = limparCNPJ(valores.cnpj);
    if (cnpj === "" || validarCNPJ(cnpj)) return;
    contexto.addIssue({
      code: "custom",
      path: ["cnpj"],
      message:
        cnpj.length < 14
          ? `CNPJ incompleto: faltam ${14 - cnpj.length} de 14 caracteres.`
          : "CNPJ inválido. Confira os números digitados ou deixe o campo em branco.",
    });
  });

export type EmpresaFormValores = z.infer<typeof esquemaEmpresa>;

export function paraFormulario(empresa: Empresa): EmpresaFormValores {
  return {
    ...empresa,
    cnpj: mascararCNPJ(empresa.cnpj),
    cep: mascararCEP(empresa.cep),
    telefone: mascararTelefone(empresa.telefone),
    whatsapp: mascararTelefone(empresa.whatsapp),
    validadeOrcamentoDias: numeroParaTexto(empresa.validadeOrcamentoDias),
  };
}

/** Dados prontos para salvar (sem máscara). */
export function paraEmpresa(valores: EmpresaFormValores): Empresa {
  return {
    ...valores,
    cnpj: limparCNPJ(valores.cnpj),
    cep: soDigitos(valores.cep),
    telefone: soDigitos(valores.telefone),
    whatsapp: soDigitos(valores.whatsapp),
    email: valores.email.toLowerCase(),
    validadeOrcamentoDias: textoParaNumero(valores.validadeOrcamentoDias),
  };
}

const LIGACOES = ["de", "da", "do", "das", "dos", "e"];

/** Iniciais para quando não há logo: "Auto Center Silva" -> "AS"; uma palavra só usa as duas primeiras letras. */
export function siglaEmpresa(nomeFantasia: string): string {
  const palavras = nomeFantasia
    .trim()
    .split(/\s+/)
    .filter((palavra) => palavra !== "" && !LIGACOES.includes(palavra.toLowerCase()));
  if (palavras.length === 0) return "OF";
  if (palavras.length === 1) return palavras[0].slice(0, 2).toUpperCase();
  return (palavras[0][0] + palavras[palavras.length - 1][0]).toUpperCase();
}

/** "Rua X, 10, sala 2 · Centro · São Paulo/SP · CEP 01001-000", só com as partes preenchidas. */
export function enderecoEmLinha(empresa: Empresa): string {
  const rua = [empresa.logradouro, empresa.numero, empresa.complemento].filter(Boolean).join(", ");
  const cidade = [empresa.cidade, empresa.uf].filter(Boolean).join("/");
  return [rua, empresa.bairro, cidade, empresa.cep && `CEP ${mascararCEP(empresa.cep)}`].filter(Boolean).join(" · ");
}

/** Telefone, WhatsApp, e-mail, site e Instagram numa lista curta, para o cabeçalho dos documentos. */
export function contatosEmLista(empresa: Empresa): string[] {
  return [
    empresa.telefone && `Tel. ${mascararTelefone(empresa.telefone)}`,
    empresa.whatsapp && `WhatsApp ${mascararTelefone(empresa.whatsapp)}`,
    empresa.email,
    empresa.site,
    empresa.instagram,
  ].filter(Boolean);
}
