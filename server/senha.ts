import { randomInt } from "node:crypto";

// Sem caracteres que se confundem ao ditar ou copiar: 0/O, 1/l/I.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#@%&";

/** Senha provisória aleatória (14 caracteres) para repassar ao funcionário. */
export function gerarSenhaProvisoria(tamanho = 14): string {
  return Array.from({ length: tamanho }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}
