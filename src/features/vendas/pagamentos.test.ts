import { describe, expect, it } from "vitest";

import { adicionarForma, pagamentosParaApi, problemaRecebimento, resumoRecebimento, trocoDaLinha } from "./pagamentos";

describe("recebimento", () => {
  it("a forma entra já com o que falta", () => {
    let l = adicionarForma([], "pix", 50000);
    expect(l[0].valor).toBe("500,00");
    l = [{ ...l[0], valor: "400,00" }];
    l = adicionarForma(l, "dinheiro", 50000);
    expect(l[1].valor).toBe("100,00");
    expect(resumoRecebimento(l, 50000)).toEqual({ pago: 50000, falta: 0, excesso: 0 });
  });

  it("com tudo pago, nova forma entra vazia", () => {
    const l = adicionarForma(adicionarForma([], "pix", 50000), "debito", 50000);
    expect(l[1].valor).toBe("");
    expect(problemaRecebimento(l, 50000)).toMatch(/Informe o valor/);
  });

  it("sugestão (parcela) preenche a primeira forma", () => {
    expect(adicionarForma([], "pix", 50000, 20000)[0].valor).toBe("200,00");
  });

  it("troco só no dinheiro, pelo valor entregue", () => {
    const [l] = adicionarForma([], "dinheiro", 50000);
    expect(trocoDaLinha({ ...l, entregue: "600,00" })).toBe(10000);
    expect(problemaRecebimento([{ ...l, entregue: "400,00" }], 50000)).toMatch(/entregue/);
  });

  it("não passa do total", () => {
    const [l] = adicionarForma([], "pix", 50000);
    expect(problemaRecebimento([{ ...l, valor: "600,00" }], 50000)).toMatch(/passa do total/);
  });

  it("crédito em vezes vai para a API", () => {
    const [l] = adicionarForma([], "credito", 50000);
    expect(pagamentosParaApi([{ ...l, vezes: 3 }])).toEqual([{ forma: "credito", valor: 50000, parcelasCartao: 3 }]);
    expect(pagamentosParaApi([l])).toEqual([{ forma: "credito", valor: 50000 }]);
  });
});
