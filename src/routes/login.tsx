import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useEmpresa } from "@/features/empresa/store";

export const Route = createFileRoute("/login")({ component: Login });

const ANO = new Date().getFullYear();

// Etapa 1.0: apenas o visual (layout "auth v2" do template). O login de verdade entra na etapa 1.1.
function Login() {
  const empresa = useEmpresa();
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
            <form noValidate onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
              <FieldGroup className="gap-4">
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="login-email">E-mail</FieldLabel>
                  <Input id="login-email" type="email" placeholder="voce@dtconstrutora.com" autoComplete="username" />
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="login-senha">Senha</FieldLabel>
                  <Input id="login-senha" type="password" placeholder="••••••••" autoComplete="current-password" />
                </Field>
              </FieldGroup>
              <Button className="w-full" type="submit" disabled>
                Entrar
              </Button>
              <p className="text-muted-foreground text-center text-xs">Login ainda não ativado.</p>
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
