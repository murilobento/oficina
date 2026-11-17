import { z } from "zod";

import {
  centavosParaTexto,
  numeroParaTexto,
  textoParaCentavos,
  textoParaNumero,
} from "@/lib/numeros";

import { calcularTotais, type TipoDesconto, type TipoItem, validoAte } from "./calculo";

export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "recusado" | "convertido";
/** Status mostrado na tela: "vencido" não é gravado, é calculado pela validade. */
export type StatusExibido = StatusOrcamento | "vencido";

export type ItemOrcamento = {
  id: string;
  tipo: TipoItem;
  /** Produto ou serviço de origem no cadastro; vazio no item avulso. */
  origemId: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  /** Valor unitário em centavos. */
  valor: number;
};

export type VeiculoOrcamento = {
  /** Sem hífen, maiúscula (ABC1D23). */
  placa: string;
  modelo: string;
  ano: string;
  cor: string;
  km: number;
};

export type Orcamento = {
  id: string;
  /** ORC-0001 */
  numero: string;
  clienteId: string;
  veiculo: VeiculoOrcamento;
  /** O que o cliente relatou (barulho, luz acesa...). */
  problema: string;
  itens: ItemOrcamento[];
  descontoTipo: TipoDesconto;
  /** Centavos se `descontoTipo` = "valor"; percentual (0 a 100) se "percentual". */
  desconto: number;
  validadeDias: number;
  /** Texto que vai impresso para o cliente (condições, prazo). */
  observacoes: string;
  status: StatusOrcamento;
  criadoEm: string;
};

export const ROTULO_STATUS: Record<StatusExibido, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  convertido: "Virou OS",
  vencido: "Vencido",
};

/** Rascunho ou enviado fora da validade aparece como vencido. */
export function statusExibido(orcamento: Pick<Orcamento, "status" | "criadoEm" | "validadeDias">, agora = new Date()): StatusExibido {
  const aberto = orcamento.status === "rascunho" || orcamento.status === "enviado";
  return aberto && agora > validoAte(orcamento.criadoEm, orcamento.validadeDias) ? "vencido" : orcamento.status;
}

/** Só rascunho e enviado podem mudar: depois de aprovado, os valores estão combinados com o cliente. */
export function podeEditar(orcamento: Pick<Orcamento, "status">): boolean {
  return orcamento.status === "rascunho" || orcamento.status === "enviado";
}

export function totaisDoOrcamento(orcamento: Pick<Orcamento, "itens" | "descontoTipo" | "desconto">) {
  return calcularTotais(orcamento.itens, orcamento.descontoTipo, orcamento.desconto);
}

/** ABC1D23 -> "ABC-1D23" (aceita placa antiga e Mercosul). */
export function mascararPlaca(valor: string): string {
  const limpo = valor.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  return limpo.length > 3 ? `${limpo.slice(0, 3)}-${limpo.slice(3)}` : limpo;
}

