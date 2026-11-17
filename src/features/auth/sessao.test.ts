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
