import { useEffect, useState } from "react";

import { Link } from "@tanstack/react-router";
import { CalendarPlus, ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Tv, UserX, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Listagem, ListagemCabecalho, ListagemVazia } from "@/components/layout/listagem";
import { FitaStatus } from "@/components/marca/fita-status";
import { PlacaVeiculo } from "@/components/marca/placa-veiculo";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePode } from "@/features/auth/sessao";
import { usePessoas } from "@/features/pessoas/api";
import { useVeiculos } from "@/features/veiculos/api";
import { hojeISO, somarDias } from "@/features/vendas/parcelas";
import { cn } from "@/lib/utils";

import { AgendamentoForm } from "./agendamento-form";
import { useAgendamentos, useMudarSituacao, useRegistrarChegada } from "./api";
import { ModoTvDialog } from "./modo-tv";
import { type Agendamento, diaCurto, diaMes, diaPorExtenso, diasDaSemana, inicioDaSemana, porHorario, SITUACOES } from "./tipos";

/** Agenda da oficina: a semana em faixa, os carros do dia por horário e a chegada, que abre a OS. */
/** Dia (AAAA-MM-DD) e hora (HH:MM) de agora, atualizados a cada minuto. */
function useAgora() {
  const ler = () => {
    const d = new Date();
    return { dia: hojeISO(d), hora: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` };
  };
  const [agora, setAgora] = useState(ler);
  useEffect(() => {
    const id = setInterval(() => setAgora(ler()), 60_000);
    return () => clearInterval(id);
  }, []);
  return agora;
}

export function Agenda() {
  const agora = useAgora();
  const hoje = agora.dia;
  const [dia, setDia] = useState(hoje);
  const segunda = inicioDaSemana(dia);
  const dias = diasDaSemana(segunda);
  const consulta = useAgendamentos(segunda, dias[6]);
  const todos = consulta.data ?? [];
  const doDia = todos.filter((a) => a.data === dia).sort(porHorario);

  const podeEditar = usePode("agenda.editar");
  const podeAbrirOs = usePode("ordens.editar");
  const podeTv = usePode("empresa.gerenciar");

  const [form, setForm] = useState<{ aberto: boolean; editando: Agendamento | null; abertura: number }>({ aberto: false, editando: null, abertura: 0 });
  const [chegando, setChegando] = useState<Agendamento | null>(null);
  const [cancelando, setCancelando] = useState<Agendamento | null>(null);
  const [tvAberta, setTvAberta] = useState(false);
  const mudarSituacao = useMudarSituacao();

  const abrirForm = (editando: Agendamento | null) => setForm((a) => ({ aberto: true, editando, abertura: a.abertura + 1 }));
  const marcados = (data: string) => todos.filter((a) => a.data === data && a.status !== "cancelado").length;

  async function marcarFalta(agendamento: Agendamento) {
    try {
      await mudarSituacao.mutateAsync({ id: agendamento.id, status: "faltou" });
      toast.success("Marcado como falta.");
    } catch (falha) {
      toast.error(falha instanceof Error ? falha.message : "Não foi possível salvar.");
    }
  }

  return (
    <Listagem>
      <ListagemCabecalho
        titulo="Agenda"
        descricao="Carros marcados por dia. Quando o carro chegar, abra a OS por aqui."
        rotuloNovo="Novo agendamento"
        aoNovo={podeEditar ? () => abrirForm(null) : undefined}
        acoes={
          podeTv && (
            <Button variant="outline" onClick={() => setTvAberta(true)}>
              <Tv /> <span className="max-sm:sr-only">Modo TV</span>
            </Button>
          )
        }
      />

      {/* Semana: setas, "Hoje" e um botão por dia com a quantidade de carros. */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium first-letter:uppercase">
            {new Date(`${segunda}T12:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" aria-label="Semana anterior" onClick={() => setDia(somarDias(dia, -7))}>
              <ChevronLeft />
            </Button>
            <Button variant="outline" disabled={inicioDaSemana(hoje) === segunda && dia === hoje} onClick={() => setDia(hoje)}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" aria-label="Próxima semana" onClick={() => setDia(somarDias(dia, 7))}>
              <ChevronRight />
            </Button>
          </div>
        </div>
        <div role="tablist" aria-label="Dias da semana" className="grid grid-cols-7 gap-1.5">
          {dias.map((d) => {
            const ativo = d === dia;
            const total = marcados(d);
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => setDia(d)}
                className={cn(
                  "focus-visible:ring-ring flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center outline-none focus-visible:ring-2",
                  ativo ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                )}
              >
                <span className={cn("text-xs capitalize", !ativo && "text-muted-foreground")}>{diaCurto(d)}</span>
                <span className={cn("text-lg leading-none font-semibold tabular-nums", d === hoje && !ativo && "text-primary")}>{d.slice(8, 10)}</span>
                <span className={cn("text-[11px] tabular-nums", ativo ? "text-primary-foreground/80" : "text-muted-foreground", total === 0 && "opacity-0")}>
                  {total} {total === 1 ? "carro" : "carros"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-semibold first-letter:uppercase">
          {dia === hoje ? "Hoje" : diaPorExtenso(dia)}
          {dia === hoje && <span className="font-normal">, {diaMes(dia)}</span>}
        </h2>
        {consulta.isPending ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : consulta.isError ? (
          <ListagemVazia>{consulta.error.message}</ListagemVazia>
        ) : doDia.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-10 text-center">
            <p className="text-muted-foreground text-sm">Nenhum carro marcado para este dia.</p>
            {podeEditar && dia >= hoje && (
              <Button variant="outline" onClick={() => abrirForm(null)}>
                <CalendarPlus /> Agendar
              </Button>
            )}
          </div>
        ) : (
          <ul className="bg-card flex flex-col divide-y overflow-hidden rounded-xl border">
            {doDia.map((a) => (
              <LinhaAgendamento
                key={a.id}
                agendamento={a}
                agora={agora}
                podeEditar={podeEditar}
                podeAbrirOs={podeAbrirOs}
                aoChegar={() => setChegando(a)}
                aoEditar={() => abrirForm(a)}
                aoFaltar={() => void marcarFalta(a)}
                aoCancelar={() => setCancelando(a)}
              />
            ))}
          </ul>
        )}
      </section>

      <AgendamentoForm key={form.abertura} aberto={form.aberto} editando={form.editando} dataInicial={dia < hoje ? hoje : dia} aoFechar={() => setForm((a) => ({ ...a, aberto: false }))} />
      <ChegadaDialog agendamento={chegando} aoFechar={() => setChegando(null)} />
      <AlertDialog open={cancelando !== null} onOpenChange={(aberto) => !aberto && setCancelando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelando && `${cancelando.hora} · ${cancelando.servico}. O horário fica livre e o cancelamento vai para a auditoria.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              aoConfirmar={async () => {
                if (!cancelando) return;
                try {
                  await mudarSituacao.mutateAsync({ id: cancelando.id, status: "cancelado" });
                  toast.success("Agendamento cancelado.");
                } catch (falha) {
                  toast.error(falha instanceof Error ? falha.message : "Não foi possível cancelar.");
                }
                setCancelando(null);
              }}
            >
              Cancelar agendamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {podeTv && <ModoTvDialog aberto={tvAberta} aoFechar={() => setTvAberta(false)} />}
    </Listagem>
  );
}

function LinhaAgendamento({
  agendamento: a,
  agora,
  podeEditar,
  podeAbrirOs,
  aoChegar,
  aoEditar,
  aoFaltar,
  aoCancelar,
}: {
  agendamento: Agendamento;
  agora: { dia: string; hora: string };
  podeEditar: boolean;
  podeAbrirOs: boolean;
  aoChegar: () => void;
  aoEditar: () => void;
  aoFaltar: () => void;
  aoCancelar: () => void;
}) {
  const clientes = usePessoas("cliente");
  const veiculos = useVeiculos();
  const veiculo = veiculos.find((v) => v.id === a.veiculoId);
  const cliente = clientes.find((c) => c.id === a.clienteId);
  const resolvido = a.status !== "agendado";
  // Passou do horário (ou do dia) e o carro não chegou.
  const atrasado = !resolvido && (a.data < agora.dia || (a.data === agora.dia && a.hora < agora.hora));
  const situacao = atrasado ? { texto: "Atrasado", tom: "atencao" as const, icone: SITUACOES.agendado.icone } : SITUACOES[a.status];

  return (
    <li className={cn("flex items-start gap-4 px-4 py-3", (a.status === "cancelado" || a.status === "faltou") && "opacity-60")}>
      <span className={cn("w-14 shrink-0 pt-0.5 text-lg font-semibold tabular-nums", a.status === "cancelado" && "line-through")}>{a.hora}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{veiculo?.modelo ?? "Veículo removido"}</span>
          {veiculo?.placa && <PlacaVeiculo placa={veiculo.placa} tamanho="sm" />}
        </div>
        <p className="text-sm break-words">{a.servico}</p>
        <p className="text-muted-foreground text-sm">
          {cliente?.nome ?? "Cliente removido"}
          {a.observacoes && ` · ${a.observacoes}`}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
        {a.status === "chegou" && a.ordemNumero ? (
          <Link to="/ordens" className="text-primary text-sm font-medium hover:underline">
            {a.ordemNumero} →
          </Link>
        ) : (
          <FitaStatus tom={situacao.tom} icone={situacao.icone}>
            {situacao.texto}
          </FitaStatus>
        )}
        {!resolvido && (podeAbrirOs || podeEditar) && (
          <div className="flex items-center gap-1">
            {podeAbrirOs && (
              <Button size="sm" onClick={aoChegar}>
                Chegou
              </Button>
            )}
            {podeEditar && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Ações do agendamento das ${a.hora}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={aoEditar}>
                    <Pencil /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={aoFaltar}>
                    <UserX /> Faltou
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={aoCancelar}>
                    <XCircle /> Cancelar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/** Chegada: confirma o km e abre a OS com o serviço previsto. */
function ChegadaDialog({ agendamento, aoFechar }: { agendamento: Agendamento | null; aoFechar: () => void }) {
  const veiculos = useVeiculos();
  const registrar = useRegistrarChegada();
  const veiculo = veiculos.find((v) => v.id === agendamento?.veiculoId);
  const [km, setKm] = useState("");
  const kmInicial = veiculo?.km ? String(veiculo.km) : "";

  async function confirmar() {
    if (!agendamento) return;
    try {
      const feito = await registrar.mutateAsync({ id: agendamento.id, km: Number((km || kmInicial).replace(/\D/g, "")) || 0 });
      toast.success(`${feito.ordemNumero} aberta. O carro entrou na fila do pátio.`);
      aoFechar();
      setKm("");
    } catch (falha) {
      toast.error(falha instanceof Error ? falha.message : "Não foi possível abrir a OS.");
    }
  }

  return (
    <Dialog open={agendamento !== null} onOpenChange={(aberto) => !aberto && !registrar.isPending && aoFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>O carro chegou?</DialogTitle>
          <DialogDescription>
            {veiculo?.modelo ?? "Veículo"} · {agendamento?.servico}. A OS abre com este serviço e o carro entra na fila do pátio.
          </DialogDescription>
        </DialogHeader>
        <Field className="gap-1.5">
          <FieldLabel htmlFor="chegada-km">Quilometragem</FieldLabel>
          <Input id="chegada-km" inputMode="numeric" className="tabular-nums" placeholder={kmInicial || "0"} value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))} />
        </Field>
        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" disabled={registrar.isPending} onClick={aoFechar}>
            Voltar
          </Button>
          <Button carregando={registrar.isPending} onClick={() => void confirmar()}>
            Abrir OS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
