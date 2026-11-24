import { usePessoas } from "@/features/pessoas/api";
import { useEnvioUnico } from "@/lib/envio-unico";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { usePode } from "@/features/auth/sessao";

import { useSalvarProduto } from "./api";

import {
  CampoAtivo,
  CampoSelect,
  CampoTexto,
  CampoTextarea,
} from "@/components/layout/campos-form";
import { SecaoFormulario } from "@/components/layout/registro-partes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  margemSobreCusto,
  mascararMoeda,
  mascararQuantidade,
  textoParaCentavos,
} from "@/lib/numeros";

import {
  CATEGORIAS_PRODUTO,
  esquemaProduto,
  FORM_VAZIO,
  mascararNCM,
  paraFormulario,
  paraProduto,
  type Produto,
  type ProdutoFormValores,
  UNIDADES,
} from "./tipos";

const PREFIXO = "produto";

/**
 * Painel lateral de cadastro e edição de produto. `produto` preenchido = edição; `null` = novo.
 * Quem usa deve trocar a `key` a cada abertura, para o formulário começar limpo.
 */
export function ProdutoForm({
  aberto,
  produto,
  aoFechar,
}: {
  aberto: boolean;
  produto: Produto | null;
  aoFechar: () => void;
}) {
  const salvar = useSalvarProduto();
  const podeVerValores = usePode("valores.ver");
  const fornecedores = usePessoas("fornecedor");

  const editando = produto !== null;
  const { enviando, enviar: enviarUnico } = useEnvioUnico();
  const form = useForm<ProdutoFormValores>({
    resolver: zodResolver(esquemaProduto),
    defaultValues: produto ? paraFormulario(produto) : FORM_VAZIO,
  });
  const { control } = form;
  const [custo, venda] = useWatch({ control, name: ["custo", "venda"] });
  const margem = margemSobreCusto(textoParaCentavos(custo), textoParaCentavos(venda));

  // Fornecedores ativos; o já escolhido continua na lista mesmo se foi inativado depois.
  const opcoesFornecedor = fornecedores
    .filter((fornecedor) => fornecedor.ativo || fornecedor.id === produto?.fornecedorId)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((fornecedor) => ({ valor: fornecedor.id, texto: fornecedor.nome }));

  const enviar = enviarUnico(form, async (valores) => {
    try {
      await salvar.mutateAsync({ id: produto?.id, dados: paraProduto(valores) });
    } catch (erro) {
      const campos = (erro as { campos?: Record<string, string> }).campos ?? {};
      const primeiro = Object.keys(campos)[0];
      for (const [campo, texto] of Object.entries(campos)) {
        form.setError(campo as keyof ProdutoFormValores, { message: texto }, { shouldFocus: campo === primeiro });
      }
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar. Tente de novo.");
      return;
    }
    toast.success(produto ? "Produto atualizado." : "Produto cadastrado.");
    aoFechar();
  });

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-xl!">
        <SheetHeader className="border-b">
          <SheetTitle>{editando ? "Editar produto" : "Novo produto"}</SheetTitle>
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
                  placeholder="Ex.: Filtro de óleo"
                />
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="codigo"
                  rotulo="Código interno (opcional)"
                  descricao="Em branco, o sistema gera (PRD-0001)."
                />
                <CampoSelect
                  control={control}
                  prefixo={PREFIXO}
                  nome="categoria"
                  rotulo="Categoria"
                  opcoes={CATEGORIAS_PRODUTO}
                />
                <CampoTexto control={control} prefixo={PREFIXO} nome="marca" rotulo="Marca (opcional)" />
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="referencia"
                  rotulo="Código do fabricante (opcional)"
                  descricao="Referência original da peça."
                />
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="codigoBarras"
                  rotulo="Código de barras (opcional)"
                  inputMode="numeric"
                  maxLength={14}
                  mascara={(valor) => valor.replace(/\D/g, "").slice(0, 14)}
                />
                <CampoSelect
                  control={control}
                  prefixo={PREFIXO}
                  nome="unidade"
                  rotulo="Unidade"
                  opcoes={UNIDADES}
                  placeholder="Selecione"
                />
                <CampoTextarea
                  control={control}
                  prefixo={PREFIXO}
                  nome="aplicacao"
                  rotulo="Aplicação (opcional)"
                  descricao="Veículos compatíveis. Ex.: Gol G5 1.0 2009-2013."
                  className="sm:col-span-2"
                  linhas={2}
                />
              </div>
            </SecaoFormulario>

            {podeVerValores && (
              <SecaoFormulario titulo="Preço">
                <div className="grid gap-4 sm:grid-cols-2">
                  <CampoTexto
                    control={control}
                    prefixo={PREFIXO}
                    nome="custo"
                    rotulo="Preço de custo (R$)"
                    inputMode="numeric"
                    placeholder="0,00"
                    mascara={mascararMoeda}
                  />
                  <CampoTexto
                    control={control}
                    prefixo={PREFIXO}
                    nome="venda"
                    rotulo="Preço de venda (R$)"
                    inputMode="numeric"
                    placeholder="0,00"
                    mascara={mascararMoeda}
                  />
                </div>
                <p className="text-muted-foreground text-sm" aria-live="polite">
                  {margem === null ? "A margem aparece quando custo e venda estão preenchidos." : `Margem sobre o custo: ${margem}%`}
                </p>
              </SecaoFormulario>
            )}

            <SecaoFormulario
              titulo="Estoque"
              descricao="O saldo muda pelas entradas, baixas e acertos, não por este cadastro."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="estoqueMinimo"
                  rotulo="Estoque mínimo (opcional)"
                  descricao="Abaixo disso, o produto aparece como estoque baixo."
                  inputMode="decimal"
                  placeholder="0"
                  mascara={mascararQuantidade}
                />
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="localizacao"
                  rotulo="Localização (opcional)"
                  placeholder="Prateleira A1"
                />
                <CampoSelect
                  control={control}
                  prefixo={PREFIXO}
                  nome="fornecedorId"
                  rotulo="Fornecedor principal (opcional)"
                  opcoes={opcoesFornecedor}
                  placeholder="Nenhum"
                  className="sm:col-span-2"
                />
              </div>
            </SecaoFormulario>

            <SecaoFormulario titulo="Outras informações">
              <div className="flex flex-col gap-5">
                <CampoTexto
                  control={control}
                  prefixo={PREFIXO}
                  nome="ncm"
                  rotulo="NCM (opcional)"
                  descricao="8 números, usado na nota fiscal."
                  inputMode="numeric"
                  placeholder="0000.00.00"
                  mascara={mascararNCM}
                />
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
                  titulo="Produto ativo"
                  descricao="Inativo continua no histórico, mas deixa de aparecer para novos lançamentos."
                />
              </div>
            </SecaoFormulario>
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" carregando={enviando}>
              {editando ? "Salvar alterações" : "Cadastrar produto"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
