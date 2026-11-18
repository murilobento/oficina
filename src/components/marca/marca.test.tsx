// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { Check } from "lucide-react";
import { describe, expect, it } from "vitest";

import { FitaStatus } from "./fita-status";
import { MedidorSegmentado } from "./medidor-segmentado";
import { Numeral } from "./numeral";

describe("MedidorSegmentado", () => {
  it("arredonda para o segmento e expõe os valores", () => {
    const { container } = render(<MedidorSegmentado valor={2} maximo={10} rotulo="Estoque" />);
    const medidor = screen.getByRole("meter", { name: "Estoque" });
    expect(medidor).toHaveAttribute("aria-valuenow", "2");
    expect(medidor).toHaveAttribute("aria-valuemax", "10");
    expect(container.querySelectorAll('[data-aceso="true"]')).toHaveLength(2);
    expect(container.querySelectorAll("i")).toHaveLength(8);
  });

  it("não passa de cheio nem de vazio", () => {
    const { container, rerender } = render(<MedidorSegmentado valor={99} maximo={10} rotulo="x" segmentos={5} />);
    expect(container.querySelectorAll('[data-aceso="true"]')).toHaveLength(5);
    rerender(<MedidorSegmentado valor={-3} maximo={10} rotulo="x" segmentos={5} />);
    expect(container.querySelectorAll('[data-aceso="true"]')).toHaveLength(0);
    rerender(<MedidorSegmentado valor={1} maximo={0} rotulo="x" />);
    expect(container.querySelectorAll('[data-aceso="true"]')).toHaveLength(0);
  });
});

describe("FitaStatus e Numeral", () => {
  it("a fita mostra ícone e texto", () => {
    const { container } = render(<FitaStatus tom="ok" icone={Check}>Aprovado</FitaStatus>);
    expect(screen.getByText("Aprovado")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("o numeral mostra rótulo e valor", () => {
    render(<Numeral rotulo="Total" valor="R$ 1,00" />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("R$ 1,00")).toBeInTheDocument();
  });
});
