// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSessao } from "@/features/auth/sessao";

import { RecebimentoEtapa } from "./recebimento-etapa";

const comPermissoes = (permissoes: string[]) =>
  useSessao.setState({ eu: { id: "1", nome: "A", email: "a@a", perfil: "x", trocarSenha: false, permissoes: permissoes as never } });

beforeEach(() => comPermissoes(["valores.ver"]));
afterEach(cleanup);

describe("RecebimentoEtapa", () => {
  it("tocar na forma já preenche o total e libera 'Concluir venda'", () => {
    const aoConcluir = vi.fn();
    render(<RecebimentoEtapa modo="venda" total={50000} temCliente enviando={false} aoConcluir={aoConcluir} />);
    fireEvent.click(screen.getByRole("button", { name: /Pix/ }));
    expect(screen.getByLabelText("Pix")).toHaveValue("500,00");
    fireEvent.click(screen.getByRole("button", { name: "Concluir venda" }));
    expect(aoConcluir).toHaveBeenCalledWith({ pagamentos: [{ forma: "pix", valor: 50000 }] });
  });

  it("500 com 400 pagos: oferece ficar a receber (com parcelas) ou desconto", () => {
    const aoConcluir = vi.fn();
    render(<RecebimentoEtapa modo="venda" total={50000} temCliente enviando={false} aoConcluir={aoConcluir} />);
    fireEvent.click(screen.getByRole("button", { name: /Pix/ }));
    fireEvent.change(screen.getByLabelText("Pix"), { target: { value: "40000" } });
    expect(screen.getByRole("button", { name: /Dar R\$\s?100,00 de desconto/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /R\$\s?100,00 fica a receber/ }));
    fireEvent.change(screen.getByLabelText("Parcelas"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("1º vencimento"), { target: { value: "2026-12-18" } });
    expect(screen.getByText("2/2 · 17/01/2027")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Confirmar/ }));
    expect(aoConcluir).toHaveBeenCalledWith({
      pagamentos: [{ forma: "pix", valor: 40000 }],
      divergencia: "saldo",
      parcelamento: { parcelas: 2, primeiroVencimento: "2026-12-18" },
    });
  });

  it("sem cliente não deixa ficar a receber", () => {
    render(<RecebimentoEtapa modo="venda" total={50000} enviando={false} aoConcluir={vi.fn()} />);
    expect(screen.getByRole("button", { name: /tudo fica a receber/ })).toBeDisabled();
  });

  it("dinheiro mostra o troco pelo valor entregue", () => {
    render(<RecebimentoEtapa modo="venda" total={50000} temCliente enviando={false} aoConcluir={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Dinheiro/ }));
    fireEvent.change(screen.getByLabelText("Entregue"), { target: { value: "60000" } });
    expect(screen.getByText(/Troco: R\$\s?100,00/)).toBeInTheDocument();
  });

  it("quem não vê valores só escolhe a forma", () => {
    comPermissoes([]);
    const aoConcluir = vi.fn();
    render(<RecebimentoEtapa modo="venda" total={0} enviando={false} aoConcluir={aoConcluir} />);
    fireEvent.click(screen.getByRole("radio", { name: /Débito/ }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir venda" }));
    expect(aoConcluir).toHaveBeenCalledWith({ pagamentos: [{ forma: "debito", valor: 0 }] });
  });

  it("venda de total zero conclui sem pagamento", () => {
    const aoConcluir = vi.fn();
    render(<RecebimentoEtapa modo="venda" total={0} temCliente enviando={false} aoConcluir={aoConcluir} />);
    fireEvent.click(screen.getByRole("button", { name: "Concluir venda" }));
    expect(aoConcluir).toHaveBeenCalledWith({ pagamentos: [] });
  });

  it("apagar a data de vencimento não quebra a tela e bloqueia confirmar", () => {
    render(<RecebimentoEtapa modo="venda" total={50000} temCliente enviando={false} aoConcluir={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /tudo fica a receber/ }));
    fireEvent.change(screen.getByLabelText("Vencimento"), { target: { value: "" } });
    expect(screen.getByRole("button", { name: /Confirmar/ })).toBeDisabled();
  });
});
