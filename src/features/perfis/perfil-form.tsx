import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PERMISSOES, type Permissao } from "@/features/auth/permissoes";

import { MODULOS, moduloDaPermissao, type PerfilAcesso } from "./data";

const CHAVES = Object.keys(PERMISSOES) as [Permissao, ...Permissao[]];

// O mesmo esquema valida o formulário aqui e, depois, a entrada no servidor.
const esquema = z.object({
  nome: z.string().trim().min(3, { message: "Informe o nome do perfil." }),
  descricao: z.string().trim(),
  permissoes: z.array(z.enum(CHAVES)),
});

export type PerfilFormValores = z.infer<typeof esquema>;

const VAZIO: PerfilFormValores = { nome: "", descricao: "", permissoes: [] };

export function PerfilForm({
  aberto,
  perfil,
  nomesEmUso,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  /** Perfil em edição; `null` = perfil novo. */
  perfil: PerfilAcesso | null;
  /** Nomes de outros perfis, para barrar duplicidade. */
  nomesEmUso: string[];
  aoFechar: () => void;
  aoSalvar: (valores: PerfilFormValores) => void;
}) {
  const editando = perfil !== null;
  const protegido = perfil?.protegido ?? false;
  const form = useForm<PerfilFormValores>({ resolver: zodResolver(esquema), defaultValues: VAZIO });

  useEffect(() => {
    if (!aberto) return;
    form.reset(
      perfil
        ? { nome: perfil.nome, descricao: perfil.descricao, permissoes: perfil.permissoes }
        : VAZIO,
    );
  }, [aberto, perfil, form]);

  const enviar = form.handleSubmit((valores) => {
    if (nomesEmUso.includes(valores.nome.toLowerCase())) {
      form.setError("nome", { message: "Já existe um perfil com este nome." });
      return;
    }
    aoSalvar(protegido ? { ...valores, permissoes: [...CHAVES] } : valores);
  });

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{editando ? "Editar perfil" : "Novo perfil"}</SheetTitle>
          <SheetDescription>
            {protegido
              ? "Este perfil é protegido: as permissões ficam sempre todas marcadas."
              : "Marque o que quem tem este perfil pode fazer."}
          </SheetDescription>
        </SheetHeader>

        <form noValidate onSubmit={enviar} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <FieldGroup className="gap-6">
              <Controller
                control={form.control}
                name="nome"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="perfil-nome">Nome</FieldLabel>
                    <Input
                      {...field}
                      id="perfil-nome"
                      autoComplete="off"
                      className="h-11"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="perfil-descricao">Descrição</FieldLabel>
                    <Input {...field} id="perfil-descricao" autoComplete="off" className="h-11" />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="permissoes"
                render={({ field }) => (
                  <Field className="gap-3">
                    <FieldLabel>Permissões</FieldLabel>

                    {MODULOS.map((modulo) => {
                      const chaves = CHAVES.filter((chave) => moduloDaPermissao(chave) === modulo.id);
                      if (chaves.length === 0) return null;
                      const todasMarcadas = chaves.every((chave) => field.value.includes(chave));

                      return (
                        <div key={modulo.id} className="overflow-hidden rounded-lg border">
                          <div className="bg-muted/40 flex items-center justify-between gap-2 px-3 py-2">
                            <span className="text-sm font-medium">{modulo.nome}</span>
                            {!protegido && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  field.onChange(
                                    todasMarcadas
                                      ? field.value.filter((item) => !chaves.includes(item))
                                      : Array.from(new Set([...field.value, ...chaves])),
                                  )
                                }
                              >
                                {todasMarcadas ? "Desmarcar" : "Marcar todas"}
                              </Button>
                            )}
                          </div>
                          <div className="divide-y">
                            {chaves.map((chave) => (
                              <label
                                key={chave}
                                htmlFor={`perfil-permissao-${chave}`}
                                className="hover:bg-muted/50 flex min-h-12 cursor-pointer items-center gap-3 px-3 text-sm"
                              >
                                <Checkbox
                                  id={`perfil-permissao-${chave}`}
                                  disabled={protegido}
                                  checked={field.value.includes(chave)}
                                  onCheckedChange={(checked) =>
                                    field.onChange(
                                      checked === true
                                        ? [...field.value, chave]
                                        : field.value.filter((item) => item !== chave),
                                    )
                                  }
                                />
                                <span>{PERMISSOES[chave]}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    <FieldDescription>Quem não tem a permissão não vê o módulo nem seus botões.</FieldDescription>
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
              {editando ? "Salvar alterações" : "Criar perfil"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
