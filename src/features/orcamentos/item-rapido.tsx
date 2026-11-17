import { useSalvarProduto } from "@/features/produtos/api";
import { useSalvarServico } from "@/features/servicos/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { CampoSelect, CampoTexto } from "@/components/layout/campos-form";
import { Button } from "@/components/ui/button";
import {
  CATEGORIAS_PRODUTO,
  FORM_VAZIO as PRODUTO_VAZIO,
  paraProduto,
  UNIDADES,
} from "@/features/produtos/tipos";
import { CATEGORIAS_SERVICO, FORM_VAZIO as SERVICO_VAZIO, paraServico } from "@/features/servicos/tipos";
import { mascararMoeda, textoParaCentavos } from "@/lib/numeros";

import type { TipoItem } from "./calculo";
import type { ItemEscolhido } from "./seletor-item";

const esquema = z.object({
  descricao: z.string().trim().min(1, "Informe a descrição.").max(120, "No máximo 120 caracteres."),
  categoria: z.string().min(1, "Escolha a categoria."),
  unidade: z.string().min(1, "Escolha a unidade."),
  valor: z.string(),
});
type Valores = z.infer<typeof esquema>;

/**
 * Cadastro rápido de produto ou serviço, dentro da janela "Adicionar item" do orçamento.
 * Salva de verdade em Produtos ou Serviços (código gerado sozinho) e já devolve o item para
 * o orçamento. O restante (marca, NCM, garantia...) se completa depois no cadastro.
 */
export function ItemRapido({
  tipo,
  descricaoInicial,
  aoCancelar,
  aoCriado,
}: {
  tipo: TipoItem;
  descricaoInicial: string;
  aoCancelar: () => void;
  aoCriado: (item: ItemEscolhido) => void;
}) {
  const salvarProduto = useSalvarProduto();
  const salvarServico = useSalvarServico();

  const ehProduto = tipo === "produto";
  const form = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: { descricao: descricaoInicial, categoria: "", unidade: "UN", valor: "" },
  });
  const { control } = form;

  // Fica dentro do painel do orçamento na árvore do React: sem o stopPropagation, o envio
  // "borbulharia" e também enviaria o orçamento.
  const enviar = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.stopPropagation();
    return form.handleSubmit(async (valores) => {
      const valor = textoParaCentavos(valores.valor);
      try {
        if (ehProduto) {
          const dados = paraProduto({
            ...PRODUTO_VAZIO,
            descricao: valores.descricao,
            categoria: valores.categoria,
            unidade: valores.unidade,
            venda: valores.valor,
          });
          const criado = await salvarProduto.mutateAsync({ dados });
          toast.success(`Produto cadastrado (${criado.codigo}). Complete os dados depois em Cadastro > Produto.`);
          aoCriado({ tipo, origemId: criado.id, descricao: criado.descricao, unidade: criado.unidade, valor });
        } else {
          const dados = paraServico({
            ...SERVICO_VAZIO,
            descricao: valores.descricao,
            categoria: valores.categoria,
            valor: valores.valor,
          });
          const criado = await salvarServico.mutateAsync({ dados });
          toast.success(`Serviço cadastrado (${criado.codigo}). Complete os dados depois em Cadastro > Serviço.`);
          aoCriado({ tipo, origemId: criado.id, descricao: criado.descricao, unidade: "UN", valor });
        }
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível cadastrar. Tente de novo.");
      }
    })(evento);
  };

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4 overflow-y-auto">
      <CampoTexto
        control={control}
        prefixo="item-rapido"
        nome="descricao"
        rotulo="Descrição"
        placeholder={ehProduto ? "Ex.: Filtro de ar" : "Ex.: Troca de embreagem"}
      />
      <CampoSelect
        control={control}
        prefixo="item-rapido"
        nome="categoria"
        rotulo="Categoria"
        opcoes={ehProduto ? CATEGORIAS_PRODUTO : CATEGORIAS_SERVICO}
      />
      <div className="grid grid-cols-2 gap-3">
        <CampoTexto
          control={control}
          prefixo="item-rapido"
          nome="valor"
          rotulo={ehProduto ? "Preço de venda (R$)" : "Valor da mão de obra (R$)"}
          inputMode="numeric"
          placeholder="0,00"
          mascara={mascararMoeda}
        />
        {ehProduto && (
          <CampoSelect control={control} prefixo="item-rapido" nome="unidade" rotulo="Unidade" opcoes={UNIDADES} />
        )}
      </div>
      <div className="flex justify-end gap-2 border-t pt-3">
        <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoCancelar}>
          Voltar
        </Button>
        <Button type="submit" className="flex-1 sm:flex-none">
          Cadastrar e adicionar
        </Button>
      </div>
    </form>
  );
}
