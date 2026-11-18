import { useState } from "react";

import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LOGIN_ATIVO, useSessao } from "@/features/auth/sessao";
import { useEmpresa } from "@/features/empresa/api";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  // Quem já está logado não precisa ver o login de novo.
  beforeLoad: async () => {
    if (!LOGIN_ATIVO) return;
    const eu = await useSessao.getState().carregar();
    if (eu && eu !== "sem-conexao") throw redirect({ to: eu.trocarSenha ? "/trocar-senha" : "/" });
  },
  component: Login,
});

const ANO = new Date().getFullYear();

function Login() {
  const empresa = useEmpresa();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!LOGIN_ATIVO || entrando) return;
    if (email.trim() === "" || senha === "") {
      setErro("Informe o e-mail e a senha.");
      return;
    }
    setEntrando(true);
    setErro("");
    const { error } = await authClient.signIn.email({ email: email.trim(), password: senha });
    if (error) {
      // Mesma mensagem para e-mail inexistente e senha errada: não revela quem tem cadastro.
      setErro(error.status === 403 ? "Este acesso está desativado. Fale com o administrador." : "E-mail ou senha incorretos.");
      setEntrando(false);
      return;
    }
    const eu = await useSessao.getState().carregar();
    await navigate({ to: eu && eu !== "sem-conexao" && eu.trocarSenha ? "/trocar-senha" : "/" });
  }

  const logo = empresa.logo ? (
    <img src={empresa.logo} alt={`Logo ${empresa.nomeFantasia}`} className="size-14 rounded-md bg-white object-contain p-1" />
  ) : (
    <Building2 className="text-primary size-10" />
  );

  return (
    <main className="bg-sidebar text-sidebar-foreground relative min-h-dvh overflow-hidden">
      {/* Grade técnica ao fundo, no estilo de prancheta de oficina. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      />
      <div className="relative mx-auto grid min-h-dvh max-w-5xl items-center gap-10 p-4 lg:grid-cols-2 lg:p-10">
        <div className="space-y-4 pt-6 lg:pt-0">
          {logo}
          <h1 className="font-display text-4xl leading-none font-extrabold uppercase">{empresa.nomeFantasia}</h1>
          <p className="text-sidebar-foreground/70 text-sm">Sistema de gestão da oficina.</p>
          <div className="hidden gap-6 pt-6 lg:grid">
            <div className="border-primary space-y-1 border-l-[3px] pl-3">
              <h2 className="font-display text-xs font-bold tracking-widest uppercase">Primeiro acesso?</h2>
              <p className="text-sidebar-foreground/70 text-sm">Use a senha provisória informada pelo administrador. Você vai trocá-la ao entrar.</p>
            </div>
            <div className="border-primary space-y-1 border-l-[3px] pl-3">
              <h2 className="font-display text-xs font-bold tracking-widest uppercase">Esqueceu a senha?</h2>
              <p className="text-sidebar-foreground/70 text-sm">Peça ao administrador do sistema uma nova senha provisória.</p>
            </div>
          </div>
        </div>

        <div className="bg-card text-card-foreground w-full rounded-md border-t-4 border-t-primary p-6 shadow-lg lg:max-w-sm lg:justify-self-end">
          <div className="mb-6 space-y-1">
            <h2 className="font-display text-3xl leading-none font-extrabold uppercase">Entrar</h2>
            <p className="text-muted-foreground text-sm">Informe seu e-mail e sua senha.</p>
          </div>
          <form noValidate onSubmit={entrar} className="flex flex-col gap-4">
            <FieldGroup className="gap-4">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="login-email">E-mail</FieldLabel>
                <Input id="login-email" type="email" className="h-12" placeholder="voce@dtconstrutora.com" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={erro !== ""} />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="login-senha">Senha</FieldLabel>
                <Input id="login-senha" type="password" className="h-12" placeholder="••••••••" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} aria-invalid={erro !== ""} />
              </Field>
            </FieldGroup>
            {erro && (
              <p role="alert" className="text-destructive text-sm">
                {erro}
              </p>
            )}
            <Button className="h-12 w-full" type="submit" disabled={!LOGIN_ATIVO || entrando}>
              {entrando ? "Entrando..." : "Entrar"}
            </Button>
            {!LOGIN_ATIVO && (
              <p className="text-muted-foreground text-center text-xs">
                Login ainda não ativado neste ambiente. <Link to="/">Abrir o sistema de exemplo</Link>
              </p>
            )}
          </form>
          <p className="text-muted-foreground mt-6 font-mono text-xs">© {ANO} {empresa.nomeFantasia}</p>
        </div>
      </div>
    </main>
  );
}
