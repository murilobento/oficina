import { useVeiculos } from "@/features/veiculos/api";
import { usePessoas } from "@/features/pessoas/api";
import { useState } from "react";

import { Ban, HandCoins, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { StatusDocumentoBadge } from "@/components/layout/documento-partes";
import { RotuloSecao } from "@/components/marca/rotulo-secao";
import { FolhaAbas } from "@/components/layout/folha-abas";
import { Dado, SecaoDados } from "@/components/layout/registro-partes";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { usePode } from "@/features/auth/sessao";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { subtotalItem } from "@/features/orcamentos/calculo";
import { ResumoTotais } from "@/features/orcamentos/orcamento-partes";
import { useOrcamentos } from "@/features/orcamentos/api";
import { mascararDocumento, mascararTelefone } from "@/features/pessoas/documento";
import { mascararPlaca } from "@/features/veiculos/tipos";
import { formatarBRL, formatarQuantidade } from "@/lib/numeros";

import { useEstornarPagamento } from "./api";
import { hojeISO } from "./parcelas";
import { ReceberPagamentoDialog, SeloSaldo } from "./recebimento";
import { FORMAS_PAGAMENTO, rotuloPagamento, totaisDaVenda, type PagamentoVenda, type Venda } from "./tipos";

/** Painel lateral de visualização da venda, com a ação de cancelar. */
export function VendaDetalhe({
  aberto,
  venda,
  aoFechar,
  aoCancelar,
}: {
  aberto: boolean;
  venda: Venda | null;
  aoFechar: () => void;
  aoCancelar: (venda: Venda) => void;
}) {
  const [recebendo, setRecebendo] = useState({ aberto: false, abertura: 0 });
  const [estornando, setEstornando] = useState<PagamentoVenda | null>(null);
  const estornar = useEstornarPagamento();
  const verValores = usePode("valores.ver");
  const podeEditar = usePode("vendas.editar");
  const clientes = usePessoas("cliente");
  const veiculos = useVeiculos();
  const orcamentos = useOrcamentos();
  const cliente = clientes.find((item) => item.id === venda?.clienteId);
  const veiculo = veiculos.find((item) => item.id === venda?.veiculoId);
  const orcamento = orcamentos.find((item) => item.id === venda?.orcamentoId);

  return (
    <Sheet open={aberto && venda !== null} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-2xl!">
        {venda && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="pr-8">{venda.numero}</SheetTitle>
              <SheetDescription>{cliente?.nome ?? (venda.clienteId ? "Cliente removido" : "Consumidor final")}</SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusDocumentoBadge status={venda.status} concluida="Concluída" />
                <SeloSaldo venda={venda} />
                <span className="text-muted-foreground text-sm">{new Date(venda.criadoEm).toLocaleDateString("pt-BR")}</span>
              </div>
            </SheetHeader>

            <FolhaAbas
              key={venda.id}
              abas={[
                { id: "dados", titulo: "Cliente e itens", conteudo: (
                  <>
              <SecaoDados titulo="Cliente">
                <Dado rotulo="Nome">{cliente?.nome ?? (venda.clienteId ? "Cliente removido" : "Consumidor final")}</Dado>
                <Dado rotulo="CPF / CNPJ">{cliente ? mascararDocumento(cliente.tipo, cliente.documento) : ""}</Dado>
                <Dado rotulo="Telefone">{cliente ? mascararTelefone(cliente.celular || cliente.telefone) : ""}</Dado>
              </SecaoDados>

              {venda.veiculoId && (
                <SecaoDados titulo="Veículo">
                  <Dado rotulo="Marca e modelo">{veiculo?.modelo ?? "Veículo removido"}</Dado>
                  <Dado rotulo="Placa">{veiculo ? mascararPlaca(veiculo.placa) : ""}</Dado>
                  <Dado rotulo="Quilometragem">{venda.km > 0 ? `${formatarQuantidade(venda.km)} km` : ""}</Dado>
                </SecaoDados>
              )}

              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Itens</h3>
                <ul className="flex flex-col divide-y rounded-xl border">
                  {venda.itens.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-4 p-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium break-words">{item.descricao}</p>
                        <p className="text-muted-foreground tabular-nums">
                          {item.tipo === "servico" ? "Serviço" : "Peça"} · {formatarQuantidade(item.quantidade)} {item.unidade} × {formatarBRL(item.valor)}
                        </p>
                      </div>
                      <p className="shrink-0 font-medium tabular-nums">{formatarBRL(subtotalItem(item))}</p>
                    </li>
                  ))}
                </ul>
              </section>
                  </>
                ) },
                { id: "valores", titulo: "Pagamentos", conteudo: (
                  <>
              <ResumoTotais totais={totaisDaVenda(venda)} className="rounded-md border p-3" />

              {verValores && (
                <section className="flex flex-col gap-3">
                  <RotuloSecao>Pagamentos</RotuloSecao>
                  {venda.pagamentos.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhum pagamento recebido.</p>
                  ) : (
                    <ul className="divide-y rounded-md border">
                      {venda.pagamentos.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                          <span className={p.estornadoEm ? "text-muted-foreground line-through" : ""}>
                            <span className="font-medium">
                              {FORMAS_PAGAMENTO.find((f) => f.valor === p.forma)?.texto ?? p.forma}
                              {p.parcelasCartao && p.parcelasCartao > 1 ? ` ${p.parcelasCartao}x` : ""}
                            </span>
                            <span className="text-muted-foreground block text-xs">
                              {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
                              {p.criadoPor && ` · ${p.criadoPor}`}
                              {p.estornadoEm && " · estornado"}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            <span className={`font-semibold tabular-nums ${p.estornadoEm ? "text-muted-foreground line-through" : ""}`}>{formatarBRL(p.valor)}</span>
                            {podeEditar && !p.estornadoEm && venda.status === "concluida" && (
                              <Button type="button" variant="ghost" size="icon" aria-label={`Estornar pagamento de ${formatarBRL(p.valor)}`} onClick={() => setEstornando(p)}>
                                <Undo2 />
                              </Button>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {venda.parcelas.length > 0 && (
                    <>
                      <RotuloSecao>A receber</RotuloSecao>
                      <ul className="divide-y rounded-md border">
                        {venda.parcelas.map((p) => {
                          const vencida = p.aberto > 0 && p.vencimento < hojeISO();
                          return (
                            <li key={p.numero} className="flex items-center justify-between gap-3 p-3 text-sm">
                              <span>
                                <span className="tabular-nums font-medium">
                                  {p.numero}/{venda.parcelas.length} · {p.vencimento.split("-").reverse().join("/")}
                                </span>
                                <span className={`block text-xs ${vencida ? "text-erro font-semibold" : "text-muted-foreground"}`}>
                                  {p.aberto === 0 ? "Paga" : vencida ? "Vencida" : p.pago > 0 ? `Falta ${formatarBRL(p.aberto)}` : "Em aberto"}
                                </span>
                              </span>
                              <span className={`font-semibold tabular-nums ${p.aberto === 0 ? "text-muted-foreground line-through" : ""}`}>{formatarBRL(p.valor)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                  {podeEditar && venda.saldo > 0 && (
                    <Button type="button" className="self-start" onClick={() => setRecebendo((a) => ({ aberto: true, abertura: a.abertura + 1 }))}>
                      <HandCoins /> Receber {formatarBRL(venda.saldo)}
                    </Button>
                  )}
                </section>
              )}

              <SecaoDados titulo="Origem">
                <Dado rotulo="Forma de pagamento">{rotuloPagamento(venda.formaPagamento)}</Dado>
                <Dado rotulo="Origem">{orcamento ? `Orçamento ${orcamento.numero}` : "Lançamento manual"}</Dado>
                <Dado rotulo="Observações" largo>
                  {venda.observacoes && <span className="whitespace-pre-wrap">{venda.observacoes}</span>}
                </Dado>
              </SecaoDados>
                  </>
                ) },
              ]}
            />

            {venda.status === "concluida" && (
              <SheetFooter className="flex-row justify-end gap-2 border-t">
                {venda.temPagamento && <p className="text-muted-foreground mr-auto self-center text-xs">Para cancelar, estorne os pagamentos.</p>}
                <Button variant="outline" className="text-destructive" disabled={venda.temPagamento} onClick={() => aoCancelar(venda)}>
                  <Ban /> Cancelar venda
                </Button>
              </SheetFooter>
            )}
          </>
        )}
        <ReceberPagamentoDialog key={recebendo.abertura} venda={recebendo.aberto ? venda : null} aoFechar={() => setRecebendo((a) => ({ ...a, aberto: false }))} />
        <AlertDialog open={estornando !== null} onOpenChange={(open) => !open && setEstornando(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Estornar pagamento?</AlertDialogTitle>
              <AlertDialogDescription>
                {estornando && `O pagamento de ${formatarBRL(estornando.valor)} deixa de contar e o saldo da venda volta a abrir.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!venda || !estornando) return;
                  try {
                    await estornar.mutateAsync({ vendaId: venda.id, pagamentoId: estornando.id });
                    toast.success("Pagamento estornado.");
                  } catch (falha) {
                    toast.error(falha instanceof Error ? falha.message : "Não foi possível estornar.");
                  }
                }}
              >
                Estornar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
