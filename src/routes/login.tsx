import { useState } from "react";

import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LOGIN_ATIVO, useSessao } from "@/features/auth/sessao";
import { useEmpresa } from "@/features/empresa/store";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  // Quem já está logado não precisa ver o login de novo.
  beforeLoad: async () => {
    if (!LOGIN_ATIVO) return;
    const eu = await useSessao.getState().carregar();
    if (eu) throw redirect({ to: eu.trocarSenha ? "/trocar-senha" : "/" });
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
    await navigate({ to: eu?.trocarSenha ? "/trocar-senha" : "/" });
  }

  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="bg-primary relative order-2 hidden h-full rounded-3xl lg:flex">
          <div className="text-primary-foreground absolute top-10 space-y-1 px-10">
            {empresa.logo ? (
              <img src={empresa.logo} alt={`Logo ${empresa.nomeFantasia}`} className="size-14 rounded-xl bg-white object-contain p-1" />
            ) : (
              <Building2 className="size-10" />
            )}
            <h1 className="text-2xl font-medium">{empresa.nomeFantasia}</h1>
            <p className="text-sm">Sistema de gestão da oficina.</p>
          </div>

          <div className="absolute bottom-10 flex w-full justify-between px-10">
            <div className="text-primary-foreground flex-1 space-y-1">
              <h2 className="font-medium">Primeiro acesso?</h2>
              <p className="text-sm">Use a senha provisória informada pelo administrador. Você vai trocá-la ao entrar.</p>
            </div>
            <Separator orientation="vertical" className="mx-3 h-auto!" />
            <div className="text-primary-foreground flex-1 space-y-1">
              <h2 className="font-medium">Esqueceu a senha?</h2>
              <p className="text-sm">Peça ao administrador do sistema uma nova senha provisória.</p>
            </div>
          </div>
        </div>

        <div className="relative order-1 flex h-full">
          <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-medium">Entrar</h1>
              <p className="text-muted-foreground text-sm">Informe seu e-mail e sua senha.</p>
            </div>
            <form noValidate onSubmit={entrar} className="flex flex-col gap-4">
              <FieldGroup className="gap-4">
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="login-email">E-mail</FieldLabel>
                  <Input id="login-email" type="email" placeholder="voce@dtconstrutora.com" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={erro !== ""} />
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="login-senha">Senha</FieldLabel>
                  <Input id="login-senha" type="password" placeholder="••••••••" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} aria-invalid={erro !== ""} />
                </Field>
              </FieldGroup>
              {erro && (
                <p role="alert" className="text-destructive text-center text-sm">
                  {erro}
                </p>
              )}
              <Button className="w-full" type="submit" disabled={!LOGIN_ATIVO || entrando}>
                {entrando ? "Entrando..." : "Entrar"}
              </Button>
              {!LOGIN_ATIVO && (
                <p className="text-muted-foreground text-center text-xs">
                  Login ainda não ativado neste ambiente. <Link to="/">Abrir o sistema de exemplo</Link>
                </p>
              )}
            </form>
          </div>

          <div className="absolute bottom-5 flex w-full justify-between px-10">
            <div className="text-sm">© {ANO} {empresa.nomeFantasia}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
