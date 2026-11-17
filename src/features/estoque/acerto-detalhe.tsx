import { Dado, SecaoDados } from "@/components/layout/registro-partes";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatarQuantidade } from "@/lib/numeros";

import { type Acerto, itensDivergentes } from "./acerto";
import { diferencaAcerto } from "./movimentar";

/** Painel lateral de um acerto já registrado (somente leitura). */
export function AcertoDetalhe({ aberto, acerto, aoFechar }: { aberto: boolean; acerto: Acerto | null; aoFechar: () => void }) {
  return (
    <Sheet open={aberto && acerto !== null} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-xl!">
        {acerto && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="pr-8">{acerto.numero}</SheetTitle>
              <SheetDescription>
                {new Date(acerto.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · {acerto.motivo}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
              <SecaoDados titulo="Resumo">
                <Dado rotulo="Produtos contados">{acerto.itens.length}</Dado>
                <Dado rotulo="Com diferença">{itensDivergentes(acerto).length}</Dado>
                <Dado rotulo="Observação" largo>
                  {acerto.observacoes}
                </Dado>
              </SecaoDados>
              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Produtos</h3>
                <ul className="flex flex-col divide-y rounded-xl border">
                  {acerto.itens.map((item) => {
                    const dif = diferencaAcerto(item.saldoSistema, item.contado);
                    return (
                      <li key={item.produtoId} className="flex items-start justify-between gap-3 p-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium break-words">{item.descricao}</p>
                          <p className="text-muted-foreground tabular-nums">
                            Sistema {formatarQuantidade(item.saldoSistema)} → contado {formatarQuantidade(item.contado)} {item.unidade}
                          </p>
                        </div>
                        <p className={`shrink-0 font-medium tabular-nums ${dif === 0 ? "text-muted-foreground" : dif > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                          {dif === 0 ? "—" : `${dif > 0 ? "+" : "−"}${formatarQuantidade(Math.abs(dif))}`}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
