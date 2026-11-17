import { afterEach, describe, expect, it } from "vitest";

import { movimentar } from "./estoque";
import { iniciarAppDeTeste } from "./teste-util";

let t: Awaited<ReturnType<typeof iniciarAppDeTeste>>;
afterEach(() => t.fechar());

async function produto() {
  const [p] = await t.banco.consultar<{ id: string }>("insert into produtos (descricao, unidade, codigo) values ('Óleo','L','PRD-X') returning id");
  return p.id;
}

describe("transacao e movimentar", () => {
  it("desfaz tudo quando algo falha", async () => {
    t = await iniciarAppDeTeste();
    const id = await produto();
    await expect(
      t.banco.transacao(async (q) => {
        await movimentar(q, { produtoId: id, delta: 5, origem: "acerto", documento: "ACE-1", motivo: "" });
        throw new Error("falhou");
      }),
    ).rejects.toThrow("falhou");
    const [p] = await t.banco.consultar<{ saldo: string }>("select saldo from produtos where id = $1", [id]);
    expect(Number(p.saldo)).toBe(0);
    expect(await t.banco.consultar("select 1 from movimentos_estoque")).toHaveLength(0);
  });

  it("altera o saldo e grava o movimento com o saldo depois", async () => {
    t = await iniciarAppDeTeste();
    const id = await produto();
    const r = await t.banco.transacao((q) => movimentar(q, { produtoId: id, delta: 4.5, origem: "compra", documento: "CMP-1", motivo: "" }));
    expect(r.saldoApos).toBe(4.5);
    const r2 = await t.banco.transacao((q) => movimentar(q, { produtoId: id, delta: -6, origem: "venda", documento: "VND-1", motivo: "" }));
    expect(r2.saldoApos).toBe(-1.5);
    const mov = await t.banco.consultar<{ tipo: string; quantidade: string; saldo_apos: string }>("select * from movimentos_estoque order by criado_em, saldo_apos desc");
    expect(mov.map((m) => [m.tipo, Number(m.quantidade), Number(m.saldo_apos)])).toEqual(expect.arrayContaining([["entrada", 4.5, 4.5], ["saida", 6, -1.5]]));
  });

  it("produto inexistente dá erro", async () => {
    t = await iniciarAppDeTeste();
    await expect(t.banco.transacao((q) => movimentar(q, { produtoId: "00000000-0000-0000-0000-000000000000", delta: 1, origem: "acerto", documento: "", motivo: "" }))).rejects.toThrow();
  });
});
