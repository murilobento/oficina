// CPF, CNPJ, CEP e telefone: limpeza, máscara e validação. Tudo aqui trata os valores como
// texto (string), nunca como número, porque o CNPJ passa a aceitar letras (CNPJ alfanumérico
// da Receita Federal, com vigência a partir de julho de 2026).

export type TipoPessoa = "PF" | "PJ";

/** Só os dígitos de um texto. */
export function soDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** CPF sem máscara: até 11 dígitos. */
export function limparCPF(valor: string): string {
  return soDigitos(valor).slice(0, 11);
}

/** CNPJ sem máscara: até 14 caracteres, letras em maiúsculas (formato alfanumérico). */
export function limparCNPJ(valor: string): string {
  return valor
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 14);
}

export function limparDocumento(tipo: TipoPessoa, valor: string): string {
  return tipo === "PF" ? limparCPF(valor) : limparCNPJ(valor);
}

/** Dígito verificador pelo módulo 11: resto menor que 2 vira 0; senão, 11 menos o resto. */
function digitoModulo11(soma: number): number {
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Valida CPF com ou sem máscara: 11 dígitos, não repetidos, e os dois dígitos verificadores. */
export function validarCPF(valor: string): boolean {
  const cpf = soDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  for (const posicao of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < posicao; i++) soma += Number(cpf[i]) * (posicao + 1 - i);
    if (digitoModulo11(soma) !== Number(cpf[posicao])) return false;
  }
  return true;
}

const PESOS_CNPJ = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Valida CNPJ com ou sem máscara, no formato numérico e no alfanumérico.
 *
 * Regra da Receita para o alfanumérico: as 12 primeiras posições aceitam letras e números,
 * as 2 últimas (dígitos verificadores) continuam numéricas. No cálculo, cada caractere vale
 * o seu código ASCII menos 48 ("0" = 0 ... "9" = 9, "A" = 17 ... "Z" = 42). Para CNPJ só
 * com números o resultado é idêntico ao cálculo antigo.
 */
export function validarCNPJ(valor: string): boolean {
  const cnpj = valor.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;

  const valores = Array.from(cnpj, (caractere) => caractere.charCodeAt(0) - 48);
  for (const posicao of [12, 13]) {
    const pesos = PESOS_CNPJ.slice(13 - posicao);
    let soma = 0;
    for (let i = 0; i < posicao; i++) soma += valores[i] * pesos[i];
    if (digitoModulo11(soma) !== valores[posicao]) return false;
  }
  return true;
}

export function validarDocumento(tipo: TipoPessoa, valor: string): boolean {
  return tipo === "PF" ? validarCPF(valor) : validarCNPJ(valor);
}

/** Aplica um molde como "###.###.###-##" aos caracteres já limpos (serve para valor parcial). */
function aplicarMolde(limpo: string, molde: string): string {
  let saida = "";
  let i = 0;
  for (const simbolo of molde) {
    if (i >= limpo.length) break;
    saida += simbolo === "#" ? limpo[i++] : simbolo;
  }
  return saida;
}

export function mascararCPF(valor: string): string {
  return aplicarMolde(limparCPF(valor), "###.###.###-##");
}

export function mascararCNPJ(valor: string): string {
  return aplicarMolde(limparCNPJ(valor), "##.###.###/####-##");
}

export function mascararDocumento(tipo: TipoPessoa, valor: string): string {
  return tipo === "PF" ? mascararCPF(valor) : mascararCNPJ(valor);
}

export function mascararCEP(valor: string): string {
  return aplicarMolde(soDigitos(valor).slice(0, 8), "#####-###");
}

/** Telefone fixo (10 dígitos) ou celular (11 dígitos), com DDD. */
export function mascararTelefone(valor: string): string {
  const digitos = soDigitos(valor).slice(0, 11);
  return aplicarMolde(digitos, digitos.length > 10 ? "(##) #####-####" : "(##) ####-####");
}
