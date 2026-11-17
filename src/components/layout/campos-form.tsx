import type { ComponentProps } from "react";

import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Campos de formulário padrão dos cadastros (rótulo + entrada + erro), ligados ao react-hook-form.
// `prefixo` evita ids repetidos quando há dois formulários na mesma tela.

type Base<T extends FieldValues> = {
  control: Control<T>;
  nome: Path<T>;
  prefixo: string;
  rotulo: string;
  descricao?: string;
  className?: string;
};

export function CampoTexto<T extends FieldValues>({
  control,
  nome,
  prefixo,
  rotulo,
  descricao,
  mascara,
  className,
  ...entrada
}: Base<T> & {
  mascara?: (valor: string) => string;
} & Pick<ComponentProps<"input">, "inputMode" | "placeholder" | "maxLength">) {
  const id = `${prefixo}-${nome}`;
  return (
    <Controller
      control={control}
      name={nome}
      render={({ field, fieldState }) => (
        <Field className={cn("gap-1.5", className)} data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{rotulo}</FieldLabel>
          <Input
            autoComplete="off"
            {...entrada}
            id={id}
            name={field.name}
            ref={field.ref}
            value={typeof field.value === "string" ? field.value : ""}
            onBlur={field.onBlur}
            onChange={(evento) => field.onChange(mascara ? mascara(evento.target.value) : evento.target.value)}
            aria-invalid={fieldState.invalid}
          />
          {descricao && <FieldDescription>{descricao}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export function CampoSelect<T extends FieldValues>({
  control,
  nome,
  prefixo,
  rotulo,
  descricao,
  className,
  opcoes,
  placeholder = "Selecione",
}: Base<T> & { opcoes: { valor: string; texto: string }[]; placeholder?: string }) {
  const id = `${prefixo}-${nome}`;
  return (
    <Controller
      control={control}
      name={nome}
      render={({ field, fieldState }) => (
        <Field className={cn("gap-1.5", className)} data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{rotulo}</FieldLabel>
          <NativeSelect
            id={id}
            className="w-full"
            name={field.name}
            ref={field.ref}
            value={typeof field.value === "string" ? field.value : ""}
            onBlur={field.onBlur}
            onChange={field.onChange}
            aria-invalid={fieldState.invalid}
          >
            <NativeSelectOption value="">{placeholder}</NativeSelectOption>
            {opcoes.map((opcao) => (
              <NativeSelectOption key={opcao.valor} value={opcao.valor}>
                {opcao.texto}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {descricao && <FieldDescription>{descricao}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export function CampoTextarea<T extends FieldValues>({
  control,
  nome,
  prefixo,
  rotulo,
  descricao,
  className,
  linhas = 3,
}: Base<T> & { linhas?: number }) {
  const id = `${prefixo}-${nome}`;
  return (
    <Controller
      control={control}
      name={nome}
      render={({ field, fieldState }) => (
        <Field className={cn("gap-1.5", className)} data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{rotulo}</FieldLabel>
          <Textarea
            id={id}
            name={field.name}
            ref={field.ref}
            value={typeof field.value === "string" ? field.value : ""}
            onBlur={field.onBlur}
            onChange={field.onChange}
            rows={linhas}
          />
          {descricao && <FieldDescription>{descricao}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

/** Chave "ativo/inativo" no fim do formulário. */
export function CampoAtivo<T extends FieldValues>({
  control,
  nome,
  prefixo,
  titulo,
  descricao,
}: Pick<Base<T>, "control" | "nome" | "prefixo"> & { titulo: string; descricao: string }) {
  const id = `${prefixo}-${nome}`;
  return (
    <Controller
      control={control}
      name={nome}
      render={({ field }) => (
        <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{titulo}</span>
            <span className="text-muted-foreground text-sm">{descricao}</span>
          </span>
          <Switch id={id} checked={field.value === true} onCheckedChange={field.onChange} />
        </label>
      )}
    />
  );
}
