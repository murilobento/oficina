import { create } from "zustand";
import { persist } from "zustand/middleware";
import { novoId } from "./id";

export type Cadastro = { id: string; criadoEm: string; ativo?: boolean };

export type CadastroState<T extends Cadastro> = {
  itens: T[];
  adicionar: (dados: Omit<T, "id" | "criadoEm">) => T;
  atualizar: (id: string, dados: Partial<Omit<T, "id">>) => void;
  alternarAtivo: (id: string) => void;
  remover: (id: string) => void;
};

/**
 * PROTÓTIPO: os cadastros ficam guardados só neste navegador (localStorage), para as telas
 * poderem ser avaliadas antes de existir banco de dados. Quando a API (Neon) entrar, este
 * arquivo é trocado por consultas e mutações (TanStack Query) com a mesma interface.
 */
export function criarCadastroStore<T extends Cadastro>(chave: string, iniciais: T[]) {
  return create<CadastroState<T>>()(
    persist(
      (set) => ({
        itens: iniciais,
        adicionar: (dados) => {
          const novo = { ...dados, id: novoId(), criadoEm: new Date().toISOString() } as T;
          set((estado) => ({ itens: [...estado.itens, novo] }));
          return novo;
        },
        atualizar: (id, dados) =>
          set((estado) => ({ itens: estado.itens.map((item) => (item.id === id ? { ...item, ...dados } : item)) })),
        alternarAtivo: (id) =>
          set((estado) => ({
            itens: estado.itens.map((item) => (item.id === id ? { ...item, ativo: !item.ativo } : item)),
          })),
        remover: (id) => set((estado) => ({ itens: estado.itens.filter((item) => item.id !== id) })),
      }),
      { name: `oficina.${chave}`, version: 1 },
    ),
  );
}
