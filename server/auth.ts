import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

import type { Banco } from "./banco";

/** Perfil que gerencia funcionários pelo plugin admin do Better Auth. */
export const PERFIL_ADMIN = "administrador";

// Só o Administrador usa as ações do plugin admin (criar funcionário, redefinir senha, banir).
// Os demais perfis não têm nenhuma delas: o que cada um pode fazer na oficina fica em `perfil_permissoes`.
const ac = createAccessControl(defaultStatements);
const papeis = {
  administrador: ac.newRole({ ...adminAc.statements }),
  gerencia: ac.newRole({ user: [], session: [] }),
  recepcao: ac.newRole({ user: [], session: [] }),
  mecanico: ac.newRole({ user: [], session: [] }),
};

type Opcoes = {
  /** Só o script de criação do primeiro administrador liga o cadastro aberto. */
  permitirCadastro?: boolean;
  segredo?: string;
  urlBase?: string;
  origensConfiaveis?: string[];
};

/**
 * Better Auth: e-mail e senha, sem cadastro público (o administrador cria os funcionários).
 * O perfil de acesso da oficina é o `role` do usuário; as permissões de cada perfil ficam nas
 * tabelas `perfis` e `perfil_permissoes` e vão para o navegador em /api/eu.
 */
export function criarAuth(banco: Banco, opcoes: Opcoes = {}) {
  const urlBase = opcoes.urlBase ?? process.env.BETTER_AUTH_URL ?? "http://localhost:5173";
  return betterAuth({
    database: banco.database as never,
    secret: opcoes.segredo ?? process.env.BETTER_AUTH_SECRET,
    baseURL: urlBase,
    basePath: "/api/auth",
    trustedOrigins: opcoes.origensConfiaveis ?? (process.env.APP_ORIGENS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [urlBase]),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !opcoes.permitirCadastro,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // Troca de senha derruba as outras sessões abertas daquele funcionário.
      revokeSessionsOnPasswordReset: true,
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    user: {
      additionalFields: {
        // true até a pessoa trocar a senha provisória no primeiro acesso.
        trocarSenha: { type: "boolean", required: false, defaultValue: true, input: false },
      },
    },
    plugins: [admin({ ac, roles: papeis, defaultRole: "mecanico", adminRoles: [PERFIL_ADMIN] })],
  });
}

export type Auth = ReturnType<typeof criarAuth>;
