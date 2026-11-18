import { describe, expect, it } from "vitest";

import { filtrarModulos, navModules, permissaoDaRota } from "./sidebar-items";

const itens = (permissoes: Parameters<typeof filtrarModulos>[1]) =>
  filtrarModulos(navModules, permissoes).flatMap((m) => m.groups?.flatMap((g) => g.items.map((i) => i.id)) ?? []);

describe("menu por permissão", () => {
  it("sem nenhuma permissão sobra só o Início", () => {
    expect(filtrarModulos(navModules, []).map((m) => m.id)).toEqual(["inicio"]);
  });

  it("mostra só os itens liberados e some com módulos e grupos vazios", () => {
    const modulos = filtrarModulos(navModules, ["clientes.ver", "estoque.ver"]);
    expect(modulos.map((m) => m.id)).toEqual(["inicio", "cadastro", "estoque"]);
    expect(itens(["clientes.ver", "estoque.ver"])).toEqual(["clientes", "fornecedores", "produtos", "movimentacoes"]);
  });

  it("Administração só aparece para quem gerencia algo dela", () => {
    expect(itens(["perfis.gerenciar"])).toEqual(["perfis"]);
    expect(filtrarModulos(navModules, ["vendas.ver"]).some((m) => m.id === "administracao")).toBe(false);
  });

  it("permissões nulas (login desativado) mostram tudo", () => {
    expect(filtrarModulos(navModules, null)).toBe(navModules);
  });

  it("a rota exige a permissão do item; telas livres e rotas extras", () => {
    expect(permissaoDaRota("/vendas")).toBe("vendas.ver");
    expect(permissaoDaRota("/admin/perfis")).toBe("perfis.gerenciar");
    expect(permissaoDaRota("/estoque/acertos")).toBe("estoque.editar");
    expect(permissaoDaRota("/agenda")).toBe("agenda.ver");
    expect(permissaoDaRota("/")).toBeUndefined();
  });
});
