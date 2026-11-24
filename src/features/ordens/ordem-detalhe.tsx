import { useState } from "react";

import { Ban, Check, CircleAlert, Plus, Truck, X } from "lucide-react";
import { toast } from "sonner";

import { FolhaAbas } from "@/components/layout/folha-abas";
import { Dado, SecaoDados } from "@/components/layout/registro-partes";
import { FitaStatus } from "@/components/marca/fita-status";
import { PlacaVeiculo } from "@/components/marca/placa-veiculo";
import { RotuloSecao } from "@/components/marca/rotulo-secao";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { usePode, useSessao } from "@/features/auth/sessao";
import { subtotalItem } from "@/features/orcamentos/calculo";
import { useOrcamentos } from "@/features/orcamentos/api";
import { ResumoTotais } from "@/features/orcamentos/orcamento-partes";
import { type ItemEscolhido, SeletorItem } from "@/features/orcamentos/seletor-item";
import { usePessoas } from "@/features/pessoas/api";
import { mascararTelefone } from "@/features/pessoas/documento";
import { useVeiculos } from "@/features/veiculos/api";
import { useVendas } from "@/features/vendas/api";
import { centavosParaTexto, formatarBRL, formatarQuantidade, mascararMoeda, mascararQuantidade, numeroParaTexto, textoParaCentavos, textoParaNumero } from "@/lib/numeros";

