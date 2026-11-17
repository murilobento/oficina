import { serve } from "@hono/node-server";

import { criarAdministrador } from "./admin";
import { criarApp } from "./app";
import { criarAuth } from "./auth";
import { criarBanco } from "./banco";
import { migrar } from "./migrar";

// Servidor local da API (o Vite encaminha /api para cá). Sem DATABASE_URL usa um Postgres
// embutido em memória: serve para ver o login funcionando, mas os dados somem ao reiniciar.
const banco = await criarBanco();
if (banco.tipo === "pglite") {
  await migrar(banco);
  console.warn("DATABASE_URL vazia: usando banco em memória (dados somem ao reiniciar).");
  // Sem banco de verdade não há como rodar `pnpm db:admin` à parte: cria o administrador aqui.
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_SENHA) {
    await criarAdministrador(banco, { email: process.env.ADMIN_EMAIL, nome: process.env.ADMIN_NOME ?? "Administrador", senha: process.env.ADMIN_SENHA });
    console.warn(`Administrador ${process.env.ADMIN_EMAIL} criado para teste.`);
  }
}
const app = criarApp(banco, criarAuth(banco));
const porta = Number(process.env.API_PORTA ?? 8787);
serve({ fetch: app.fetch, port: porta }, () => console.log(`API em http://localhost:${porta}/api`));
