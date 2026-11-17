import { CheckCircle2, FilePlus2, Pencil, Printer, RefreshCw, RotateCcw, Send, Trash2, XCircle } from "lucide-react";

import { Dado, SecaoDados } from "@/components/layout/registro-partes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CLIENTES } from "@/features/pessoas/entidades";
import { mascararDocumento, mascararTelefone } from "@/features/pessoas/documento";
import { useVeiculosStore } from "@/features/veiculos/store";
import { mascararPlaca } from "@/features/veiculos/tipos";
import { formatarBRL, formatarQuantidade } from "@/lib/numeros";

import { subtotalItem, validoAte } from "./calculo";
import { ResumoTotais, StatusOrcamentoBadge } from "./orcamento-partes";
import {
  type Orcamento,
  podeEditar,
  type StatusOrcamento,
  statusExibido,
  totaisDoOrcamento,
} from "./tipos";

export type MudancaStatus = { status: StatusOrcamento } | { renovar: true };

/** Painel lateral de visualização do orçamento, com as ações de cada etapa (enviar, aprovar...). */
export function OrcamentoDetalhe({
  aberto,
  orcamento,
  aoFechar,
  aoEditar,
  aoImprimir,
  aoExcluir,
  aoMudar,
}: {
  aberto: boolean;
  orcamento: Orcamento | null;
  aoFechar: () => void;
  aoEditar: (orcamento: Orcamento) => void;
  aoImprimir: (orcamento: Orcamento) => void;
  aoExcluir: (orcamento: Orcamento) => void;
  aoMudar: (orcamento: Orcamento, mudanca: MudancaStatus) => void;
}) {
  const clientes = CLIENTES.useStore((estado) => estado.pessoas);
  const cliente = clientes.find((item) => item.id === orcamento?.clienteId) ?? null;
  const veiculos = useVeiculosStore((estado) => estado.itens);
  const veiculo = veiculos.find((item) => item.id === orcamento?.veiculoId) ?? null;

  return (
    <Sheet open={aberto && orcamento !== null} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-2xl!">
        {orcamento && conteudo(orcamento)}
      </SheetContent>
    </Sheet>
  );

  function conteudo(atual: Orcamento) {
    const exibido = statusExibido(atual);
    const totais = totaisDoOrcamento(atual);
    const vencido = exibido === "vencido";
    const validade = validoAte(atual.criadoEm, atual.validadeDias);

    return (
      <>
        <SheetHeader className="border-b">
          <SheetTitle className="pr-8">{atual.numero}</SheetTitle>
          <SheetDescription>{cliente?.nome ?? "Cliente removido"}</SheetDescription>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <StatusOrcamentoBadge status={exibido} />
            <span className="text-muted-foreground text-sm">
              {vencido ? "Venceu" : "Válido até"} {validade.toLocaleDateString("pt-BR")}
            </span>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
          <SecaoDados titulo="Cliente">
            <Dado rotulo="Nome">{cliente?.nome ?? "Cliente removido"}</Dado>
            <Dado rotulo="CPF / CNPJ">{cliente ? mascararDocumento(cliente.tipo, cliente.documento) : ""}</Dado>
            <Dado rotulo="Telefone">{cliente ? mascararTelefone(cliente.celular || cliente.telefone) : ""}</Dado>
          </SecaoDados>

          <SecaoDados titulo="Veículo">
            <Dado rotulo="Marca e modelo">{veiculo?.modelo ?? "Veículo removido"}</Dado>
            <Dado rotulo="Placa">{veiculo ? mascararPlaca(veiculo.placa) : ""}</Dado>
            <Dado rotulo="Ano">{veiculo?.ano}</Dado>
            <Dado rotulo="Cor">{veiculo?.cor}</Dado>
            <Dado rotulo="Quilometragem">{atual.km > 0 ? `${formatarQuantidade(atual.km)} km` : ""}</Dado>
            <Dado rotulo="Problema relatado" largo>
              {atual.problema && <span className="whitespace-pre-wrap">{atual.problema}</span>}
            </Dado>
          </SecaoDados>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Itens</h3>
            <ul className="flex flex-col divide-y rounded-xl border">
              {atual.itens.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium break-words">{item.descricao}</p>
                    <p className="text-muted-foreground tabular-nums">
                      {item.tipo === "servico" ? "Serviço" : "Peça"} · {formatarQuantidade(item.quantidade)} {item.unidade}{" "}
                      × {formatarBRL(item.valor)}
                    </p>
                  </div>
                  <p className="shrink-0 font-medium tabular-nums">{formatarBRL(subtotalItem(item))}</p>
                </li>
              ))}
            </ul>
            <ResumoTotais totais={totais} className="rounded-xl border p-3" />
          </section>

          <SecaoDados titulo="Para o cliente">
            <Dado rotulo="Observações" largo>
              {atual.observacoes && <span className="whitespace-pre-wrap">{atual.observacoes}</span>}
            </Dado>
            <Dado rotulo="Emitido em">{new Date(atual.criadoEm).toLocaleDateString("pt-BR")}</Dado>
            <Dado rotulo="Validade">{`${atual.validadeDias} dias`}</Dado>
          </SecaoDados>
        </div>

        <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t">
          <Button
            variant="outline"
            className="text-destructive"
            aria-label={`Excluir ${atual.numero}`}
            onClick={() => aoExcluir(atual)}
          >
            <Trash2 />
          </Button>
          <Button variant="outline" onClick={() => aoImprimir(atual)}>
            <Printer /> Imprimir
          </Button>
          {podeEditar(atual) && (
            <Button variant="outline" onClick={() => aoEditar(atual)}>
              <Pencil /> Editar
            </Button>
          )}
          {vencido && (
            <Button variant="outline" onClick={() => aoMudar(atual, { renovar: true })}>
              <RefreshCw /> Renovar validade
            </Button>
          )}
          {atual.status === "rascunho" && (
            <Button onClick={() => aoMudar(atual, { status: "enviado" })}>
              <Send /> Marcar como enviado
            </Button>
          )}
          {atual.status === "enviado" && (
            <>
              <Button variant="outline" onClick={() => aoMudar(atual, { status: "recusado" })}>
                <XCircle /> Recusar
              </Button>
              <Button onClick={() => aoMudar(atual, { status: "aprovado" })}>
                <CheckCircle2 /> Aprovar
              </Button>
            </>
          )}
          {atual.status === "aprovado" && (
            <>
              <Button variant="outline" onClick={() => aoMudar(atual, { status: "enviado" })}>
                <RotateCcw /> Reabrir
              </Button>
              <Button onClick={() => aoMudar(atual, { status: "convertido" })}>
                <FilePlus2 /> Converter em OS
              </Button>
            </>
          )}
          {atual.status === "recusado" && (
            <Button variant="outline" onClick={() => aoMudar(atual, { status: "rascunho" })}>
              <RotateCcw /> Reabrir como rascunho
            </Button>
          )}
        </SheetFooter>
      </>
    );
  }
}
