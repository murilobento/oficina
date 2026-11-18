// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatarPlaca } from "./placa";
import { PlacaVeiculo } from "./placa-veiculo";

describe("PlacaVeiculo", () => {
  it("formata placa Mercosul e modelo antigo", () => {
    expect(formatarPlaca("abc-1d23")).toBe("ABC1D23");
    expect(formatarPlaca("hxt9021")).toBe("HXT-9021");
    expect(formatarPlaca("  ")).toBe("");
  });

  it("não renderiza nada sem placa e expõe a placa por texto acessível", () => {
    const { container, rerender } = render(<PlacaVeiculo placa="" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<PlacaVeiculo placa="abc1d23" />);
    expect(screen.getByRole("img", { name: "Placa ABC1D23" })).toBeInTheDocument();
  });
});
