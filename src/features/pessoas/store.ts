import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Pessoa } from "./tipos";

export type PessoasState = {
  pessoas: Pessoa[];
  adicionar: (dados: Omit<Pessoa, "id" | "criadoEm">) => Pessoa;
  atualizar: (id: string, dados: Omit<Pessoa, "id" | "criadoEm">) => void;
  alternarAtivo: (id: string) => void;
  remover: (id: string) => void;
};

/**
 * PROTÓTIPO: os cadastros ficam guardados só neste navegador (localStorage), para as telas
 * poderem ser avaliadas antes de existir banco de dados. Quando a API (Neon) entrar, este
 * arquivo é trocado por consultas e mutações (TanStack Query) com a mesma interface.
 */
export function criarPessoasStore(chave: string, iniciais: Pessoa[]) {
  return create<PessoasState>()(
    persist(
      (set) => ({
        pessoas: iniciais,
        adicionar: (dados) => {
          const nova: Pessoa = { ...dados, id: crypto.randomUUID(), criadoEm: new Date().toISOString() };
          set((estado) => ({ pessoas: [...estado.pessoas, nova] }));
          return nova;
        },
        atualizar: (id, dados) =>
          set((estado) => ({
            pessoas: estado.pessoas.map((pessoa) => (pessoa.id === id ? { ...pessoa, ...dados } : pessoa)),
          })),
        alternarAtivo: (id) =>
          set((estado) => ({
            pessoas: estado.pessoas.map((pessoa) => (pessoa.id === id ? { ...pessoa, ativo: !pessoa.ativo } : pessoa)),
          })),
        remover: (id) => set((estado) => ({ pessoas: estado.pessoas.filter((pessoa) => pessoa.id !== id) })),
      }),
      { name: `oficina.${chave}`, version: 1 },
    ),
  );
}