export function limparPlaca(valor: string): string {
  return valor.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const PLACA = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

const esquemaItem = z.object({
  id: z.string(),
  tipo: z.enum(["produto", "servico"]),
  origemId: z.string(),
  descricao: z.string().trim().min(1, "Informe a descrição.").max(120, "No máximo 120 caracteres."),
  unidade: z.string().trim().max(5),
  quantidade: z
    .string()
    .refine((valor) => textoParaNumero(valor) > 0, "A quantidade precisa ser maior que zero."),
  valor: z.string(),
});

export const esquemaOrcamento = z
  .object({
    clienteId: z.string().min(1, "Escolha o cliente."),
    placa: z.string().refine((valor) => valor === "" || PLACA.test(limparPlaca(valor)), "Placa inválida. Ex.: ABC-1D23."),
    modelo: z.string().trim().min(1, "Informe a marca e o modelo.").max(60, "No máximo 60 caracteres."),
    ano: z.string().refine((valor) => valor === "" || /^(19|20)\d{2}$/.test(valor), "Ano com 4 números, como 2019."),
    cor: z.string().trim().max(30, "No máximo 30 caracteres."),
    km: z.string(),
    problema: z.string().trim().max(500, "No máximo 500 caracteres."),
    itens: z.array(esquemaItem).min(1, "Adicione ao menos um produto ou serviço."),
    descontoTipo: z.enum(["valor", "percentual"]),
    desconto: z.string(),
    validadeDias: z
      .string()
      .refine((valor) => /^\d+$/.test(valor) && Number(valor) >= 1 && Number(valor) <= 90, "Entre 1 e 90 dias."),
    observacoes: z.string().trim().max(500, "No máximo 500 caracteres."),
  })
  .superRefine((valores, contexto) => {
    if (valores.descontoTipo === "percentual") {
      if (textoParaNumero(valores.desconto) > 100) {
        contexto.addIssue({ code: "custom", path: ["desconto"], message: "O desconto não pode passar de 100%." });
      }
      return;
    }
    const subtotal = valores.itens.reduce(
      (soma, item) => soma + Math.round(textoParaNumero(item.quantidade) * textoParaCentavos(item.valor)),
      0,
    );
    if (textoParaCentavos(valores.desconto) > subtotal) {
      contexto.addIssue({ code: "custom", path: ["desconto"], message: "O desconto não pode ser maior que o total dos itens." });
    }
  });

export type OrcamentoFormValores = z.infer<typeof esquemaOrcamento>;
export type ItemFormValores = OrcamentoFormValores["itens"][number];

export const FORM_VAZIO: OrcamentoFormValores = {
  clienteId: "",
  placa: "",
  modelo: "",
  ano: "",
  cor: "",
  km: "",
  problema: "",
  itens: [],
  descontoTipo: "percentual",
  desconto: "",
  validadeDias: "7",
  observacoes: "",
};

export function paraFormulario(orcamento: Orcamento): OrcamentoFormValores {
  return {
    clienteId: orcamento.clienteId,
    placa: mascararPlaca(orcamento.veiculo.placa),
    modelo: orcamento.veiculo.modelo,
    ano: orcamento.veiculo.ano,
    cor: orcamento.veiculo.cor,
    km: orcamento.veiculo.km > 0 ? String(orcamento.veiculo.km) : "",
    problema: orcamento.problema,
    itens: orcamento.itens.map((item) => ({
      id: item.id,
      tipo: item.tipo,
      origemId: item.origemId,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: numeroParaTexto(item.quantidade),
      valor: centavosParaTexto(item.valor),
    })),
    descontoTipo: orcamento.descontoTipo,
    desconto:
      orcamento.descontoTipo === "valor" ? centavosParaTexto(orcamento.desconto) : numeroParaTexto(orcamento.desconto),
    validadeDias: String(orcamento.validadeDias),
    observacoes: orcamento.observacoes,
  };
}

/** Dados do formulário prontos para gravar (sem id, número, status e data). */
export function paraOrcamento(valores: OrcamentoFormValores) {
  return {
    clienteId: valores.clienteId,
    veiculo: {
      placa: limparPlaca(valores.placa),
      modelo: valores.modelo,
      ano: valores.ano,
      cor: valores.cor,
      km: Number(valores.km || 0),
    },
    problema: valores.problema,
    itens: valores.itens.map(
      (item): ItemOrcamento => ({
        id: item.id,
        tipo: item.tipo,
        origemId: item.origemId,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: textoParaNumero(item.quantidade),
        valor: textoParaCentavos(item.valor),
      }),
    ),
    descontoTipo: valores.descontoTipo,
    desconto: valores.descontoTipo === "valor" ? textoParaCentavos(valores.desconto) : textoParaNumero(valores.desconto),
    validadeDias: Number(valores.validadeDias),
    observacoes: valores.observacoes,
  };
}
