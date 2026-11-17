import { usePessoas } from "@/features/pessoas/api";
import { Pencil, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

import { Dado, SecaoDados } from "@/components/layout/registro-partes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/features/pessoas/pessoa-partes";
import { formatarBRL, formatarQuantidade, margemSobreCusto } from "@/lib/numeros";

import { AvisoEstoque } from "./produto-partes";
import { mascararNCM, type Produto, rotuloCategoria } from "./tipos";

/** Painel lateral de visualização de um produto. */
export function ProdutoDetalhe({
  aberto,
  produto,
  aoFechar,
  aoEditar,
  aoAlternarAtivo,
  aoExcluir,
}: {
  aberto: boolean;
  produto: Produto | null;
  aoFechar: () => void;
  aoEditar: (produto: Produto) => void;
  aoAlternarAtivo: (produto: Produto) => void;
  aoExcluir: (produto: Produto) => void;
}) {
  const fornecedores = usePessoas("fornecedor");
  const fornecedor = fornecedores.find((item) => item.id === produto?.fornecedorId);
  const margem = produto ? margemSobreCusto(produto.custo, produto.venda) : null;

  return (
    <Sheet open={aberto && produto !== null} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-xl!">
        {produto && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="pr-8 break-words">{produto.descricao}</SheetTitle>
              <SheetDescription>{[produto.codigo, produto.marca].filter(Boolean).join(" · ")}</SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="secondary" className="font-normal">
                  {rotuloCategoria(produto.categoria)}
                </Badge>
                <StatusBadge ativo={produto.ativo} />
                <AvisoEstoque produto={produto} />
              </div>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
              <SecaoDados titulo="Identificação">
                <Dado rotulo="Código interno">{produto.codigo}</Dado>
                <Dado rotulo="Marca">{produto.marca}</Dado>
                <Dado rotulo="Código do fabricante">{produto.referencia}</Dado>
                <Dado rotulo="Código de barras">{produto.codigoBarras}</Dado>
                <Dado rotulo="Unidade">{produto.unidade}</Dado>
                <Dado rotulo="NCM">{mascararNCM(produto.ncm)}</Dado>
                <Dado rotulo="Aplicação" largo>
                  {produto.aplicacao && <span className="whitespace-pre-wrap">{produto.aplicacao}</span>}
                </Dado>
              </SecaoDados>

              <SecaoDados titulo="Preço">
                <Dado rotulo="Preço de custo">{produto.custo > 0 ? formatarBRL(produto.custo) : ""}</Dado>
                <Dado rotulo="Preço de venda">{produto.venda > 0 ? formatarBRL(produto.venda) : ""}</Dado>
                <Dado rotulo="Margem sobre o custo">{margem === null ? "" : `${margem}%`}</Dado>
              </SecaoDados>

              <SecaoDados titulo="Estoque">
                <Dado rotulo="Saldo atual">{`${formatarQuantidade(produto.saldo)} ${produto.unidade}`}</Dado>
                <Dado rotulo="Estoque mínimo">
                  {produto.estoqueMinimo > 0 ? `${formatarQuantidade(produto.estoqueMinimo)} ${produto.unidade}` : ""}
                </Dado>
                <Dado rotulo="Localização">{produto.localizacao}</Dado>
                <Dado rotulo="Fornecedor principal">{fornecedor?.nome}</Dado>
              </SecaoDados>

              <SecaoDados titulo="Outras informações">
                <Dado rotulo="Observações" largo>
                  {produto.observacoes && <span className="whitespace-pre-wrap">{produto.observacoes}</span>}
                </Dado>
                <Dado rotulo="Cadastrado em">
                  {new Date(produto.criadoEm).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </Dado>
              </SecaoDados>
            </div>

            <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t">
              <Button
                variant="outline"
                className="text-destructive"
                aria-label={`Excluir ${produto.descricao}`}
                onClick={() => aoExcluir(produto)}
              >
                <Trash2 /> Excluir
              </Button>
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => aoAlternarAtivo(produto)}>
                {produto.ativo ? <ToggleLeft /> : <ToggleRight />}
                {produto.ativo ? "Inativar" : "Ativar"}
              </Button>
              <Button className="flex-1 sm:flex-none" onClick={() => aoEditar(produto)}>
                <Pencil /> Editar
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
