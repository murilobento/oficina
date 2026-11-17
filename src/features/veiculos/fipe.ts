import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type ItemFipe = { codigo: string; nome: string };

const ANO_MAIS_ANTIGO = 1970;

/** Anos para escolher: do ano que vem (modelo novo já à venda) até 1970. */
export function anosModelo(anoAtual = new Date().getFullYear()): string[] {
  const anos: string[] = [];
  for (let ano = anoAtual + 1; ano >= ANO_MAIS_ANTIGO; ano--) anos.push(String(ano));
  return anos;
}

/** "Gol 1.6 16V Total Flex" → "1.6 16V". Vazio quando o nome não traz a motorização. */
export function motorDoModelo(nome: string): string {
  const achado = /\b(\d\.\d)(?:\s*(\d{1,2}V|TB|Turbo))?/i.exec(nome);
  return achado ? [achado[1], achado[2]?.toUpperCase()].filter(Boolean).join(" ") : "";
}

/** Valor da lista de combustíveis do cadastro, quando o nome do modelo diz qual é. */
export function combustivelDoModelo(nome: string): string {
  if (/flex/i.test(nome)) return "flex";
  if (/diesel/i.test(nome)) return "diesel";
  if (/h[ií]brido|hybrid/i.test(nome)) return "hibrido";
  if (/el[eé]trico/i.test(nome)) return "eletrico";
  if (/gnv/i.test(nome)) return "gnv";
  if (/etanol|[áa]lcool/i.test(nome)) return "etanol";
  if (/gasolina/i.test(nome)) return "gasolina";
  return "";
}

/** "GM - Chevrolet" → "Chevrolet": a FIPE põe a sigla do grupo antes do nome de algumas marcas. */
export function limparMarca(marca: string): string {
  return marca.replace(/^(VW|GM)\s*-\s*/i, "").trim();
}

/** Texto gravado no veículo: "Hyundai HB20 1.0 Comfort 12V Flex" (limite de 100 caracteres). */
export function modeloCompleto(marca: string, modelo: string): string {
  return `${limparMarca(marca)} ${modelo}`.trim().slice(0, 100);
}

/** Marcas da tabela FIPE (carros). A API guarda em cache; aqui a lista dura a sessão inteira. */
export function useMarcasFipe() {
  return useQuery({ queryKey: ["fipe", "marcas"], queryFn: () => api<ItemFipe[]>("/fipe/marcas"), staleTime: Infinity, retry: false });
}

/** Modelos de uma marca (só consulta quando há marca escolhida). */
export function useModelosFipe(codigoMarca: string) {
  return useQuery({
    queryKey: ["fipe", "modelos", codigoMarca],
    queryFn: () => api<ItemFipe[]>(`/fipe/modelos?marca=${codigoMarca}`),
    enabled: codigoMarca !== "",
    staleTime: Infinity,
    retry: false,
  });
}
