import { Pencil, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

import { Dado, SecaoDados } from "@/components/layout/registro-partes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/features/pessoas/pessoa-partes";
import { formatarBRL } from "@/lib/numeros";

import { formatarGarantia, formatarTempo, rotuloCategoriaServico, type Servico } from "./tipos";

/** Painel lateral de visualização de um serviço. */
export function ServicoDetalhe({
  aberto,
  servico,
  aoFechar,
  aoEditar,
  aoAlternarAtivo,
  aoExcluir,
}: {
  aberto: boolean;
  servico: Servico | null;
  aoFechar: () => void;
  aoEditar: (servico: Servico) => void;
  aoAlternarAtivo: (servico: Servico) => void;
  aoExcluir: (servico: Servico) => void;
}) {
  return (
    <Sheet open={aberto && servico !== null} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-xl!">
        {servico && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="pr-8 break-words">{servico.descricao}</SheetTitle>
              <SheetDescription>{servico.codigo}</SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="secondary" className="font-normal">
                  {rotuloCategoriaServico(servico.categoria)}
                </Badge>
                <StatusBadge ativo={servico.ativo} />
              </div>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
              <SecaoDados titulo="Valor e tempo">
                <Dado rotulo="Valor da mão de obra">{servico.valor > 0 ? formatarBRL(servico.valor) : ""}</Dado>
                <Dado rotulo="Tempo estimado">{formatarTempo(servico.tempoHoras)}</Dado>
              </SecaoDados>

              <SecaoDados titulo="Garantia">
                <Dado rotulo="Prazo e quilometragem" largo>
                  {formatarGarantia(servico)}
                </Dado>
              </SecaoDados>

              <SecaoDados titulo="Outras informações">
                <Dado rotulo="Observações" largo>
                  {servico.observacoes && <span className="whitespace-pre-wrap">{servico.observacoes}</span>}
                </Dado>
                <Dado rotulo="Cadastrado em">
                  {new Date(servico.criadoEm).toLocaleDateString("pt-BR", {
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
                aria-label={`Excluir ${servico.descricao}`}
                onClick={() => aoExcluir(servico)}
              >
                <Trash2 /> Excluir
              </Button>
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => aoAlternarAtivo(servico)}>
                {servico.ativo ? <ToggleLeft /> : <ToggleRight />}
                {servico.ativo ? "Inativar" : "Ativar"}
              </Button>
              <Button className="flex-1 sm:flex-none" onClick={() => aoEditar(servico)}>
                <Pencil /> Editar
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
