/** Normaliza a placa: Mercosul (ABC1D23) ou modelo antigo (ABC-1234); outro formato volta só em maiúsculas. */
export function formatarPlaca(bruta: string): string {
  const limpa = bruta.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(limpa)) return limpa;
  if (/^[A-Z]{3}\d{4}$/.test(limpa)) return `${limpa.slice(0, 3)}-${limpa.slice(3)}`;
  return limpa;
}
