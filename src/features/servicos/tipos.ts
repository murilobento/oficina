import { z } from "zod";

import {
  centavosParaTexto,
  formatarQuantidade,
  numeroParaTexto,
  textoParaCentavos,
  textoParaNumero,
} from "@/lib/numeros";

export type Servico = {
  id: string;
  /** Código interno da oficina (ex.: SRV-001). */
  codigo: string;
  descricao: string;
  categoria: string;
  /** Valor padrão da mão de obra, em centavos. Pode ser ajustado em cada orçamento. */
  valor: number;
  /** Tempo estimado de execução, em horas (1,5 = uma hora e meia). */
  tempoHoras: number;
  /** Garantia em dias (0 = sem garantia). */
  garantiaDias: number;
  /** Garantia em km (0 = sem limite de km). */
  garantiaKm: number;
  observacoes: string;
  ativo: boolean;
  criadoEm: string;
};

export const CATEGORIAS_SERVICO = [
  { valor: "revisao", texto: "Revisão e manutenção" },
  { valor: "motor", texto: "Motor" },
  { valor: "freios", texto: "Freios" },
  { valor: "suspensao", texto: "Suspensão e direção" },
  { valor: "eletrica", texto: "Elétrica e injeção" },
  { valor: "arcondicionado", texto: "Ar-condicionado" },
  { valor: "alinhamento", texto: "Alinhamento e balanceamento" },
  { valor: "transmissao", texto: "Câmbio e embreagem" },
  { valor: "diagnostico", texto: "Diagnóstico e scanner" },
  { valor: "outros", texto: "Outros" },
];

export function rotuloCategoriaServico(categoria: string): string {
  return CATEGORIAS_SERVICO.find((item) => item.valor === categoria)?.texto ?? categoria;
}

/** 1.5 -> "1,5 h"; 0 -> "". */
export function formatarTempo(horas: number): string {
  return horas > 0 ? `${formatarQuantidade(horas)} h` : "";
}

/** "90 dias · 3.000 km"; sem garantia vira "". */
export function formatarGarantia(servico: Pick<Servico, "garantiaDias" | "garantiaKm">): string {
  return [
    servico.garantiaDias > 0 ? `${formatarQuantidade(servico.garantiaDias)} dias` : "",
    servico.garantiaKm > 0 ? `${formatarQuantidade(servico.garantiaKm)} km` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

const inteiroOpcional = z
  .string()
  .refine((valor) => valor === "" || (/^\d+$/.test(valor) && Number(valor) <= 1_000_000), "Informe só números inteiros.");

export const esquemaServico = z.object({
  codigo: z.string().trim().max(20, "No máximo 20 caracteres."),
  descricao: z.string().trim().min(1, "Informe a descrição do serviço.").max(120, "No máximo 120 caracteres."),
  categoria: z.string().min(1, "Escolha a categoria."),
  valor: z.string(),
  tempoHoras: z
    .string()
    .refine((valor) => !Number.isNaN(textoParaNumero(valor)) && textoParaNumero(valor) <= 99, "Informe as horas, como 1,5."),
  garantiaDias: inteiroOpcional,
  garantiaKm: inteiroOpcional,
  observacoes: z.string().trim().max(500, "No máximo 500 caracteres."),
  ativo: z.boolean(),
});

export type ServicoFormValores = z.infer<typeof esquemaServico>;

export const FORM_VAZIO: ServicoFormValores = {
  codigo: "",
  descricao: "",
  categoria: "",
  valor: "",
  tempoHoras: "",
  garantiaDias: "",
  garantiaKm: "",
  observacoes: "",
  ativo: true,
};

export function paraFormulario(servico: Servico): ServicoFormValores {
  return {
    codigo: servico.codigo,
    descricao: servico.descricao,
    categoria: servico.categoria,
    valor: centavosParaTexto(servico.valor),
    tempoHoras: numeroParaTexto(servico.tempoHoras),
    garantiaDias: numeroParaTexto(servico.garantiaDias),
    garantiaKm: numeroParaTexto(servico.garantiaKm),
    observacoes: servico.observacoes,
    ativo: servico.ativo,
  };
}

/** Dados do formulário prontos para gravar (sem id e data). O código vazio é preenchido por quem chama. */
export function paraServico(valores: ServicoFormValores): Omit<Servico, "id" | "criadoEm"> {
  return {
    ...valores,
    codigo: valores.codigo.trim(),
    valor: textoParaCentavos(valores.valor),
    tempoHoras: textoParaNumero(valores.tempoHoras),
    garantiaDias: Number(valores.garantiaDias || 0),
    garantiaKm: Number(valores.garantiaKm || 0),
  };
}
