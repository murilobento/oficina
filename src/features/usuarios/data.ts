import type { Usuario } from "./api";

export type UsuarioStatus = "Ativo" | "Senha provisória" | "Desativado";

export function statusDoUsuario(usuario: Usuario): UsuarioStatus {
  if (!usuario.ativo) return "Desativado";
  return usuario.trocarSenha ? "Senha provisória" : "Ativo";
}

const formatoData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatarData = (iso: string) => formatoData.format(new Date(iso));
export const formatarDataHora = (iso: string | null) => (iso ? formatoDataHora.format(new Date(iso)) : "Nunca acessou");
