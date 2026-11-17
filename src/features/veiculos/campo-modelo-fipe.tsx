import { useState } from "react";

import { type Control, Controller, type UseFormReturn } from "react-hook-form";

import { CampoTexto } from "@/components/layout/campos-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

import { CampoBusca } from "./campo-busca";
import { combustivelDoModelo, modeloCompleto, motorDoModelo, useMarcasFipe, useModelosFipe } from "./fipe";
import type { VeiculoFormValores } from "./tipos";

/**
 * Marca e modelo do veículo: escolhe nas listas da tabela FIPE (marca → modelo) ou, quando o carro
 * não está lá (ou a lista está fora do ar), digita como antes. Ao escolher o modelo, sugere a
 * motorização e o combustível se esses campos ainda estiverem vazios. O valor guardado continua
 * sendo o texto "Marca Modelo" do campo `modelo`.
 */
export function CampoModeloFipe({
  form,
  prefixo,
  emEdicao,
}: {
  form: UseFormReturn<VeiculoFormValores>;
  prefixo: string;
  emEdicao: boolean;
}) {
  // Veículo já cadastrado abre com o texto atual para não perder o que existe; "Escolher da lista" troca.
  const [digitando, setDigitando] = useState(emEdicao);
  const [marca, setMarca] = useState({ codigo: "", nome: "" });
  const [modelo, setModelo] = useState({ codigo: "", nome: "" });

  const marcas = useMarcasFipe();
  const modelos = useModelosFipe(marca.codigo);
  const listaForaDoAr = marcas.isError;

  function escolherModelo(item: { codigo: string; nome: string }) {
    setModelo(item);
    form.setValue("modelo", modeloCompleto(marca.nome, item.nome), { shouldDirty: true, shouldValidate: true });
    // Sugestões: só preenche o que ainda está vazio, para não passar por cima do que a pessoa digitou.
    const motor = motorDoModelo(item.nome);
    if (motor && form.getValues("motor") === "") form.setValue("motor", motor, { shouldDirty: true });
    const combustivel = combustivelDoModelo(item.nome);
    if (combustivel && form.getValues("combustivel") === "") form.setValue("combustivel", combustivel, { shouldDirty: true });
  }

  if (digitando || listaForaDoAr) {
    return (
      <div className="flex flex-col gap-2 sm:col-span-2">
        <CampoTexto control={form.control as Control<VeiculoFormValores>} prefixo={prefixo} nome="modelo" rotulo="Marca e modelo" placeholder="Ex.: Hyundai HB20 1.0" />
        {listaForaDoAr ? (
          <p className="text-muted-foreground text-sm">A lista de marcas está indisponível agora. Digite a marca e o modelo.</p>
        ) : (
          <Button type="button" variant="link" className="h-auto self-start p-0" onClick={() => setDigitando(false)}>
            Escolher da lista
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="gap-1.5">
          <FieldLabel htmlFor={`${prefixo}-marca`}>Marca</FieldLabel>
          <CampoBusca
            id={`${prefixo}-marca`}
            valor={marca.codigo}
            opcoes={marcas.data ?? []}
            placeholder="Escolha a marca"
            carregando={marcas.isPending}
            aoEscolher={(item) => {
              setMarca(item);
              setModelo({ codigo: "", nome: "" });
              form.setValue("modelo", "", { shouldDirty: true });
            }}
          />
        </Field>
        <Controller
          control={form.control}
          name="modelo"
          render={({ fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${prefixo}-modelo-lista`}>Modelo</FieldLabel>
              <CampoBusca
                id={`${prefixo}-modelo-lista`}
                valor={modelo.codigo}
                opcoes={modelos.data ?? []}
                placeholder={marca.codigo === "" ? "Escolha a marca primeiro" : "Escolha o modelo"}
                carregando={marca.codigo !== "" && modelos.isPending}
                desabilitado={marca.codigo === ""}
                aoEscolher={escolherModelo}
              />
              {modelos.isError && <FieldDescription>{modelos.error.message}</FieldDescription>}
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
      <Button type="button" variant="link" className="h-auto self-start p-0" onClick={() => setDigitando(true)}>
        Não achei: digitar marca e modelo
      </Button>
    </div>
  );
}
