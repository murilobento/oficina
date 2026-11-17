import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useSalvarVeiculo } from "./api";
import { z } from "zod";

import { CampoTexto } from "@/components/layout/campos-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { esquemaVeiculo, FORM_VAZIO, mascararPlaca, paraVeiculo } from "./tipos";

const esquema = esquemaVeiculo.pick({ modelo: true, placa: true, ano: true, cor: true, km: true });
type Valores = z.infer<typeof esquema>;

const soDigitos = (limite: number) => (valor: string) => valor.replace(/\D/g, "").slice(0, limite);

/**
 * Cadastro rápido de veículo para um cliente, sem sair do orçamento. Combustível, câmbio e
 * motorização se completam depois em Cadastro > Veículo. Quem usa deve trocar a `key` a cada
 * abertura, para o formulário começar limpo.
 */
export function VeiculoRapido({
  aberto,
  clienteId,
  aoFechar,
  aoCriado,
}: {
  aberto: boolean;
  clienteId: string;
  aoFechar: () => void;
  /** Recebe o veículo criado, para já ficar escolhido no orçamento. */
  aoCriado: (id: string, km: number) => void;
}) {
  const salvar = useSalvarVeiculo();
  const form = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: { modelo: "", placa: "", ano: "", cor: "", km: "" },
  });
  const { control } = form;

  // Fica dentro do painel do orçamento na árvore do React: sem o stopPropagation o envio
  // "borbulharia" e também enviaria o orçamento.
  const enviar = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.stopPropagation();
    return form.handleSubmit(async (valores) => {
      let criado;
      try {
        criado = await salvar.mutateAsync({ dados: paraVeiculo({ ...FORM_VAZIO, ...valores, clienteId }) });
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível cadastrar. Tente de novo.");
        return;
      }
      toast.success("Veículo cadastrado. Complete os dados depois em Cadastro > Veículo.");
      aoCriado(criado.id, criado.km);
      aoFechar();
    })(evento);
  };

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && aoFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo veículo</DialogTitle>
          <DialogDescription>Cadastro rápido do carro deste cliente.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            control={control}
            prefixo="veiculo-rapido"
            nome="modelo"
            rotulo="Marca e modelo"
            placeholder="Ex.: Hyundai HB20 1.0"
            className="sm:col-span-2"
          />
          <CampoTexto control={control} prefixo="veiculo-rapido" nome="placa" rotulo="Placa (opcional)" placeholder="ABC-1D23" mascara={mascararPlaca} />
          <CampoTexto control={control} prefixo="veiculo-rapido" nome="ano" rotulo="Ano (opcional)" inputMode="numeric" placeholder="2019" mascara={soDigitos(4)} />
          <CampoTexto control={control} prefixo="veiculo-rapido" nome="cor" rotulo="Cor (opcional)" />
          <CampoTexto control={control} prefixo="veiculo-rapido" nome="km" rotulo="Km atual (opcional)" inputMode="numeric" placeholder="48200" mascara={soDigitos(7)} />
          <DialogFooter className="flex-row justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none">
              Cadastrar veículo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
