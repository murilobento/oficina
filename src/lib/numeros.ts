// Dinheiro e quantidades dos cadastros. Dinheiro é guardado em CENTAVOS (número inteiro),
// para não haver erro de arredondamento; nos formulários é texto com máscara ("1.234,56").

/** Mantém só os dígitos e formata como moeda sem símbolo: "123456" -> "1.234,56". Vazio fica vazio. */
export function mascararMoeda(valor: string): string {
  const digitos = valor.replace(/\D/g, "").replace(/^0+/, "");
  if (digitos === "") return "";
  return centavosParaTexto(Number(digitos));
}

/** "1.234,56" -> 123456. Texto vazio ou inválido vale 0. */
export function textoParaCentavos(texto: string): number {
  const digitos = texto.replace(/\D/g, "");
  return digitos === "" ? 0 : Number(digitos);
}

/** 123456 -> "1.234,56". Zero vira texto vazio (campo sem valor). */
export function centavosParaTexto(centavos: number): string {
  if (centavos === 0) return "";
  const reais = Math.floor(centavos / 100);
  const resto = String(centavos % 100).padStart(2, "0");
  return `${reais.toLocaleString("pt-BR")},${resto}`;
}

/** 123456 -> "R$ 1.234,56". */
export function formatarBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Aceita só números e uma vírgula, com até 3 casas: "1,2345" -> "1,234". */
export function mascararQuantidade(valor: string): string {
  const limpo = valor.replace(/[^\d,]/g, "");
  const [inteiro, ...resto] = limpo.split(",");
  if (resto.length === 0) return inteiro;
  return `${inteiro},${resto.join("").slice(0, 3)}`;
}

/** "1,5" -> 1.5. Texto vazio vale 0; texto inválido vira NaN. */
export function textoParaNumero(texto: string): number {
  if (texto.trim() === "") return 0;
  return Number(texto.replace(",", "."));
}

/** 1.5 -> "1,5"; 12 -> "12". Zero vira texto vazio. */
export function numeroParaTexto(numero: number): string {
  return numero === 0 ? "" : String(numero).replace(".", ",");
}

/** Para mostrar: 1234.5 -> "1.234,5". */
export function formatarQuantidade(numero: number): string {
  return numero.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

/** Margem sobre o custo, em %: custo 100, venda 145 -> 45. Sem custo ou sem venda: null. */
export function margemSobreCusto(custo: number, venda: number): number | null {
  if (custo <= 0 || venda <= 0) return null;
  return Math.round(((venda - custo) / custo) * 100);
}

/** Próximo código sequencial: ("PRD", ["PRD-0007", "X"]) -> "PRD-0008". */
export function proximoCodigo(prefixo: string, existentes: string[], digitos = 4): string {
  const maior = existentes.reduce((acc, codigo) => {
    const achado = new RegExp(`^${prefixo}-(\\d+)$`, "i").exec(codigo.trim());
    return achado ? Math.max(acc, Number(achado[1])) : acc;
  }, 0);
  return `${prefixo}-${String(maior + 1).padStart(digitos, "0")}`;
}
