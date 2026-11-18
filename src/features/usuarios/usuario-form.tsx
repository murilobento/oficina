import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { useEnvioUnico } from "@/lib/envio-unico";
import { usePerfis } from "@/features/perfis/api";

import type { Usuario } from "./api";

// A API valida de novo (e-mail repetido, perfil, permissões); aqui só o básico, para avisar na hora.
const esquema = z.object({
  nome: z.string().trim().min(3, { message: "Informe o nome completo." }),
  email: z.string().trim().pipe(z.email({ message: "Informe um e-mail válido." })),
  perfilId: z.string().min(1, { message: "Escolha um perfil." }),
});

export type UsuarioFormValores = z.infer<typeof esquema>;

const VAZIO: UsuarioFormValores = { nome: "", email: "", perfilId: "" };

export function UsuarioForm({
  aberto,
  usuario,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  /** Usuário em edição; `null` = cadastro novo. */
  usuario: Usuario | null;
  aoFechar: () => void;
  /** Grava na API; se falhar, lança o erro e o formulário mostra a mensagem. */
  aoSalvar: (valores: UsuarioFormValores) => Promise<void>;
}) {
  const editando = usuario !== null;
  const perfis = usePerfis();
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


  const { enviando, enviar: enviarUnico } = useEnvioUnico();
  const enviar = enviarUnico(form, async (valores) => {
    try {
      await aoSalvar({ ...valores, email: valores.email.toLowerCase() });
    } catch (erro) {
      const campos = (erro as { campos?: Record<string, string> }).campos ?? {};
      for (const [campo, texto] of Object.entries(campos)) form.setError(campo as keyof UsuarioFormValores, { message: texto }, { shouldFocus: true });
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar. Tente de novo.");
    }
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
            <Button type="submit" className="flex-1 sm:flex-none" disabled={enviando}>
              {enviando ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar funcionário"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
