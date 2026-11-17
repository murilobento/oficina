import { z } from "zod";


export type Veiculo = {
  id: string;
  /** O dono do carro (cadastro de Clientes). */
  clienteId: string;
  /** Sem hífen, maiúscula (ABC1D23). Vazio quando o carro ainda não tem placa à mão. */
  placa: string;
  /** Marca e modelo juntos, como o balcão fala: "Hyundai HB20 1.0". */
  modelo: string;
  ano: string;
  cor: string;
  /** Quilometragem mais recente que se sabe. Sobe sozinha quando um orçamento registra um km maior. */
  km: number;
  combustivel: string;
  cambio: string;
  /** Motorização, ex.: "1.0", "1.6 16V". */
  motor: string;
  observacoes: string;
  ativo: boolean;
  criadoEm: string;
};

export const COMBUSTIVEIS = [
  { valor: "flex", texto: "Flex" },
  { valor: "gasolina", texto: "Gasolina" },
  { valor: "etanol", texto: "Etanol" },
  { valor: "diesel", texto: "Diesel" },
  { valor: "gnv", texto: "GNV" },
  { valor: "hibrido", texto: "Híbrido" },
  { valor: "eletrico", texto: "Elétrico" },
];

export const CAMBIOS = [
  { valor: "manual", texto: "Manual" },
  { valor: "automatico", texto: "Automático" },
  { valor: "automatizado", texto: "Automatizado" },
  { valor: "cvt", texto: "CVT" },
];

export function rotuloCombustivel(valor: string): string {
  return COMBUSTIVEIS.find((item) => item.valor === valor)?.texto ?? valor;
}

export function rotuloCambio(valor: string): string {
  return CAMBIOS.find((item) => item.valor === valor)?.texto ?? valor;
}

/** ABC1D23 -> "ABC-1D23" (aceita placa antiga e Mercosul). */
export function mascararPlaca(valor: string): string {
  const limpo = limparPlaca(valor);
  return limpo.length > 3 ? `${limpo.slice(0, 3)}-${limpo.slice(3)}` : limpo;
}

export function limparPlaca(valor: string): string {
  return valor
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
}

const PLACA = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

/** "Hyundai HB20 1.0 · ABC-1D23": o carro numa linha, para listas e seletores. */
export function veiculoEmTexto(veiculo: Pick<Veiculo, "modelo" | "placa">): string {
  return [veiculo.modelo, veiculo.placa && mascararPlaca(veiculo.placa)].filter(Boolean).join(" · ");
}

/** Dados do formulário: o dono (`clienteId`) é escolhido na própria tela ou vem do orçamento. */
export const esquemaVeiculo = z.object({
  clienteId: z.string().min(1, "Escolha o cliente."),
  modelo: z.string().trim().min(1, "Informe a marca e o modelo.").max(100, "No máximo 100 caracteres."),
  placa: z.string().refine((valor) => valor === "" || PLACA.test(limparPlaca(valor)), "Placa inválida. Ex.: ABC-1D23."),
  ano: z.string().refine((valor) => valor === "" || /^(19|20)\d{2}$/.test(valor), "Ano com 4 números, como 2019."),
  cor: z.string().trim().max(30, "No máximo 30 caracteres."),
  km: z.string(),
  combustivel: z.string(),
  cambio: z.string(),
  motor: z.string().trim().max(30, "No máximo 30 caracteres."),
  observacoes: z.string().trim().max(500, "No máximo 500 caracteres."),
  ativo: z.boolean(),
});

export type VeiculoFormValores = z.infer<typeof esquemaVeiculo>;

export const FORM_VAZIO: VeiculoFormValores = {
  clienteId: "",
  modelo: "",
  placa: "",
  ano: "",
  cor: "",
  km: "",
  combustivel: "",
  cambio: "",
  motor: "",
  observacoes: "",
  ativo: true,
};

export function paraFormulario(veiculo: Veiculo): VeiculoFormValores {
  return {
    clienteId: veiculo.clienteId,
    modelo: veiculo.modelo,
    placa: mascararPlaca(veiculo.placa),
    ano: veiculo.ano,
    cor: veiculo.cor,
    km: veiculo.km > 0 ? String(veiculo.km) : "",
    combustivel: veiculo.combustivel,
    cambio: veiculo.cambio,
    motor: veiculo.motor,
    observacoes: veiculo.observacoes,
    ativo: veiculo.ativo,
  };
}

/** Dados do formulário prontos para gravar (sem id e data). */
export function paraVeiculo(valores: VeiculoFormValores): Omit<Veiculo, "id" | "criadoEm"> {
  return { ...valores, placa: limparPlaca(valores.placa), km: Number(valores.km || 0) };
}
