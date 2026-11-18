import { useEffect, useRef } from "react";

import { create } from "zustand";

/**
 * Ponte entre o botão ＋ Novo (barra inferior) e as listas: o botão guarda a ação pedida e a lista,
 * ao abrir (ou se já estiver aberta), abre o formulário de cadastro novo e limpa o pedido.
 */
export const useAcaoNovo = create<{ pendente: string | null; pedir: (acao: string) => void; limpar: () => void }>((set) => ({
  pendente: null,
  pedir: (acao) => set({ pendente: acao }),
  limpar: () => set({ pendente: null }),
}));

/** Chame na lista: `chave` é o `id` da ação (ex.: "orcamento"); `abrir` abre o formulário novo. */
export function useAbrirQuandoPedido(chave: string, abrir: () => void) {
  const pendente = useAcaoNovo((estado) => estado.pendente);
  const abrirRef = useRef(abrir);
  useEffect(() => {
    abrirRef.current = abrir;
  });
  useEffect(() => {
    if (pendente !== chave) return;
    useAcaoNovo.getState().limpar();
    abrirRef.current();
  }, [pendente, chave]);
}
