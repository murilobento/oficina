import { criarApp } from "./app";
import { criarAuth } from "./auth";
import { criarBanco } from "./banco";

let promessa: Promise<ReturnType<typeof criarApp>> | null = null;

/** Uma instância por processo (na Vercel, por função "quente"). */
export function obterApp() {
  promessa ??= (async () => {
    if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL não configurada: informe a connection string do Neon.");
    }
    const banco = await criarBanco();
    return criarApp(banco, criarAuth(banco));
  })();
  return promessa;
}
