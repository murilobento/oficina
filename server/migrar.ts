import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { getMigrations } from "better-auth/db/migration";

import { criarAuth } from "./auth";
import type { Banco } from "./banco";
import { semearPerfis } from "./perfis";

const PASTA = path.resolve(import.meta.dirname, "../db/migrations");

/**
 * Prepara o banco: tabelas do Better Auth, tabelas do domínio (arquivos db/migrations/*.sql, cada um
 * aplicado uma única vez) e os perfis iniciais. Pode rodar de novo sem estragar nada.
 */
export async function migrar(banco: Banco): Promise<{ aplicadas: string[] }> {
  const auth = criarAuth(banco);
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();

  await banco.executar(
    `create table if not exists _migracoes (arquivo text primary key, aplicada_em timestamptz not null default now())`,
  );
  const feitas = new Set((await banco.consultar<{ arquivo: string }>("select arquivo from _migracoes")).map((l) => l.arquivo));
  const arquivos = (await readdir(PASTA)).filter((nome) => nome.endsWith(".sql")).sort();
  const aplicadas: string[] = [];
  for (const arquivo of arquivos) {
    if (feitas.has(arquivo)) continue;
    const sql = await readFile(path.join(PASTA, arquivo), "utf8");
    await banco.executar(`begin;\n${sql}\ninsert into _migracoes (arquivo) values ('${arquivo.replace(/'/g, "''")}');\ncommit;`);
    aplicadas.push(arquivo);
  }

  await semearPerfis(banco);
  return { aplicadas };
}
