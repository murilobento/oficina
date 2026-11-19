import { usePessoas } from "@/features/pessoas/api";
import { Ban } from "lucide-react";

import { StatusDocumentoBadge } from "@/components/layout/documento-partes";
import { FolhaAbas } from "@/components/layout/folha-abas";
import { Dado, SecaoDados } from "@/components/layout/registro-partes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { subtotalItem } from "@/features/orcamentos/calculo";
import { mascararDocumento } from "@/features/pessoas/documento";
import { formatarBRL, formatarQuantidade } from "@/lib/numeros";

import { type Compra, totaisDaCompra } from "./tipos";

/** Painel lateral de visualização da compra, com a ação de cancelar. */
export function CompraDetalhe({
  aberto,
  compra,
  aoFechar,
  aoCancelar,
}: {
  aberto: boolean;
  compra: Compra | null;
  aoFechar: () => void;
  aoCancelar: (compra: Compra) => void;
}) {
  const fornecedores = usePessoas("fornecedor");
  const fornecedor = fornecedores.find((item) => item.id === compra?.fornecedorId);
  const totais = compra ? totaisDaCompra(compra) : null;

  return (
    <Sheet open={aberto && compra !== null} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-2xl!">
        {compra && totais && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="pr-8">{compra.numero}</SheetTitle>
              <SheetDescription>{fornecedor?.nome ?? "Fornecedor removido"}</SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusDocumentoBadge status={compra.status} concluida="Recebida" />
                <span className="text-muted-foreground text-sm">{new Date(compra.criadoEm).toLocaleDateString("pt-BR")}</span>
              </div>
            </SheetHeader>

            <FolhaAbas
              key={compra.id}
              abas={[
                { id: "dados", titulo: "Fornecedor e itens", conteudo: (
                  <>
              <SecaoDados titulo="Fornecedor">
                <Dado rotulo="Nome">{fornecedor?.nome ?? "Fornecedor removido"}</Dado>
                <Dado rotulo="CPF / CNPJ">{fornecedor ? mascararDocumento(fornecedor.tipo, fornecedor.documento) : ""}</Dado>
                <Dado rotulo="Nota fiscal">{compra.notaFiscal}</Dado>
              </SecaoDados>

              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Produtos</h3>
                <ul className="flex flex-col divide-y rounded-xl border">
                  {compra.itens.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-4 p-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium break-words">{item.descricao}</p>
                        <p className="text-muted-foreground tabular-nums">
                          {formatarQuantidade(item.quantidade)} {item.unidade} × {formatarBRL(item.custo)}
                        </p>
                      </div>
                      <p className="shrink-0 font-medium tabular-nums">{formatarBRL(subtotalItem({ quantidade: item.quantidade, valor: item.custo }))}</p>
                    </li>
                  ))}
                </ul>
              </section>
                  </>
                ) },
                { id: "valores", titulo: "Valores", conteudo: (
                  <>
              <dl className="flex flex-col gap-1.5 rounded-md border p-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Produtos</dt>
                    <dd className="tabular-nums">{formatarBRL(totais.subtotal)}</dd>
                  </div>
                  {totais.frete > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Frete</dt>
                      <dd className="tabular-nums">{formatarBRL(totais.frete)}</dd>
                    </div>
                  )}
                  {totais.desconto > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Desconto</dt>
                      <dd className="tabular-nums">− {formatarBRL(totais.desconto)}</dd>
                    </div>
                  )}
                  <div className="mt-1 flex items-baseline justify-between gap-4 border-t pt-2">
                    <dt className="font-semibold">Total</dt>
                    <dd className="text-lg font-semibold tabular-nums">{formatarBRL(totais.total)}</dd>
                  </div>
                </dl>

              <SecaoDados titulo="Outras informações">
                <Dado rotulo="Observações" largo>
                  {compra.observacoes && <span className="whitespace-pre-wrap">{compra.observacoes}</span>}
                </Dado>
              </SecaoDados>
                  </>
                ) },
              ]}
            />

            {compra.status === "concluida" && (
              <SheetFooter className="flex-row justify-end gap-2 border-t">
                <Button variant="outline" className="text-destructive" onClick={() => aoCancelar(compra)}>
                  <Ban /> Cancelar compra
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
