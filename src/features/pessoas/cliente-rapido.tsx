import { zodResolver } from "@hookform/resolvers/zod";
import { useEnvioUnico } from "@/lib/envio-unico";
import { BriefcaseBusiness, User } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useSalvarPessoa } from "@/features/pessoas/api";
import { z } from "zod";

import { CampoTexto } from "@/components/layout/campos-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { mascararTelefone, soDigitos, type TipoPessoa } from "@/features/pessoas/documento";
import { CLIENTES, type EntidadeConfig } from "@/features/pessoas/entidades";
import { FORM_VAZIO, paraPessoa } from "@/features/pessoas/tipos";

const esquema = z.object({
  tipo: z.enum(["PF", "PJ"]),
  nome: z.string().trim().min(1, "Informe o nome.").max(120, "No máximo 120 caracteres."),
  celular: z
    .string()
    .refine((valor) => valor === "" || [10, 11].includes(soDigitos(valor).length), "Telefone com DDD, como (11) 99999-0000."),
});
type Valores = z.infer<typeof esquema>;

/**
 * Cadastro rápido de cliente, para não sair do orçamento: tipo, nome e celular. O restante
 * (CPF/CNPJ, endereço...) se completa depois em Cadastro > Cliente. Quem usa deve trocar a
 * `key` a cada abertura, para o formulário começar limpo.
 */
export function ClienteRapido({
  aberto,
  nomeInicial,
  aoFechar,
  aoCriado,
  config = CLIENTES,
}: {
  aberto: boolean;
  nomeInicial: string;
  aoFechar: () => void;
  /** Recebe o id do cliente criado, para já ficar escolhido no orçamento. */
  aoCriado: (id: string) => void;
  /** Cliente (padrão) ou fornecedor. */
  config?: EntidadeConfig;
}) {
  const salvar = useSalvarPessoa(config.papel);
  const { enviando, enviar: enviarUnico } = useEnvioUnico();
  const form = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: { tipo: "PF", nome: nomeInicial, celular: "" },
  });
  const { control } = form;
  const tipo = useWatch({ control, name: "tipo" });

  // Este formulário fica dentro do painel do orçamento na árvore do React: sem o stopPropagation,
  // o envio "borbulharia" e também enviaria o orçamento.
  const enviar = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.stopPropagation();
    return enviarUnico(form, async (valores) => {
      let criado;
      try {
        criado = await salvar.mutateAsync({ dados: paraPessoa({ ...FORM_VAZIO, ...valores }) });
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível cadastrar. Tente de novo.");
        return;
      }
      toast.success(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} cadastrado. Complete os dados depois em Cadastro > ${config.singular[0].toUpperCase()}${config.singular.slice(1)}.`);
      aoCriado(criado.id);
      aoFechar();
    })(evento);
  };

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && aoFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo {config.singular}</DialogTitle>
          <DialogDescription>Cadastro rápido: só o essencial para seguir. O restante se completa depois no cadastro.</DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
          <Field className="gap-1.5">
            <FieldLabel id="cliente-rapido-tipo">Tipo de pessoa</FieldLabel>
            <div role="radiogroup" aria-labelledby="cliente-rapido-tipo" className="flex flex-wrap gap-2">
              {(["PF", "PJ"] as TipoPessoa[]).map((opcao) => (
                <Button
                  key={opcao}
                  type="button"
                  role="radio"
                  aria-checked={tipo === opcao}
                  variant={tipo === opcao ? "default" : "outline"}
                  onClick={() => form.setValue("tipo", opcao, { shouldDirty: true })}
                >
                  {opcao === "PF" ? <User /> : <BriefcaseBusiness />}
                  {opcao === "PF" ? "Pessoa física" : "Pessoa jurídica"}
                </Button>
              ))}
            </div>
          </Field>
          <CampoTexto
            control={control}
            prefixo="cliente-rapido"
            nome="nome"
            rotulo={tipo === "PF" ? "Nome completo" : "Razão social"}
          />
          <CampoTexto
            control={control}
            prefixo="cliente-rapido"
            nome="celular"
            rotulo="Celular (opcional)"
            inputMode="tel"
            placeholder="(11) 99999-0000"
            mascara={mascararTelefone}
          />
          <DialogFooter className="flex-row justify-end gap-2">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" carregando={enviando}>
              Cadastrar {config.singular}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
