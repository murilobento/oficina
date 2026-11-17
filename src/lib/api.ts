import { useSessao } from "@/features/auth/sessao";

/** Erro devolvido pela API: `status` HTTP, mensagem em português e, na validação, `campos` por nome. */
export class ApiErro extends Error {
  status: number;
  campos?: Record<string, string>;
  constructor(status: number, mensagem: string, campos?: Record<string, string>) {
    super(mensagem);
    this.status = status;
    this.campos = campos;
  }
}

/** Chama a API da oficina. Sessão expirada (401) leva ao login. */
export async function api<T>(caminho: string, opcoes: { metodo?: string; corpo?: unknown } = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: opcoes.metodo ?? (opcoes.corpo !== undefined ? "POST" : "GET"),
      credentials: "include",
      headers: opcoes.corpo !== undefined ? { "content-type": "application/json" } : undefined,
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
    });
  } catch {
    throw new ApiErro(0, "Sem conexão com o servidor. Confira a internet e tente de novo.");
  }
  if (resposta.status === 204) return undefined as T;
  const dados = (await resposta.json().catch(() => null)) as { erro?: string; campos?: Record<string, string> } | null;
  if (resposta.ok) return dados as T;
  if (resposta.status === 401) {
    useSessao.getState().limpar();
    if (!window.location.pathname.startsWith("/login")) window.location.assign("/login");
  }
  throw new ApiErro(resposta.status, dados?.erro ?? "Não foi possível concluir. Tente de novo.", dados?.campos);
}
