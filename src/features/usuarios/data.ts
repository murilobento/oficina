import type { Usuario } from "./api";

export type UsuarioStatus = "Ativo" | "Senha provisória" | "Desativado";

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

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatarData = (iso: string) => formatoData.format(new Date(iso));
export const formatarDataHora = (iso: string | null) => (iso ? formatoDataHora.format(new Date(iso)) : "Nunca acessou");
