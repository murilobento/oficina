import { create } from "zustand";
import { persist } from "zustand/middleware";

import { EMPRESA_PADRAO, type Empresa } from "./tipos";

type EmpresaState = {
  empresa: Empresa;
  salvar: (empresa: Empresa) => void;
};

/**
 * PROTÓTIPO: os dados da empresa (e a logo, como imagem reduzida) ficam guardados só neste
 * navegador (localStorage). Com o Supabase, vira uma linha da tabela `empresa` e a logo vai
 * para o Storage, mantendo esta interface.
 */
export const useEmpresaStore = create<EmpresaState>()(
  persist(
    (set) => ({
      empresa: EMPRESA_PADRAO,
      salvar: (empresa) => set({ empresa }),
    }),
    // Preenche com o padrão o que faltar (se um campo novo surgir depois), sem perder o salvo.
    { name: "oficina.empresa", version: 1, merge: (salvo, atual) => ({ ...atual, ...(salvo as Partial<EmpresaState>), empresa: { ...EMPRESA_PADRAO, ...((salvo as Partial<EmpresaState>)?.empresa ?? {}) } }) },
  ),
);

/** Dados da empresa para qualquer tela ou documento. */
export function useEmpresa(): Empresa {
  return useEmpresaStore((estado) => estado.empresa);
}
