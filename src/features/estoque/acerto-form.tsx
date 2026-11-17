import { useProdutos } from "@/features/produtos/api";
import { useState } from "react";

import { ListPlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SecaoFormulario } from "@/components/layout/registro-partes";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SeletorProduto } from "@/features/produtos/seletor-produto";
import { formatarQuantidade, mascararQuantidade, proximoCodigo, textoParaNumero } from "@/lib/numeros";

import { diferencaAcerto, movimentarEstoque } from "./movimentar";
import { MOTIVOS_ACERTO } from "./acerto";
import { useAcertosStore } from "./acerto-store";

type Linha = { produtoId: string; contado: string };

/**
 * Painel lateral de acerto de estoque: a pessoa conta as peças na prateleira, digita a
 * contagem e o sistema ajusta o saldo pela diferença. Depois de salvo o acerto não se altera:
 * o histórico fica na Movimentação de estoque. Quem usa deve trocar a `key` a cada abertura.
 */
export function AcertoForm({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const produtos = useProdutos();
  const acertos = useAcertosStore((estado) => estado.itens);
  const adicionar = useAcertosStore((estado) => estado.adicionar);

  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [erros, setErros] = useState<{ motivo?: string; itens?: string; linhas: Record<string, string> }>({ linhas: {} });

  const produtoDe = (id: string) => produtos.find((produto) => produto.id === id);

  function adicionarProduto(produtoId: string) {
    setLinhas((atual) => (atual.some((l) => l.produtoId === produtoId) ? atual : [...atual, { produtoId, contado: "" }]));
  }

  function adicionarTodos() {
    setLinhas((atual) => [
      ...atual,
      ...produtos.filter((p) => p.ativo && !atual.some((l) => l.produtoId === p.id)).map((p) => ({ produtoId: p.id, contado: "" })),
    ]);
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const novos: typeof erros = { linhas: {} };
    if (motivo === "") novos.motivo = "Escolha o motivo.";
    if (linhas.length === 0) novos.itens = "Adicione ao menos um produto.";
    for (const linha of linhas) {
      if (linha.contado.trim() === "") novos.linhas[linha.produtoId] = "Informe a quantidade contada.";
    }
    if (novos.motivo || novos.itens || Object.keys(novos.linhas).length > 0) {
      setErros(novos);
      return;
    }

    const numero = proximoCodigo("ACE", acertos.map((item) => item.numero));
    const itens = linhas.flatMap((linha) => {
      const produto = produtoDe(linha.produtoId);
      return produto
        ? [{ produtoId: produto.id, descricao: produto.descricao, unidade: produto.unidade, saldoSistema: produto.saldo, contado: textoParaNumero(linha.contado) }]
        : [];
    });
    for (const item of itens) {
      movimentarEstoque({
        produtoId: item.produtoId,
        delta: diferencaAcerto(item.saldoSistema, item.contado),
        origem: "acerto",
        documento: numero,
        motivo,
      });
    }
    adicionar({ numero, motivo, observacoes, itens });
    const ajustados = itens.filter((item) => item.contado !== item.saldoSistema).length;
    toast.success(`${numero} registrado: ${ajustados} ${ajustados === 1 ? "produto ajustado" : "produtos ajustados"}.`);
    aoFechar();
  }

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-2xl!">
        <SheetHeader className="border-b">
          <SheetTitle>Novo acerto de estoque</SheetTitle>
          <SheetDescription>Informe a quantidade contada de cada peça. O saldo é ajustado pela diferença.</SheetDescription>
        </SheetHeader>

        <form noValidate onSubmit={enviar} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-8 overflow-y-auto p-4">
            <SecaoFormulario titulo="Motivo">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field className="gap-1.5" data-invalid={!!erros.motivo}>
                  <FieldLabel htmlFor="acerto-motivo">Motivo</FieldLabel>
                  <NativeSelect
                    id="acerto-motivo"
                    className="w-full"
                    value={motivo}
                    aria-invalid={!!erros.motivo}
                    onChange={(evento) => setMotivo(evento.target.value)}
                  >
                    <NativeSelectOption value="">Selecione</NativeSelectOption>
                    {MOTIVOS_ACERTO.map((texto) => (
                      <NativeSelectOption key={texto} value={texto}>
                        {texto}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  {erros.motivo && <p role="alert" className="text-destructive text-sm">{erros.motivo}</p>}
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="acerto-observacoes">Observação (opcional)</FieldLabel>
                  <Input id="acerto-observacoes" value={observacoes} maxLength={200} onChange={(evento) => setObservacoes(evento.target.value)} />
                </Field>
              </div>
            </SecaoFormulario>

            <SecaoFormulario titulo="Produtos contados" descricao="Peças que você não incluir aqui não são alteradas.">
              <div className="flex flex-col gap-3">
                {linhas.map((linha) => {
                  const produto = produtoDe(linha.produtoId);
                  if (!produto) return null;
                  const preenchido = linha.contado.trim() !== "";
                  const diferenca = preenchido ? diferencaAcerto(produto.saldo, textoParaNumero(linha.contado)) : null;
                  return (
                    <div key={linha.produtoId} className="bg-card flex flex-col gap-3 rounded-xl border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{produto.descricao}</p>
                          <p className="text-muted-foreground text-sm">
                            {produto.codigo} · Sistema: {formatarQuantidade(produto.saldo)} {produto.unidade}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground shrink-0"
                          aria-label={`Remover ${produto.descricao}`}
                          onClick={() => setLinhas((atual) => atual.filter((l) => l.produtoId !== linha.produtoId))}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <div className="flex items-end gap-3">
                        <Field className="min-w-0 flex-1 gap-1.5" data-invalid={!!erros.linhas[linha.produtoId]}>
                          <FieldLabel htmlFor={`acerto-contado-${linha.produtoId}`}>Contado ({produto.unidade})</FieldLabel>
                          <Input
                            id={`acerto-contado-${linha.produtoId}`}
                            inputMode="decimal"
                            placeholder="0"
                            value={linha.contado}
                            aria-invalid={!!erros.linhas[linha.produtoId]}
                            onChange={(evento) =>
                              setLinhas((atual) =>
                                atual.map((l) => (l.produtoId === linha.produtoId ? { ...l, contado: mascararQuantidade(evento.target.value) } : l)),
                              )
                            }
                          />
                        </Field>
                        <p
                          className={`pb-2 text-sm tabular-nums ${diferenca === null || diferenca === 0 ? "text-muted-foreground" : diferenca > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}
                        >
                          {diferenca === null ? "—" : diferenca === 0 ? "Sem diferença" : `${diferenca > 0 ? "+" : "−"}${formatarQuantidade(Math.abs(diferenca))}`}
                        </p>
                      </div>
                      {erros.linhas[linha.produtoId] && (
                        <p role="alert" className="text-destructive text-sm">{erros.linhas[linha.produtoId]}</p>
                      )}
                    </div>
                  );
                })}

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setSeletorAberto(true)}>
                    <Plus /> Adicionar produto
                  </Button>
                  <Button type="button" variant="outline" onClick={adicionarTodos}>
                    <ListPlus /> Todos os ativos
                  </Button>
                </div>
                {erros.itens && <p role="alert" className="text-destructive text-sm">{erros.itens}</p>}
              </div>
            </SecaoFormulario>
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none">
              Registrar acerto
            </Button>
          </SheetFooter>
        </form>

        <SeletorProduto
          aberto={seletorAberto}
          aoFechar={() => setSeletorAberto(false)}
          aoEscolher={(produto) => adicionarProduto(produto.id)}
          ocultar={linhas.map((l) => l.produtoId)}
        />
      </SheetContent>
    </Sheet>
  );
}
