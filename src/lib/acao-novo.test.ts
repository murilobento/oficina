// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";

import { useAbrirQuandoPedido, useAcaoNovo } from "./acao-novo";

describe("acao-novo", () => {
  it("abre o formulário quando a ação pedida é a da lista e limpa o pedido", () => {
    const abrir = vi.fn();
    renderHook(() => useAbrirQuandoPedido("orcamento", abrir));
    expect(abrir).not.toHaveBeenCalled();
    act(() => useAcaoNovo.getState().pedir("venda"));
    expect(abrir).not.toHaveBeenCalled();
    act(() => useAcaoNovo.getState().pedir("orcamento"));
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(useAcaoNovo.getState().pendente).toBeNull();
  });

  it("um pedido feito antes de a lista abrir é atendido ao montar", () => {
    const abrir = vi.fn();
    act(() => useAcaoNovo.getState().pedir("cliente"));
    renderHook(() => useAbrirQuandoPedido("cliente", abrir));
    expect(abrir).toHaveBeenCalledTimes(1);
  });
});
