import { usePode } from "@/features/auth/sessao";
import { useServicos } from "@/features/servicos/api";
import { useProdutos } from "@/features/produtos/api";
import { useMemo, useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { rotuloCategoria } from "@/features/produtos/tipos";
import { rotuloCategoriaServico } from "@/features/servicos/tipos";
import { normalizar } from "@/lib/listagem";
import { formatarBRL } from "@/lib/numeros";

import type { TipoItem } from "./calculo";
import { ItemRapido } from "./item-rapido";

export type ItemEscolhido = {
  tipo: TipoItem;
  origemId: string;
  descricao: string;
  unidade: string;
  /** Preço padrão do cadastro, em centavos. */
  valor: number;
};

type Opcao = ItemEscolhido & { chave: string; detalhe: string };

/**
 * Janela para escolher o que entra no orçamento: busca nos produtos e serviços ativos do
 * cadastro (já traz o preço padrão) ou cria um item avulso, digitado na hora.
 */
export function SeletorItem({
  aberto,
  aoFechar,
  aoEscolher,
  documento = "orçamento",
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoEscolher: (item: ItemEscolhido) => void;
  /** Como o documento aparece nos textos ("orçamento", "venda"). */
  documento?: string;
}) {
  const produtos = useProdutos();
  // Cadastrar pela lista exige a mesma permissão do cadastro (a API recusa sem ela).
  const podeCadastrarProduto = usePode("estoque.editar");
  const podeCadastrarServico = usePode("servicos.editar");
  const servicos = useServicos();
  const [busca, setBusca] = useState("");
  // Cadastro rápido de produto/serviço no lugar da lista; null = lista.
  const [cadastrando, setCadastrando] = useState<TipoItem | null>(null);

  const opcoes = useMemo<Opcao[]>(
    () => [
      ...servicos
        .filter((servico) => servico.ativo)
        .map((servico) => ({
          chave: `s-${servico.id}`,
          tipo: "servico" as const,
          origemId: servico.id,
          descricao: servico.descricao,
          unidade: "UN",
          valor: servico.valor,
          detalhe: `Serviço · ${rotuloCategoriaServico(servico.categoria)}`,
        })),
      ...produtos
        .filter((produto) => produto.ativo)
        .map((produto) => ({
          chave: `p-${produto.id}`,
          tipo: "produto" as const,
          origemId: produto.id,
          descricao: produto.descricao,
          unidade: produto.unidade,
          valor: produto.venda,
          detalhe: [`Produto · ${rotuloCategoria(produto.categoria)}`, produto.marca].filter(Boolean).join(" · "),
        })),
    ],
    [produtos, servicos],
  );

  const termo = normalizar(busca.trim());
  const encontradas = opcoes
    .filter((opcao) => termo === "" || normalizar(`${opcao.descricao} ${opcao.detalhe}`).includes(termo))
    .slice(0, 30);

  function escolher(item: ItemEscolhido) {
    aoEscolher(item);
    setBusca("");
    setCadastrando(null);
    aoFechar();
  }

  function fechar() {
    setCadastrando(null);
    setBusca("");
    aoFechar();
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && fechar()}>
      <DialogContent className="flex max-h-[85svh] flex-col gap-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {cadastrando === "produto" ? "Novo produto" : cadastrando === "servico" ? "Novo serviço" : "Adicionar item"}
          </DialogTitle>
          <DialogDescription>
            {cadastrando
              ? `Cadastro rápido: já fica salvo no cadastro e entra ${documento === "venda" ? "na" : "no"} ${documento}.`
              : "Escolha um produto ou serviço do cadastro, ou cadastre um novo."}
          </DialogDescription>
        </DialogHeader>

        {cadastrando ? (
          <ItemRapido
            key={cadastrando}
            tipo={cadastrando}
            descricaoInicial={busca.trim()}
            aoCancelar={() => setCadastrando(null)}
            aoCriado={escolher}
          />
        ) : (
          <>
            <Input
              type="search"
              autoComplete="off"
              placeholder="Buscar produto ou serviço"
              aria-label="Buscar produto ou serviço"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />

            <ul className="-mx-1 flex min-h-32 flex-1 flex-col overflow-y-auto px-1">
              {encontradas.map((opcao) => (
                <li key={opcao.chave}>
                  <button
                    type="button"
                    className="hover:bg-accent flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left"
                    onClick={() => escolher(opcao)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{opcao.descricao}</span>
                      <span className="text-muted-foreground block truncate text-xs">{opcao.detalhe}</span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums">{opcao.valor > 0 ? formatarBRL(opcao.valor) : "—"}</span>
                  </button>
                </li>
              ))}
              {encontradas.length === 0 && (
                <li className="text-muted-foreground py-6 text-center text-sm">
                  Nada encontrado. Cadastre um novo abaixo.
                </li>
              )}
            </ul>

            <div className="grid grid-cols-2 gap-2 border-t pt-3">
              {podeCadastrarProduto && (
                <Button type="button" variant="outline" onClick={() => setCadastrando("produto")}>
                  <Plus /> Novo produto
                </Button>
              )}
              {podeCadastrarServico && (
                <Button type="button" variant="outline" onClick={() => setCadastrando("servico")}>
                  <Plus /> Novo serviço
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => escolher({ tipo: "produto", origemId: "", descricao: "", unidade: "UN", valor: 0 })}
              >
                Peça avulsa
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => escolher({ tipo: "servico", origemId: "", descricao: "", unidade: "UN", valor: 0 })}
              >
                Serviço avulso
              </Button>
              <p className="text-muted-foreground col-span-2 text-center text-xs">
                Avulso vale só para {documento === "venda" ? "esta" : "este"} {documento} e não entra no cadastro.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
