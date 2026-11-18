import { create } from "zustand";

import { queryClient } from "@/lib/query-client";

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
  /**
   * Consulta a sessão na API. Devolve nulo se não há ninguém logado, ou "sem-conexao" se o aparelho está
   * sem internet (aí não dá para saber; o funcionário não é jogado para o login por isso).
   */
  carregar: () => Promise<Eu | null | "sem-conexao">;
  limpar: () => void;
};

// Último funcionário logado neste aparelho, para o app instalado abrir sem internet mostrando quem é.
// Só nome, e-mail e permissões (usadas para mostrar botões; quem confere de verdade é a API). Sai ao deslogar.
const CHAVE_EU = "oficina.eu";
function lerEuGuardado(): Eu | null {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_EU) ?? "null") as Eu | null;
  } catch {
    return null;
  }
}
function guardarEu(eu: Eu | null) {
  try {
    if (eu) localStorage.setItem(CHAVE_EU, JSON.stringify(eu));
    else localStorage.removeItem(CHAVE_EU);
  } catch {
    // Armazenamento indisponível: só não lembra offline.
  }
}

export const useSessao = create<SessaoState>()((set, get) => ({
  eu: null,
  carregar: async () => {
    try {
      const resposta = await fetch("/api/eu", { credentials: "include" });
      const eu = resposta.ok ? ((await resposta.json()) as Eu) : null;
      set({ eu });
      guardarEu(eu);
      return eu;
    } catch {
      // Falha de rede não é "deslogado": mantém quem estava e deixa a tela abrir com o aviso de sem conexão.
      if (!get().eu) set({ eu: lerEuGuardado() });
      return "sem-conexao";
    }
  },
  // Ao sair, o cache de consultas também vai embora: o próximo usuário não pode ver dados do anterior.
  limpar: () => {
    queryClient.clear();
    guardarEu(null);
    set({ eu: null });
  },
}));

/** O funcionário logado tem esta permissão? (Sem login ativo, ninguém tem: as telas de dados exigem login.) */
export function usePode(permissao: Permissao): boolean {
  return useSessao((estado) => estado.eu?.permissoes.includes(permissao) ?? false);
}
