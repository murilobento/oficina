import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarAppDeTeste, SENHA_ADMIN } from "../teste-util";

import { totalDaVenda } from "./pagamentos-venda";

let ctx: Awaited<ReturnType<typeof iniciarAppDeTeste>>;
let recepcao: string;
let clienteId: string;
let produtoId: string;

type Registro = { id: string; usuario: string; usuarioId: string | null; categoria: string; acao: string; descricao: string; alvo: { tipo: string; id: string } | null; detalhes: Record<string, unknown> | null };

beforeAll(async () => {
  ctx = await iniciarAppDeTeste();
  recepcao = await ctx.funcionario("recepcao");
  [{ id: clienteId }] = await ctx.banco.consultar<{ id: string }>("insert into pessoas (papel, tipo, nome) values ('cliente','PF','Ana') returning id");
  [{ id: produtoId }] = await ctx.banco.consultar<{ id: string }>("insert into produtos (descricao, unidade, codigo, custo, venda, saldo) values ('Óleo','L','PRD-1', 3000, 5000, 10) returning id");
}, 60_000);
afterAll(() => ctx.fechar());

/** Registros gravados com a ação dada, direto do banco. */
const registros = async (acao: string) =>
  ctx.banco.consultar<{ usuario: string; usuario_id: string | null; categoria: string; descricao: string; detalhes: Record<string, unknown> | null; alvo_id: string | null }>(
    "select usuario, usuario_id, categoria, descricao, detalhes, alvo_id from auditoria where acao = $1 order by criado_em",
    [acao],
  );

const produto = {
  codigo: "", descricao: "Óleo", categoria: "filtros", marca: "", referencia: "", codigoBarras: "", unidade: "L", aplicacao: "",
  custo: 3000, venda: 5000, estoqueMinimo: 0, localizacao: "", fornecedorId: "", ncm: "", observacoes: "", ativo: true,
};

describe("auditoria: o que é gravado", () => {
  it("entrada no sistema e senha errada (com o e-mail tentado)", async () => {
    await ctx.entrar("admin@oficina.com", SENHA_ADMIN);
    const errada = await ctx.chamar("/api/auth/sign-in/email", { corpo: { email: "admin@oficina.com", password: "senha-errada-123" } });
    expect(errada.status).toBe(401);
    await ctx.chamar("/api/auth/sign-in/email", { corpo: { email: "ninguem@oficina.com", password: "qualquer-coisa-1" } });

    const entradas = await registros("login.entrada");
    expect(entradas.at(-1)).toMatchObject({ usuario: "Admin", categoria: "login" });
    const erros = await registros("login.senha_errada");
    expect(erros).toHaveLength(2);
    expect(erros[0]).toMatchObject({ usuario_id: null, usuario: "admin@oficina.com", detalhes: { cadastrado: true } });
    expect(erros[0].descricao).toContain("Admin");
    expect(erros[1]).toMatchObject({ detalhes: { email: "ninguem@oficina.com", cadastrado: false } });
  });

  it("mudança de preço grava antes → depois; editar sem mexer no preço não grava", async () => {
    const r = await ctx.chamar(`/api/produtos/${produtoId}`, { metodo: "PUT", corpo: { ...produto, venda: 4200 }, cookie: ctx.admin });
    expect(r.status).toBe(200);
    await ctx.chamar(`/api/produtos/${produtoId}`, { metodo: "PUT", corpo: { ...produto, venda: 4200, descricao: "Óleo 5W30" }, cookie: ctx.admin });

    const [registro, ...outros] = await registros("produto.preco_alterado");
    expect(outros).toHaveLength(0);
    expect(registro).toMatchObject({ usuario: "Admin", categoria: "precos", alvo_id: produtoId });
    expect(registro.detalhes).toMatchObject({ mudancas: [{ campo: "Preço de venda", antes: 5000, depois: 4200 }] });
    // O formato de moeda usa espaço não separável depois do "R$".
    expect(registro.descricao.replace(/\s/g, " ")).toContain("R$ 50,00 → R$ 42,00");
  });

  it("venda cancelada e pagamento estornado; ação recusada não grava nada", async () => {
    const itens = [{ tipo: "produto", origemId: produtoId, descricao: "Óleo", unidade: "L", quantidade: 2, valor: 4200 }];
    const total = totalDaVenda(itens as never, "valor", 0, 0);
    const criada = await (await ctx.chamar("/api/vendas", {
      cookie: ctx.admin,
      corpo: { clienteId, veiculoId: "", km: 0, itens, descontoTipo: "valor", desconto: 0, observacoes: "", pagamentos: [{ forma: "pix", valor: total }] },
    })).json();

    // Com pagamento recebido o cancelamento é recusado (409): nada vai para a auditoria.
    expect((await ctx.chamar(`/api/vendas/${criada.id}/cancelar`, { corpo: {}, cookie: ctx.admin })).status).toBe(409);
    expect(await registros("venda.cancelada")).toHaveLength(0);

    const pagamentoId = criada.pagamentos[0].id;
    expect((await ctx.chamar(`/api/vendas/${criada.id}/pagamentos/${pagamentoId}/estornar`, { corpo: {}, cookie: ctx.admin })).status).toBe(200);
    expect((await ctx.chamar(`/api/vendas/${criada.id}/cancelar`, { corpo: {}, cookie: ctx.admin })).status).toBe(200);

    const [estorno] = await registros("venda.pagamento_estornado");
    expect(estorno).toMatchObject({ categoria: "dinheiro", alvo_id: criada.id, detalhes: { valor: total, forma: "pix" } });
    const [cancelada] = await registros("venda.cancelada");
    expect(cancelada.descricao).toContain(criada.numero);
  });

  it("exclusão de cadastro grava; exclusão barrada pelo banco não grava", async () => {
    // O produto tem movimentos (a venda acima): o banco recusa a exclusão.
    expect((await ctx.chamar(`/api/produtos/${produtoId}`, { metodo: "DELETE", cookie: ctx.admin })).status).toBe(409);
    expect(await registros("produto.excluido")).toHaveLength(0);

    const [{ id: veiculoId }] = await ctx.banco.consultar<{ id: string }>("insert into veiculos (cliente_id, modelo, placa, km) values ($1, 'Gol', 'ABC1D23', 0) returning id", [clienteId]);
    expect((await ctx.chamar(`/api/veiculos/${veiculoId}`, { metodo: "DELETE", cookie: ctx.admin })).status).toBe(204);
    const [veiculo] = await registros("veiculo.excluido");
    expect(veiculo.descricao).toBe("Excluiu o veículo Gol (ABC1D23).");
  });

  it("perfil alterado lista as permissões incluídas e retiradas", async () => {
    const criado = await (await ctx.chamar("/api/perfis", { cookie: ctx.admin, corpo: { nome: "Balcão", descricao: "", permissoes: ["vendas.ver"] } })).json();
    await ctx.chamar(`/api/perfis/${criado.id}`, { metodo: "PUT", cookie: ctx.admin, corpo: { nome: "Balcão", descricao: "", permissoes: ["valores.ver"] } });
    const [alterado] = await registros("perfil.alterado");
    expect(alterado.detalhes).toMatchObject({ incluidas: ["Ver preços e valores"], retiradas: ["Ver vendas"] });
  });

  it("acerto de estoque registra os produtos com diferença", async () => {
    const r = await ctx.chamar("/api/estoque/acertos", { cookie: ctx.admin, corpo: { motivo: "Contagem", observacoes: "", itens: [{ produtoId, contado: 5 }] } });
    expect(r.status).toBe(201);
    const [acerto] = await registros("estoque.acerto");
    expect(acerto.categoria).toBe("estoque");
    expect(acerto.detalhes).toMatchObject({ motivo: "Contagem", itens: [{ produto: "Óleo 5W30", sistema: 10, contado: 5, diferenca: -5 }] });
  });
});

