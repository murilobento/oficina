// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { queryClient } from "@/lib/query-client";

import { useSessao } from "./sessao";

describe("useSessao.limpar", () => {
  it("esvazia o cache de consultas, para o próximo usuário não ver dados do anterior", () => {
    queryClient.setQueryData(["produtos"], [{ id: "p1", custo: 100 }]);
    useSessao.getState().limpar();
    expect(queryClient.getQueryData(["produtos"])).toBeUndefined();
    expect(useSessao.getState().eu).toBeNull();
  });
});

describe("useSessao.carregar", () => {
  it("sem internet devolve 'sem-conexao' e mantém o funcionário que já estava (não desloga)", async () => {
    const eu = { id: "u1", nome: "Ana", email: "a@b.c", perfil: "recepcao", trocarSenha: false, permissoes: [] };
    useSessao.setState({ eu });
    const original = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new TypeError("Failed to fetch"));
    try {
      expect(await useSessao.getState().carregar()).toBe("sem-conexao");
      expect(useSessao.getState().eu).toEqual(eu);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("app aberto sem internet mostra o último funcionário deste aparelho; deslogar apaga", async () => {
    const eu = { id: "u2", nome: "Bia", email: "b@b.c", perfil: "mecanico", trocarSenha: false, permissoes: [] };
    const original = globalThis.fetch;
    globalThis.fetch = () => Promise.resolve(new Response(JSON.stringify(eu), { status: 200 }));
    await useSessao.getState().carregar();
    useSessao.setState({ eu: null }); // simula abrir o app de novo
    globalThis.fetch = () => Promise.reject(new TypeError("Failed to fetch"));
    try {
      expect(await useSessao.getState().carregar()).toBe("sem-conexao");
      expect(useSessao.getState().eu).toEqual(eu);
      useSessao.getState().limpar();
      expect(await useSessao.getState().carregar()).toBe("sem-conexao");
      expect(useSessao.getState().eu).toBeNull();
    } finally {
      globalThis.fetch = original;
    }
  });

  it("401 da API significa ninguém logado", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = () => Promise.resolve(new Response("{}", { status: 401 }));
    try {
      expect(await useSessao.getState().carregar()).toBeNull();
      expect(useSessao.getState().eu).toBeNull();
    } finally {
      globalThis.fetch = original;
    }
  });
});
