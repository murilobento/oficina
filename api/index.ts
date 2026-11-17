import { obterApp } from "../server/instancia";

// Função da Vercel no formato "fetch": vercel.json reescreve /api/* para cá e o Hono resolve a rota.
export default {
  async fetch(requisicao: Request): Promise<Response> {
    return (await obterApp()).fetch(requisicao);
  },
};
