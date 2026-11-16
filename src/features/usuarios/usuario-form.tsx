import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { perfis, type Usuario } from "./data";

// O mesmo esquema valida o formulário aqui e, depois, a entrada da Edge Function no servidor.
const esquema = z.object({
  nome: z.string().trim().min(3, { message: "Informe o nome completo." }),
  email: z.email({ message: "Informe um e-mail válido." }),
  perfilId: z.string().min(1, { message: "Escolha um perfil." }),
});

export type UsuarioFormValores = z.infer<typeof esquema>;

const VAZIO: UsuarioFormValores = { nome: "", email: "", perfilId: "" };

export function UsuarioForm({
  aberto,
  usuario,
  emailsEmUso,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  /** Usuário em edição; `null` = cadastro novo. */
  usuario: Usuario | null;
  /** E-mails de outros usuários, para barrar duplicidade. */
  emailsEmUso: string[];
  aoFechar: () => void;
  aoSalvar: (valores: UsuarioFormValores) => void;
}) {
  const editando = usuario !== null;
  const form = useForm<UsuarioFormValores>({ resolver: zodResolver(esquema), defaultValues: VAZIO });

  // Ao abrir, carrega os dados do usuário em edição (ou limpa, no cadastro novo).
  useEffect(() => {
    if (!aberto) return;
    form.reset(
      usuario
        ? { nome: usuario.nome, email: usuario.email, perfilId: usuario.perfilId }
        : VAZIO,
    );
  }, [aberto, usuario, form]);


  const enviar = form.handleSubmit((valores) => {
    if (emailsEmUso.includes(valores.email.toLowerCase())) {
      form.setError("email", { message: "Já existe um funcionário com este e-mail." });
      return;
    }
    aoSalvar({ ...valores, email: valores.email.toLowerCase() });
  });

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{editando ? "Editar funcionário" : "Novo funcionário"}</SheetTitle>
          <SheetDescription>
            {editando
              ? "Altere os dados ou o perfil."
              : "Ao salvar, o sistema gera uma senha provisória para você repassar à pessoa."}
          </SheetDescription>
        </SheetHeader>

        <form noValidate onSubmit={enviar} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <FieldGroup className="gap-5">
              <Controller
                control={form.control}
                name="nome"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="usuario-nome">Nome completo</FieldLabel>
                    <Input {...field} id="usuario-nome" autoComplete="off" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="usuario-email">E-mail</FieldLabel>
                    <Input
                      {...field}
                      id="usuario-email"
                      type="email"
                      autoComplete="off"
                      placeholder="nome@exemplo.com.br"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>É o que a pessoa usa para entrar no sistema.</FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="perfilId"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="usuario-perfil">Perfil</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="usuario-perfil" className="w-full" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Escolha um perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {perfis.map((perfil) => (
                            <SelectItem key={perfil.id} value={perfil.id}>
                              {perfil.nome}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>Define o que a pessoa pode ver e fazer.</FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

            </FieldGroup>
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none">
              {editando ? "Salvar alterações" : "Cadastrar funcionário"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
