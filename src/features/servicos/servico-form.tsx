import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CampoAtivo, CampoSelect, CampoTexto, CampoTextarea } from "@/components/layout/campos-form";
import { SecaoFormulario } from "@/components/layout/registro-partes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { mascararMoeda, mascararQuantidade, proximoCodigo } from "@/lib/numeros";

import { useServicosStore } from "./store";
import {
  CATEGORIAS_SERVICO,
  esquemaServico,
  FORM_VAZIO,
  paraFormulario,
  paraServico,
  type Servico,
  type ServicoFormValores,
} from "./tipos";

const PREFIXO = "servico";
const soDigitos = (valor: string) => valor.replace(/\D/g, "").slice(0, 7);

/**
 * Painel lateral de cadastro e edição de serviço. `servico` preenchido = edição; `null` = novo.
 * Quem usa deve trocar a `key` a cada abertura, para o formulário começar limpo.
 */
export function ServicoForm({
  aberto,
  servico,
  aoFechar,
}: {
  aberto: boolean;
  servico: Servico | null;
  aoFechar: () => void;
}) {
  const servicos = useServicosStore((estado) => estado.itens);
  const adicionar = useServicosStore((estado) => estado.adicionar);
  const atualizar = useServicosStore((estado) => estado.atualizar);

  const editando = servico !== null;
  const form = useForm<ServicoFormValores>({
    resolver: zodResolver(esquemaServico),
    defaultValues: servico ? paraFormulario(servico) : FORM_VAZIO,
  });
  const { control } = form;

  const enviar = form.handleSubmit((valores) => {
    const dados = paraServico(valores);
    if (dados.codigo === "") dados.codigo = proximoCodigo("SRV", servicos.map((item) => item.codigo), 3);

    const outroComCodigo = servicos.find((item) => item.id !== servico?.id && item.codigo === dados.codigo);
    if (outroComCodigo) {
      form.setError("codigo", { message: `Este código já é do serviço ${outroComCodigo.descricao}.` }, { shouldFocus: true });
      return;
    }

    if (servico) {
      atualizar(servico.id, dados);
      toast.success("Serviço atualizado.");
    } else {
      adicionar(dados);
      toast.success("Serviço cadastrado.");
    }
    aoFechar();
  });

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-xl!">
        <SheetHeader className="border-b">
          <SheetTitle>{editando ? "Editar serviço" : "Novo serviço"}</SheetTitle>
          <SheetDescription>Só a descrição e a categoria são obrigatórias.</SheetDescription>
        </SheetHeader>

        <form noValidate onSubmit={enviar} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-8 overflow-y-auto p-4">
            <SecaoFormulario titulo="Identificação">
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="descricao"
                  rotulo="Descrição"
                  className="sm:col-span-2"
                  placeholder="Ex.: Troca de pastilhas de freio"
                />
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="codigo"
                  rotulo="Código interno (opcional)"
                  descricao="Em branco, o sistema gera (SRV-001)."
                />
                <CampoSelect
                  control={control}
                  prefixo={PREFIXO}
                  nome="categoria"
                  rotulo="Categoria"
                  opcoes={CATEGORIAS_SERVICO}
                />
              </div>
            </SecaoFormulario>

            <SecaoFormulario titulo="Valor e tempo" descricao="Valores padrão: cada orçamento pode ajustar.">
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="valor"
                  rotulo="Valor da mão de obra (R$)"
                  inputMode="numeric"
                  placeholder="0,00"
                  mascara={mascararMoeda}
                />
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="tempoHoras"
                  rotulo="Tempo estimado (horas)"
                  descricao="Ex.: 1,5 é uma hora e meia."
                  inputMode="decimal"
                  placeholder="0"
                  mascara={mascararQuantidade}
                />
              </div>
            </SecaoFormulario>

            <SecaoFormulario titulo="Garantia" descricao="Deixe em branco se o serviço não tem garantia.">
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="garantiaDias"
                  rotulo="Garantia (dias)"
                  inputMode="numeric"
                  placeholder="90"
                  mascara={soDigitos}
                />
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="garantiaKm"
                  rotulo="Garantia (km)"
                  inputMode="numeric"
                  placeholder="3000"
                  mascara={soDigitos}
                />
              </div>
            </SecaoFormulario>

            <SecaoFormulario titulo="Outras informações">
              <div className="flex flex-col gap-5">
                <CampoTextarea
                  control={control}
                  prefixo={PREFIXO}
                  nome="observacoes"
                  rotulo="Observações (opcional)"
                  linhas={3}
                />
                <CampoAtivo
                  control={control}
                  prefixo={PREFIXO}
                  nome="ativo"
                  titulo="Serviço ativo"
                  descricao="Inativo continua no histórico, mas deixa de aparecer para novos orçamentos."
                />
              </div>
            </SecaoFormulario>
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none">
              {editando ? "Salvar alterações" : "Cadastrar serviço"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