import { useCancelarOrdem, useDecidirExtra, useIncluirItem, useMudarEtapa, useRemoverItem, useSalvarLaudo } from "./api";
import { EntregaOrdem } from "./entrega-ordem";
import { ETAPAS, infoStatus, type ItemOrdem, noPatio, type Ordem, tempoDesde, totaisDaOrdem } from "./tipos";

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Folha da OS: etapa, itens (com extras para aprovar), laudo e linha do tempo; entrega gera a venda. Quem usa troca a `key` por OS. */
export function OrdemDetalhe({ ordem, aoFechar }: { ordem: Ordem | null; aoFechar: () => void }) {
  const clientes = usePessoas("cliente");
  const veiculos = useVeiculos();
  const orcamentos = useOrcamentos(usePode("orcamentos.ver"));
  const vendas = useVendas(usePode("vendas.ver"));
  const podeEditar = usePode("ordens.editar");
  const podeExecutar = usePode("ordens.executar");
  const meuNome = useSessao((s) => s.eu?.nome ?? "");
  const podeNegociar = usePode("orcamentos.editar");
  const podeEntregar = usePode("vendas.editar");
  const verValores = usePode("valores.ver");

  const mudarEtapa = useMudarEtapa();
  const incluir = useIncluirItem();
  const decidir = useDecidirExtra();
  const remover = useRemoverItem();
  const salvarLaudo = useSalvarLaudo();
  const cancelar = useCancelarOrdem();

  const [laudo, setLaudo] = useState(ordem?.laudo ?? "");
  const [seletor, setSeletor] = useState(false);
  const [escolhido, setEscolhido] = useState<ItemEscolhido | null>(null);
  const [quantidade, setQuantidade] = useState("1");
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [entrega, setEntrega] = useState({ aberto: false, abertura: 0 });
  const [tirando, setTirando] = useState<ItemOrdem | null>(null);
  // Aprovação de extra com o preço combinado (o mecânico pode ter apontado avulso sem preço).
  const [aprovando, setAprovando] = useState<{ item: ItemOrdem; valor: string; quantidade: string } | null>(null);

  if (!ordem) return <Sheet open={false} />;

  const cliente = clientes.find((c) => c.id === ordem.clienteId);
  const veiculo = veiculos.find((v) => v.id === ordem.veiculoId);
  const orcamento = orcamentos.find((o) => o.id === ordem.orcamentoId);
  const venda = vendas.find((v) => v.id === ordem.vendaId);
  const ordemId = ordem.id;
  const info = infoStatus(ordem.status);
  const aberta = noPatio(ordem);
  const pendentes = ordem.itens.filter((i) => i.situacao === "pendente");
  const aprovados = ordem.itens.filter((i) => i.situacao === "aprovado");

  async function executar(acao: () => Promise<unknown>, sucesso?: string) {
    try {
      await acao();
      if (sucesso) toast.success(sucesso);
    } catch (falha) {
      toast.error(falha instanceof Error ? falha.message : "Não foi possível salvar. Tente de novo.");
    }
  }

  const incluirEscolhido = () =>
    executar(async () => {
      if (!escolhido) return;
      const qtd = textoParaNumero(quantidade);
      if (!(qtd > 0)) throw new Error("Informe a quantidade.");
      await incluir.mutateAsync({ id: ordem.id, item: { tipo: escolhido.tipo, origemId: escolhido.origemId, descricao: escolhido.descricao, unidade: escolhido.unidade, quantidade: qtd, valor: escolhido.valor } });
      setEscolhido(null);
    }, podeNegociar ? "Item incluído." : "Extra apontado. A recepção vai falar com o cliente.");

  function linhaItem(item: ItemOrdem) {
    const recusado = item.situacao === "recusado";
    const podeTirar = aberta && podeExecutar && (podeNegociar || (item.situacao === "pendente" && item.criadoPor === meuNome));
    return (
      <li key={item.id} className="flex flex-col gap-2 p-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div className={`min-w-0 ${recusado ? "text-muted-foreground line-through" : ""}`}>
            <p className="font-medium break-words">{item.descricao}</p>
            <p className="text-muted-foreground tabular-nums text-xs">
              {item.tipo === "servico" ? "Serviço" : "Peça"} · {formatarQuantidade(item.quantidade)} {item.unidade}
              {verValores && ` × ${formatarBRL(item.valor)}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {verValores && <span className={`font-semibold tabular-nums ${recusado ? "text-muted-foreground line-through" : ""}`}>{formatarBRL(subtotalItem(item))}</span>}
            {podeTirar && (
              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Tirar ${item.descricao}`} onClick={() => setTirando(item)}>
                <X />
              </Button>
            )}
          </div>
        </div>
        {item.situacao === "pendente" && (
          <div className="flex flex-wrap items-center gap-2">
            <FitaStatus tom="atencao" icone={CircleAlert}>
              Aguardando cliente
            </FitaStatus>
            {item.criadoPor && <span className="text-muted-foreground text-xs">apontado por {item.criadoPor}</span>}
            {podeNegociar && aberta && (
              <span className="ml-auto flex gap-2">
                <Button type="button" variant="outline" className="h-11" onClick={() => executar(() => decidir.mutateAsync({ id: ordemId, itemId: item.id, situacao: "recusado" }))}>
                  <X /> Recusou
                </Button>
                <Button
                  type="button"
                  className="h-11"
                  onClick={() =>
                    verValores
                      ? setAprovando({ item, valor: centavosParaTexto(item.valor), quantidade: numeroParaTexto(item.quantidade) })
                      : executar(() => decidir.mutateAsync({ id: ordemId, itemId: item.id, situacao: "aprovado" }))
                  }
                >
                  <Check /> Aprovou
                </Button>
              </span>
            )}
          </div>
        )}
        {recusado && <span className="text-muted-foreground text-xs">Recusado pelo cliente</span>}
      </li>
    );
  }

  const servico = (
    <>
      {aberta && podeExecutar && (
        <section className="flex flex-col gap-2">
          <RotuloSecao>Etapa</RotuloSecao>
          <div className="grid grid-cols-2 gap-2">
            {ETAPAS.map(({ status, texto, icone: Icone }) => (
              <Button
                key={status}
                type="button"
                className="h-12"
                variant={ordem.status === status ? "default" : "outline"}
                aria-pressed={ordem.status === status}
                disabled={mudarEtapa.isPending}
                carregando={mudarEtapa.isPending && mudarEtapa.variables?.status === status}
                onClick={() => ordem.status !== status && executar(() => mudarEtapa.mutateAsync({ id: ordem.id, status }), `${ordem.numero}: ${texto}.`)}
              >
                <Icone /> {texto}
              </Button>
            ))}
          </div>
        </section>
      )}

      <SecaoDados titulo="Cliente e veículo">
        <Dado rotulo="Cliente">{cliente?.nome ?? "Cliente removido"}</Dado>
        <Dado rotulo="Telefone">{cliente ? mascararTelefone(cliente.celular || cliente.telefone) : ""}</Dado>
        <Dado rotulo="Veículo">{veiculo?.modelo ?? "Veículo removido"}</Dado>
        <Dado rotulo="Quilometragem">{ordem.km > 0 ? `${formatarQuantidade(ordem.km)} km` : ""}</Dado>
        <Dado rotulo="Problema relatado" largo>
          {ordem.problema && <span className="whitespace-pre-wrap">{ordem.problema}</span>}
        </Dado>
      </SecaoDados>

      <section className="flex flex-col gap-3">
        <RotuloSecao>Peças e serviços</RotuloSecao>
        {pendentes.length > 0 && (
          <p className="border-atencao/40 bg-atencao-fundo rounded-md border p-3 text-sm">
            {pendentes.length} extra{pendentes.length > 1 ? "s" : ""} {pendentes.length > 1 ? "aguardam" : "aguarda"} a aprovação do cliente{podeNegociar ? ": ligue e marque abaixo." : "."}
          </p>
        )}
        {ordem.itens.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum item ainda.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {ordem.itens.map(linhaItem)}
          </ul>
        )}
        {aberta && podeExecutar && (
          <Button type="button" variant="outline" className="h-12 self-start" onClick={() => setSeletor(true)}>
            <Plus /> {podeNegociar ? "Incluir peça ou serviço" : "Apontar peça ou serviço"}
          </Button>
        )}
        {verValores && aprovados.length > 0 && <ResumoTotais totais={totaisDaOrdem(ordem)} className="rounded-md border p-3" />}
      </section>

      <section className="flex flex-col gap-2">
        <RotuloSecao>Laudo</RotuloSecao>
        {aberta && podeExecutar ? (
          <>
            <Textarea aria-label="Laudo" rows={4} value={laudo} onChange={(e) => setLaudo(e.target.value)} placeholder="O que foi encontrado e o que recomendar para a próxima visita." />
            <Button type="button" variant="outline" className="self-start" disabled={laudo === ordem.laudo} carregando={salvarLaudo.isPending} onClick={() => executar(() => salvarLaudo.mutateAsync({ id: ordem.id, laudo }), "Laudo salvo.")}>
              Salvar laudo
            </Button>
          </>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{ordem.laudo || <span className="text-muted-foreground">Sem laudo.</span>}</p>
        )}
      </section>
    </>
  );

  const historico = (
    <ol className="flex flex-col gap-3">
      {[...ordem.eventos].reverse().map((e, i) => (
        <li key={i} className="bg-muted rounded-lg px-3 py-2 text-sm">
          <p>{e.texto}</p>
          <p className="text-muted-foreground tabular-nums text-xs">
            {quando(e.criadoEm)}
            {e.quem && ` · ${e.quem}`}
          </p>
        </li>
      ))}
    </ol>
  );

  return (
    <Sheet open onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-2xl!">
        <SheetHeader className="border-b">
          <SheetTitle className="pr-8 font-mono">{ordem.numero}</SheetTitle>
          <SheetDescription>
            {[veiculo?.modelo, cliente?.nome].filter(Boolean).join(" · ")}
            {orcamento && ` · do orçamento ${orcamento.numero}`}
          </SheetDescription>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <FitaStatus tom={info.tom} icone={info.icone}>
              {info.texto}
            </FitaStatus>
            {veiculo?.placa && <PlacaVeiculo placa={veiculo.placa} />}
            <span className="text-muted-foreground tabular-nums text-xs">{aberta ? `aberta ${tempoDesde(ordem.criadoEm)}` : venda ? `venda ${venda.numero}` : ""}</span>
          </div>
        </SheetHeader>

        <FolhaAbas
          abas={[
            { id: "servico", titulo: "Serviço", conteudo: servico },
            { id: "historico", titulo: `Histórico (${ordem.eventos.length})`, conteudo: historico },
          ]}
        />

        {aberta && podeEditar && (
          <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t">
            <Button type="button" variant="outline" className="text-destructive" onClick={() => setCancelando(true)}>
              <Ban /> Cancelar OS
            </Button>
            {podeEntregar && (
              <Button type="button" className="flex-1 sm:flex-none" disabled={ordem.status !== "pronto" || pendentes.length > 0 || aprovados.length === 0} onClick={() => setEntrega((a) => ({ aberto: true, abertura: a.abertura + 1 }))}>
                <Truck /> Entregar
              </Button>
            )}
            {podeEntregar && (ordem.status !== "pronto" || pendentes.length > 0 || aprovados.length === 0) && (
              <p className="text-muted-foreground w-full text-right text-xs">
                {ordem.status !== "pronto" ? "Para entregar, marque a etapa Pronto." : pendentes.length > 0 ? "Para entregar, resolva os extras com o cliente." : "Inclua ao menos um item aprovado para entregar."}
              </p>
            )}
          </SheetFooter>
        )}

        <SeletorItem
          aberto={seletor}
          documento="OS"
          aoFechar={() => setSeletor(false)}
          aoEscolher={(item) => {
            setSeletor(false);
            setQuantidade("1");
            setEscolhido(item);
          }}
        />

        <Dialog open={escolhido !== null} onOpenChange={(open) => !open && setEscolhido(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{escolhido?.descricao}</DialogTitle>
              <DialogDescription>{podeNegociar ? "Entra aprovado na OS." : "Entra como extra, aguardando a aprovação do cliente."}</DialogDescription>
            </DialogHeader>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="os-qtd">Quantidade ({escolhido?.unidade})</FieldLabel>
              <Input id="os-qtd" inputMode="decimal" className="tabular-nums" value={quantidade} onChange={(e) => setQuantidade(mascararQuantidade(e.target.value))} />
            </Field>
            <DialogFooter className="flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEscolhido(null)}>
                Voltar
              </Button>
              <Button type="button" carregando={incluir.isPending} onClick={incluirEscolhido}>
                {podeNegociar ? "Incluir" : "Apontar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={cancelando} onOpenChange={setCancelando}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar {ordem.numero}?</AlertDialogTitle>
              <AlertDialogDescription>O carro sai do pátio sem gerar venda. {orcamento ? "O orçamento volta a ficar aprovado." : ""}</AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea aria-label="Motivo do cancelamento" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional): cliente desistiu, levou para outra oficina..." />
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                aoConfirmar={async () => {
                  await executar(() => cancelar.mutateAsync({ id: ordem.id, motivo: motivo.trim() }), `${ordem.numero} cancelada.`);
                  setCancelando(false);
                }}
              >
                Cancelar OS
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={tirando !== null} onOpenChange={(open) => !open && setTirando(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tirar {tirando?.descricao} da OS?</AlertDialogTitle>
              <AlertDialogDescription>O item sai da OS e não vai para a venda.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                aoConfirmar={async () => {
                  if (tirando) await executar(() => remover.mutateAsync({ id: ordem.id, itemId: tirando.id }), "Item tirado da OS.");
                  setTirando(null);
                }}
              >
                Tirar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={aprovando !== null} onOpenChange={(open) => !open && setAprovando(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Cliente aprovou: {aprovando?.item.descricao}</DialogTitle>
              <DialogDescription>Confira a quantidade e o preço combinado antes de aprovar.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="aprov-qtd">Quantidade</FieldLabel>
                <Input id="aprov-qtd" inputMode="decimal" className="tabular-nums" value={aprovando?.quantidade ?? ""} onChange={(e) => aprovando && setAprovando({ ...aprovando, quantidade: mascararQuantidade(e.target.value) })} />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="aprov-valor">Valor unitário (R$)</FieldLabel>
                <Input id="aprov-valor" inputMode="numeric" className="tabular-nums" value={aprovando?.valor ?? ""} onChange={(e) => aprovando && setAprovando({ ...aprovando, valor: mascararMoeda(e.target.value) })} />
              </Field>
            </div>
            {aprovando && textoParaCentavos(aprovando.valor) === 0 && <p className="text-atencao text-sm">Valor zerado: o item entra de graça na venda.</p>}
            <DialogFooter className="flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAprovando(null)}>
                Voltar
              </Button>
              <Button
                type="button"
                carregando={decidir.isPending}
                onClick={() =>
                  aprovando &&
                  executar(async () => {
                    const qtd = textoParaNumero(aprovando.quantidade);
                    if (!(qtd > 0)) throw new Error("Informe a quantidade.");
                    await decidir.mutateAsync({ id: ordem.id, itemId: aprovando.item.id, situacao: "aprovado", valor: textoParaCentavos(aprovando.valor), quantidade: qtd });
                    setAprovando(null);
                  }, "Extra aprovado.")
                }
              >
                <Check /> Aprovar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <EntregaOrdem key={entrega.abertura} ordem={entrega.aberto ? ordem : null} aoFechar={() => setEntrega((a) => ({ ...a, aberto: false }))} />
      </SheetContent>
    </Sheet>
  );
}