describe("GET /api/auditoria", () => {
  it("exige a permissão auditoria.ver", async () => {
    expect((await ctx.chamar("/api/auditoria")).status).toBe(401);
    expect((await ctx.chamar("/api/auditoria", { cookie: recepcao })).status).toBe(403);
  });

  it("lista do mais recente para o mais antigo e filtra por categoria, funcionário e texto", async () => {
    const todos = (await (await ctx.chamar("/api/auditoria", { cookie: ctx.admin })).json()).registros as Registro[];
    expect(todos.length).toBeGreaterThan(5);
    expect(todos[0].acao).toBe("estoque.acerto");

    const dinheiro = (await (await ctx.chamar("/api/auditoria?categoria=dinheiro", { cookie: ctx.admin })).json()).registros as Registro[];
    expect(dinheiro.length).toBeGreaterThan(0);
    expect(dinheiro.every((r) => r.categoria === "dinheiro")).toBe(true);

    const busca = (await (await ctx.chamar(`/api/auditoria?busca=${encodeURIComponent("Gol (ABC")}`, { cookie: ctx.admin })).json()).registros as Registro[];
    expect(busca.map((r) => r.acao)).toEqual(["veiculo.excluido"]);

    const usuarios = (await (await ctx.chamar("/api/auditoria/usuarios", { cookie: ctx.admin })).json()) as { id: string; nome: string }[];
    const admin = usuarios.find((u) => u.nome === "Admin");
    expect(admin).toBeDefined();
    const doAdmin = (await (await ctx.chamar(`/api/auditoria?usuario=${admin?.id}`, { cookie: ctx.admin })).json()).registros as Registro[];
    expect(doAdmin.every((r) => r.usuarioId === admin?.id)).toBe(true);

    expect((await ctx.chamar("/api/auditoria?categoria=xyz", { cookie: ctx.admin })).status).toBe(400);
  });

  it("pagina por cursor sem repetir nem pular registros", async () => {
    await ctx.banco.consultar(
      "insert into auditoria (usuario, categoria, acao, descricao, criado_em) select 'Teste', 'login', 'teste', 'linha ' || n, now() - (n || ' minutes')::interval from generate_series(1, 60) n",
    );
    const primeira = await (await ctx.chamar("/api/auditoria?categoria=login", { cookie: ctx.admin })).json();
    expect(primeira.registros).toHaveLength(50);
    expect(primeira.proximo).toBeTruthy();
    const segunda = await (await ctx.chamar(`/api/auditoria?categoria=login&antesDe=${encodeURIComponent(primeira.proximo)}`, { cookie: ctx.admin })).json();
    const ids = [...primeira.registros, ...segunda.registros].map((r: Registro) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    const [{ total }] = await ctx.banco.consultar<{ total: string }>("select count(*) as total from auditoria where categoria = 'login'");
    expect(ids.length).toBe(Number(total));
    expect(segunda.proximo).toBeNull();
  });

  it("não existe rota para alterar nem apagar registros", async () => {
    const [{ id }] = await ctx.banco.consultar<{ id: string }>("select id from auditoria limit 1");
    expect((await ctx.chamar(`/api/auditoria/${id}`, { metodo: "DELETE", cookie: ctx.admin })).status).toBe(404);
    expect((await ctx.chamar(`/api/auditoria/${id}`, { metodo: "PUT", corpo: { descricao: "x" }, cookie: ctx.admin })).status).toBe(404);
  });
});
