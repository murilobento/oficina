import { PGlite } from "@electric-sql/pglite";
import { Pool } from "@neondatabase/serverless";

/** Conexão com o PostgreSQL: Neon em produção; PGlite (Postgres embutido, em memória) sem DATABASE_URL. */
export type Consulta = <T = Record<string, unknown>>(texto: string, parametros?: unknown[]) => Promise<T[]>;

export type Banco = {
  /** Opção `database` do Better Auth. */
  database: unknown;
  /** Executa SQL com parâmetros e devolve as linhas. */
  consultar<T = Record<string, unknown>>(texto: string, parametros?: unknown[]): Promise<T[]>;
  /** Executa `fn` numa transação: tudo grava junto ou nada (erro = rollback). */
  transacao<T>(fn: (consultar: Consulta) => Promise<T>): Promise<T>;
  /** Executa um script com vários comandos (migrações). */
  executar(texto: string): Promise<void>;
  fechar(): Promise<void>;
  tipo: "neon" | "pglite";
};

export async function criarBanco(url = process.env.DATABASE_URL): Promise<Banco> {
  if (url) {
    const pool = new Pool({ connectionString: url });
    // Conexão ociosa que cai (Neon suspende o compute) não pode derrubar o processo.
    pool.on("error", (erro: Error) => console.error("Erro numa conexão ociosa do banco:", erro.message));
    return {
      tipo: "neon",
      database: pool,
      consultar: async (texto, parametros) => (await pool.query(texto, parametros as unknown[])).rows,
      transacao: async (fn) => {
        const cliente = await pool.connect();
        let descartar: Error | undefined;
        try {
          await cliente.query("begin");
          const resultado = await fn(async (texto, parametros) => (await cliente.query(texto, parametros as unknown[])).rows as never[]);
          await cliente.query("commit");
          return resultado;
        } catch (erro) {
          await cliente.query("rollback").catch((falha: Error) => {
            descartar = falha; // não devolve ao pool uma conexão em estado incerto
          });
          throw erro;
        } finally {
          cliente.release(descartar);
        }
      },
      executar: async (texto) => {
        await pool.query(texto);
      },
      fechar: () => pool.end(),
    };
  }

  const pglite = new PGlite();
  // PGlite com a mesma "cara" de um Pool do pg, que o Better Auth (via Kysely) sabe usar.
  // Uma conexão só: serve para testes e desenvolvimento, não para produção.
  const executar = async (texto: string, parametros?: unknown[]) => {
    const resultado = await pglite.query(texto, parametros);
    return { rows: resultado.rows as never[], rowCount: resultado.affectedRows ?? resultado.rows.length, fields: resultado.fields };
  };
  const pool = {
    query: executar,
    connect: async () => ({ query: executar, release: () => {} }),
    end: async () => {},
    on: () => pool,
  };
  return {
    tipo: "pglite",
    database: pool,
    consultar: async (texto, parametros) => (await executar(texto, parametros)).rows,
    transacao: (fn) =>
      pglite.transaction((tx) => fn(async (texto, parametros) => (await tx.query(texto, parametros)).rows as never[])),
    executar: async (texto) => {
      await pglite.exec(texto);
    },
    fechar: () => pglite.close(),
  };
}
