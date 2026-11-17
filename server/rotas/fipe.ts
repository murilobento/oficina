import { type Contexto, ErroApi } from "./util";

const BASE = "https://brasilapi.com.br/api/fipe";
const VALIDADE_MS = 24 * 60 * 60 * 1000;
const TEMPO_LIMITE_MS = 8000;

export type ItemFipe = { codigo: string; nome: string };

/** A BrasilAPI devolve {nome, valor} nas marcas e {modelo, valor} nos modelos: junta os dois formatos. */
export function normalizarLista(bruto: unknown): ItemFipe[] {
  if (!Array.isArray(bruto)) return [];
  const itens: ItemFipe[] = [];
  for (const item of bruto) {
    if (!item || typeof item !== "object") continue;
    const { nome, modelo, valor, codigo } = item as Record<string, unknown>;
    const texto = String(nome ?? modelo ?? "").trim();
    if (texto === "") continue;
    itens.push({ codigo: String(valor ?? codigo ?? texto), nome: texto });
  }
  return itens.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Consulta a tabela FIPE pela BrasilAPI (só carros), com cache de 24 h na memória do servidor. */
export function criarClienteFipe(buscar: typeof fetch = fetch, agora: () => number = Date.now) {
  const cache = new Map<string, { ate: number; itens: ItemFipe[] }>();

  async function consultar(caminho: string): Promise<ItemFipe[]> {
    const guardado = cache.get(caminho);
    if (guardado && guardado.ate > agora()) return guardado.itens;
    let resposta: Response;
    try {
      resposta = await buscar(`${BASE}${caminho}`, { signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
    } catch {
      throw new ErroApi(502, "Não foi possível consultar a lista de veículos agora. Digite a marca e o modelo.");
    }
    if (!resposta.ok) throw new ErroApi(502, "A lista de veículos está indisponível agora. Digite a marca e o modelo.");
    const itens = normalizarLista(await resposta.json().catch(() => null));
    if (itens.length === 0) throw new ErroApi(502, "A lista de veículos veio vazia. Digite a marca e o modelo.");
    cache.set(caminho, { ate: agora() + VALIDADE_MS, itens });
    return itens;
  }

  return {
    marcas: () => consultar("/marcas/v1/carros"),
    modelos: (codigoMarca: string) => consultar(`/veiculos/v1/carros/${encodeURIComponent(codigoMarca)}`),
  };
}

export function registrarRotasFipe({ app, exigirSessao, exigirPermissao }: Contexto, buscar?: typeof fetch) {
  const fipe = criarClienteFipe(buscar);
  const acesso = [exigirSessao, exigirPermissao("veiculos.editar")] as const;

  app.get("/fipe/marcas", ...acesso, async (c) => c.json(await fipe.marcas()));

  app.get("/fipe/modelos", ...acesso, async (c) => {
    const marca = c.req.query("marca") ?? "";
    if (!/^\d{1,6}$/.test(marca)) throw new ErroApi(400, "Informe a marca.");
    return c.json(await fipe.modelos(marca));
  });
}
