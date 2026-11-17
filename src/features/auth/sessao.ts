import { create } from "zustand";

import type { Permissao } from "./permissoes";

/**
 * O login só vale quando a API está no ar. Enquanto `VITE_LOGIN_ATIVO` não for "true", o sistema
 * abre direto, com o funcionário de exemplo (telas ainda em protótipo, dados no navegador).
 */
export const LOGIN_ATIVO = import.meta.env.VITE_LOGIN_ATIVO === "true";

/** Funcionário logado, como a API devolve em /api/eu. */
export type Eu = {
  id: string;
  nome: string;
  email: string;
  /** Id do perfil de acesso (administrador, gerencia, recepcao, mecanico...). */
  perfil: string;
  /** true até a pessoa trocar a senha provisória. */
  trocarSenha: boolean;
  permissoes: Permissao[];
};

type SessaoState = {
  eu: Eu | null;
  /** Consulta a sessão na API. Devolve nulo se não há ninguém logado. */
  carregar: () => Promise<Eu | null>;
  limpar: () => void;
};

export const useSessao = create<SessaoState>()((set) => ({
  eu: null,
  carregar: async () => {
    try {
      const resposta = await fetch("/api/eu", { credentials: "include" });
      const eu = resposta.ok ? ((await resposta.json()) as Eu) : null;
      set({ eu });
      return eu;
    } catch {
      set({ eu: null });
      return null;
    }
  },
  limpar: () => set({ eu: null }),
}));
