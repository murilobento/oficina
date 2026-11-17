import { useVeiculos } from "@/features/veiculos/api";
import { usePessoas } from "@/features/pessoas/api";
import { Ban } from "lucide-react";

import { StatusDocumentoBadge } from "@/components/layout/documento-partes";
import { Dado, SecaoDados } from "@/components/layout/registro-partes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { subtotalItem } from "@/features/orcamentos/calculo";
import { ResumoTotais } from "@/features/orcamentos/orcamento-partes";
import { useOrcamentos } from "@/features/orcamentos/api";
import { mascararDocumento, mascararTelefone } from "@/features/pessoas/documento";
import { mascararPlaca } from "@/features/veiculos/tipos";
import { formatarBRL, formatarQuantidade } from "@/lib/numeros";

import { rotuloPagamento, totaisDaVenda, type Venda } from "./tipos";

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
                <span className="text-muted-foreground text-sm">{new Date(venda.criadoEm).toLocaleDateString("pt-BR")}</span>
              </div>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
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
                <ResumoTotais totais={totaisDaVenda(venda)} className="rounded-xl border p-3" />
              </section>

              <SecaoDados titulo="Pagamento e origem">
                <Dado rotulo="Forma de pagamento">{rotuloPagamento(venda.formaPagamento)}</Dado>
                <Dado rotulo="Origem">{orcamento ? `Orçamento ${orcamento.numero}` : "Lançamento manual"}</Dado>
                <Dado rotulo="Observações" largo>
                  {venda.observacoes && <span className="whitespace-pre-wrap">{venda.observacoes}</span>}
                </Dado>
              </SecaoDados>
            </div>

            {venda.status === "concluida" && (
              <SheetFooter className="flex-row justify-end gap-2 border-t">
                <Button variant="outline" className="text-destructive" onClick={() => aoCancelar(venda)}>
                  <Ban /> Cancelar venda
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
