// DADOS DE EXEMPLO. Esta tela é um protótipo para avaliar a listagem e os formulários:
// os funcionários abaixo são fictícios e as alterações valem só até recarregar a página.
// Quando o login estiver pronto, este arquivo é substituído pelas consultas à API (Better Auth).

import { perfisIniciais, type PerfilAcesso } from "@/features/perfis/data";

export type Perfil = PerfilAcesso;

export type UsuarioStatus = "Ativo" | "Senha provisória" | "Desativado";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfilId: string;
  ativo: boolean;
  /** true enquanto a pessoa ainda não trocou a senha provisória. */
  trocarSenha: boolean;
  criadoEm: string;
  ultimoAcesso: string | null;
};

export const perfis: Perfil[] = perfisIniciais;

const u = (
  id: number,
  nome: string,
  perfilId: string,
  criadoEm: string,
  ultimoAcesso: string | null,
  extra: Partial<Usuario> = {},
): Usuario => ({
  id: `u${id}`,
  nome,
  email: `${nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(" ")
    .filter((_, i, partes) => i === 0 || i === partes.length - 1)
    .join(".")}@exemplo.com.br`,
  perfilId,
  ativo: true,
  trocarSenha: false,
  criadoEm,
  ultimoAcesso,
  ...extra,
});

export const usuariosIniciais: Usuario[] = [
  u(1, "Ana Exemplo Souza", "administrador", "2026-01-12T09:10:00", "2026-11-13T08:02:00"),
  u(2, "Bruno Exemplo Lima", "gerencia", "2026-01-12T09:25:00", "2026-11-12T17:40:00"),
  u(3, "Carla Exemplo Rocha", "recepcao", "2026-02-03T14:00:00", "2026-11-13T07:15:00"),
  u(4, "Diego Exemplo Alves", "mecanico", "2026-02-03T14:20:00", "2026-11-11T16:05:00"),
  u(5, "Elisa Exemplo Prado", "recepcao", "2026-02-10T10:00:00", "2026-11-13T09:30:00"),
  u(6, "Fábio Exemplo Nunes", "mecanico", "2026-03-01T08:45:00", "2026-11-12T11:20:00"),
  u(7, "Gabriela Exemplo Dias", "mecanico", "2026-03-15T13:30:00", "2026-10-02T15:00:00", { ativo: false }),
  u(8, "Hugo Exemplo Teles", "mecanico", "2026-11-10T16:30:00", null, { trocarSenha: true }),
];

export function statusDoUsuario(usuario: Usuario): UsuarioStatus {
  if (!usuario.ativo) return "Desativado";
  return usuario.trocarSenha ? "Senha provisória" : "Ativo";
}

export const statusMeta: Record<UsuarioStatus, { badgeClass: string; dotClass: string }> = {
  Ativo: {
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  "Senha provisória": {
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  Desativado: {
    badgeClass: "border-border bg-muted/50 text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
};

export const perfilPorId = (id: string) => perfis.find((perfil) => perfil.id === id);

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatarData = (iso: string) => formatoData.format(new Date(iso));
export const formatarDataHora = (iso: string | null) => (iso ? formatoDataHora.format(new Date(iso)) : "Nunca acessou");

/** Senha provisória aleatória (PRD RF-03). No sistema real ela é gerada no servidor. */
export function gerarSenhaProvisoria(tamanho = 14): string {
  // Sem caracteres que se confundem ao ditar ou copiar: 0/O, 1/l/I.
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#@%&";
  const bytes = crypto.getRandomValues(new Uint32Array(tamanho));
  return Array.from(bytes, (n) => alfabeto[n % alfabeto.length]).join("");
}
