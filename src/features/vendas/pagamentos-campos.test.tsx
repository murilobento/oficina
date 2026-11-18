// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useSessao } from "@/features/auth/sessao";

import { type EstadoPagamento, novaLinha } from "./pagamentos";
import { PagamentosCampos } from "./pagamentos-campos";

function Exemplo({ inicial, temCliente = true }: { inicial: EstadoPagamento; temCliente?: boolean }) {
  const [estado, setEstado] = useState(inicial);
  return <PagamentosCampos prefixo="t" total={50000} estado={estado} aoMudar={setEstado} temCliente={temCliente} />;
}

const estado = (forma: string, valor: string): EstadoPagamento => ({ linhas: [novaLinha(forma, valor)], divergencia: "" });

beforeEach(() => {
  useSessao.setState({ eu: { id: "1", nome: "A", email: "a@a", perfil: "administrador", trocarSenha: false, permissoes: ["valores.ver"] } });
});
afterEach(cleanup);

describe("PagamentosCampos", () => {
  it("pagou o total: sem pergunta de divergência", () => {
    render(<Exemplo inicial={estado("pix", "")} />);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.getByText("Faltam").nextSibling).toHaveTextContent("0,00");
  });

  it("500 com 400 pagos: mostra o que falta e pede para escolher", () => {
    render(<Exemplo inicial={estado("pix", "400,00")} />);
    expect(screen.getByText(/Faltam R\$\s?100,00\. O que fazer\?/)).toBeInTheDocument();
    const devendo = screen.getByRole("radio", { name: /Ficar devendo/ });
    fireEvent.click(devendo);
    expect(devendo).toHaveAttribute("aria-checked", "true");
  });

  it("sem cliente não deixa ficar devendo", () => {
    render(<Exemplo inicial={estado("pix", "400,00")} temCliente={false} />);
    expect(screen.getByRole("radio", { name: /Ficar devendo/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Dar desconto/ })).toBeEnabled();
  });

  it("pagou a mais: mostra o troco", () => {
    render(<Exemplo inicial={estado("dinheiro", "600,00")} />);
    expect(screen.getByText("Troco").nextSibling).toHaveTextContent("100,00");
  });

  it("dividir em outra forma cria a segunda linha com o total na primeira", () => {
    render(<Exemplo inicial={estado("pix", "")} />);
    fireEvent.click(screen.getByRole("button", { name: /Dividir em outra forma/ }));
    expect(screen.getByLabelText("Forma 2")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Valor (R$)")[0]).toHaveValue("500,00");
  });
});
