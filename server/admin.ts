import { criarAuth, PERFIL_ADMIN } from "./auth";
import type { Banco } from "./banco";

/**
 * Cria o primeiro administrador (ou promove um e-mail que já existe). Devolve se criou agora.
 * Quem entra com a senha dada precisa trocá-la no primeiro acesso.
 */
export async function criarAdministrador(
  banco: Banco,
  { email, nome, senha, segredo }: { email: string; nome: string; senha: string; segredo?: string },
): Promise<{ criado: boolean }> {
  const login = email.trim().toLowerCase();
  const auth = criarAuth(banco, { permitirCadastro: true, segredo });
  const existente = await banco.consultar(`select id from "user" where lower(email) = $1`, [login]);
  const criado = existente.length === 0;
  if (criado) await auth.api.signUpEmail({ body: { name: nome, email: login, password: senha } });
  await banco.consultar(`update "user" set role = $2, "trocarSenha" = $3 where lower(email) = $1`, [login, PERFIL_ADMIN, criado]);
  return { criado };
}
