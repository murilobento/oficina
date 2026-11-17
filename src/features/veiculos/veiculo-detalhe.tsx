import { AlertTriangle, Pencil, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

import { Dado, SecaoDados } from "@/components/layout/registro-partes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useOrcamentosStore } from "@/features/orcamentos/store";
import { statusExibido, totaisDoOrcamento } from "@/features/orcamentos/tipos";
import { StatusOrcamentoBadge } from "@/features/orcamentos/orcamento-partes";
import { CLIENTES } from "@/features/pessoas/entidades";
import { StatusBadge } from "@/features/pessoas/pessoa-partes";
import { formatarBRL, formatarQuantidade } from "@/lib/numeros";

import { historicoDoVeiculo } from "./historico";
import { mascararPlaca, rotuloCambio, rotuloCombustivel, type Veiculo } from "./tipos";

const data = (valor: string) => new Date(valor).toLocaleDateString("pt-BR");

/** Painel lateral de um veículo: dados do carro e o histórico de visitas. */
export function VeiculoDetalhe({
  aberto,
  veiculo,
  aoFechar,
  aoEditar,
  aoAlternarAtivo,
  aoExcluir,
}: {
  aberto: boolean;
  veiculo: Veiculo | null;
  aoFechar: () => void;
  aoEditar: (veiculo: Veiculo) => void;
  aoAlternarAtivo: (veiculo: Veiculo) => void;
  aoExcluir: (veiculo: Veiculo) => void;
}) {
  const orcamentos = useOrcamentosStore((estado) => estado.itens);
  const clientes = CLIENTES.useStore((estado) => estado.pessoas);
  const cliente = clientes.find((item) => item.id === veiculo?.clienteId);

  return (
    <Sheet open={aberto && veiculo !== null} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-xl!">
        {veiculo && (() => {
          const h = historicoDoVeiculo(orcamentos, veiculo.id);
          return (
            <>
              <SheetHeader className="border-b">
                <SheetTitle className="pr-8 break-words">{veiculo.modelo}</SheetTitle>
                <SheetDescription>
                  {[veiculo.placa && mascararPlaca(veiculo.placa), cliente?.nome ?? "Cliente removido"].filter(Boolean).join(" · ")}
                </SheetDescription>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <StatusBadge ativo={veiculo.ativo} />
                </div>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">Resumo</h3>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted/50 rounded-lg border p-3">
                      <dt className="text-muted-foreground">Total gasto</dt>
                      <dd className="text-base font-semibold tabular-nums">{formatarBRL(h.totalGasto)}</dd>
                    </div>
                    <div className="bg-muted/50 rounded-lg border p-3">
                      <dt className="text-muted-foreground">Visitas realizadas</dt>
                      <dd className="text-base font-semibold tabular-nums">{h.realizadas}</dd>
                    </div>
                    <div className="bg-muted/50 rounded-lg border p-3">
                      <dt className="text-muted-foreground">Última visita</dt>
                      <dd className="font-medium">{h.ultimaVisita ? data(h.ultimaVisita) : "Nenhuma"}</dd>
                    </div>
                    <div className="bg-muted/50 rounded-lg border p-3">
                      <dt className="text-muted-foreground">Km atual</dt>
                      <dd className="font-medium tabular-nums">{veiculo.km > 0 ? `${formatarQuantidade(veiculo.km)} km` : "Sem registro"}</dd>
                    </div>
                  </dl>
                </section>

                <SecaoDados titulo="Dados do carro">
                  <Dado rotulo="Placa">{mascararPlaca(veiculo.placa)}</Dado>
                  <Dado rotulo="Ano">{veiculo.ano}</Dado>
                  <Dado rotulo="Cor">{veiculo.cor}</Dado>
                  <Dado rotulo="Combustível">{rotuloCombustivel(veiculo.combustivel)}</Dado>
                  <Dado rotulo="Câmbio">{rotuloCambio(veiculo.cambio)}</Dado>
                  <Dado rotulo="Motorização">{veiculo.motor}</Dado>
                  <Dado rotulo="Observações" largo>
                    {veiculo.observacoes && <span className="whitespace-pre-wrap">{veiculo.observacoes}</span>}
                  </Dado>
                </SecaoDados>

                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">Serviços e peças já aplicados</h3>
                  {h.aplicados.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nada aprovado ainda para este carro.</p>
                  ) : (
                    <ul className="flex flex-col divide-y rounded-xl border">
                      {h.aplicados.map((aplicado) => (
                        <li key={`${aplicado.tipo}-${aplicado.descricao}`} className="flex items-start justify-between gap-3 p-3 text-sm">
                          <div className="min-w-0">
                            <p className="font-medium break-words">{aplicado.descricao}</p>
                            <p className="text-muted-foreground">
                              Última vez em {data(aplicado.ultimaData)}
                              {aplicado.ultimoKm > 0 && ` · ${formatarQuantidade(aplicado.ultimoKm)} km`}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <Badge variant="secondary" className="font-normal">
                              {aplicado.tipo === "servico" ? "Serviço" : "Peça"}
                            </Badge>
                            {aplicado.vezes > 1 && <span className="text-muted-foreground">{aplicado.vezes}x</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">Evolução do km</h3>
                  {h.kmEvolucao.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhum km registrado em visitas aprovadas.</p>
                  ) : (
                    <ul className="flex flex-col divide-y rounded-xl border">
                      {h.kmEvolucao.map((ponto) => (
                        <li key={ponto.data} className="flex items-center justify-between gap-3 p-3 text-sm">
                          <span>{data(ponto.data)}</span>
                          <span className="flex items-center gap-2 tabular-nums">
                            {ponto.delta !== null && (
                              <span className={ponto.queda ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                                {ponto.queda && <AlertTriangle aria-label="Km menor que a visita anterior" className="mr-1 inline size-3.5" />}
                                {ponto.delta > 0 ? "+" : ""}
                                {formatarQuantidade(ponto.delta)} km
                              </span>
                            )}
                            <span className="font-medium">{formatarQuantidade(ponto.km)} km</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">Linha do tempo</h3>
                  {h.visitas.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Este carro ainda não tem orçamentos.</p>
                  ) : (
                    <ol className="flex flex-col divide-y rounded-xl border">
                      {h.visitas.map((visita) => (
                        <li key={visita.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                          <div className="min-w-0">
                            <p className="font-medium">
                              {visita.numero} <span className="text-muted-foreground font-normal">· {data(visita.criadoEm)}</span>
                            </p>
                            <p className="text-muted-foreground break-words">
                              {visita.itens.filter((i) => i.tipo === "servico").map((i) => i.descricao).join(", ") ||
                                visita.problema ||
                                "Só peças"}
                            </p>
                            {visita.km > 0 && <p className="text-muted-foreground tabular-nums">{formatarQuantidade(visita.km)} km</p>}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <StatusOrcamentoBadge status={statusExibido(visita)} />
                            <span className="font-medium tabular-nums">{formatarBRL(totaisDoOrcamento(visita).total)}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>

              <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t">
                <Button variant="outline" className="text-destructive" aria-label={`Excluir ${veiculo.modelo}`} onClick={() => aoExcluir(veiculo)}>
                  <Trash2 /> Excluir
                </Button>
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => aoAlternarAtivo(veiculo)}>
                  {veiculo.ativo ? <ToggleLeft /> : <ToggleRight />}
                  {veiculo.ativo ? "Inativar" : "Ativar"}
                </Button>
                <Button className="flex-1 sm:flex-none" onClick={() => aoEditar(veiculo)}>
                  <Pencil /> Editar
                </Button>
              </SheetFooter>
            </>
          );
        })()}
      </SheetContent>
    </Sheet>
  );
}
