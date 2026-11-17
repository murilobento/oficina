import { queryClient } from "./query-client";

/** Recarrega as listas dos recursos indicados (os nomes são os caminhos da API: "produtos", "estoque/movimentos"...). */
export function invalidar(...recursos: string[]): Promise<unknown> {
  return Promise.all(recursos.map((recurso) => queryClient.invalidateQueries({ queryKey: [recurso] })));
}
