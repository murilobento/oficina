import { type ReactNode, useEffect, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Check, CircleCheck, CircleDashed, PackageSearch, Wrench, WifiOff, type LucideIcon } from "lucide-react";

import { PlacaVeiculo } from "@/components/marca/placa-veiculo";
import { tempoDesde } from "@/features/ordens/tipos";
import { hojeISO } from "@/features/vendas/parcelas";
import { cn } from "@/lib/utils";

type CarroAgenda = { id: string; hora: string; status: "agendado" | "chegou" | "faltou"; servico: string; modelo: string; placa: string; cor: string; ordemNumero: string };
type CarroPatio = { id: string; numero: string; status: Etapa; problema: string; modelo: string; placa: string; cor: string; desde: string };
type Painel = { dia: string; geradoEm: string; empresa: { nome: string; logo: string }; agenda: CarroAgenda[]; patio: CarroPatio[] };
type Etapa = "fila" | "execucao" | "aguardando_peca" | "pronto";

class LinkInvalido extends Error {}

// Cores fixas (a TV não segue o tema do sistema): fundo escuro, texto claro, uma cor por etapa.
const COLUNAS: { etapa: Etapa; texto: string; icone: LucideIcon; cor: string }[] = [
  { etapa: "fila", texto: "Na fila", icone: CircleDashed, cor: "#94a3b8" },
  { etapa: "execucao", texto: "Em execução", icone: Wrench, cor: "#60a5fa" },
  { etapa: "aguardando_peca", texto: "Aguardando peça", icone: PackageSearch, cor: "#fbbf24" },
  { etapa: "pronto", texto: "Pronto", icone: CircleCheck, cor: "#4ade80" },
];

const UM_DIA = 24 * 60 * 60 * 1000;

async function buscarPainel(token: string): Promise<Painel> {
  const resposta = await fetch(`/api/tv/${encodeURIComponent(token)}?dia=${hojeISO()}`, { cache: "no-store" });
  if (resposta.status === 404) throw new LinkInvalido();
  if (!resposta.ok) throw new Error(`Falha ${resposta.status}`);
  return (await resposta.json()) as Painel;
}

/** Relógio que atualiza sozinho. */
function useAgora(intervalo = 10_000) {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), intervalo);
    return () => clearInterval(id);
  }, [intervalo]);
  return agora;
}

/**
 * A letra acompanha o tamanho da tela: 1rem ≈ 17px numa TV 1080p e ≈ 12px em 720p.
 * Só vale enquanto o painel está aberto.
 */
function useEscalaDaTela() {
  useEffect(() => {
    const raiz = document.documentElement;
    const anterior = raiz.style.fontSize;
    raiz.style.fontSize = "clamp(12px, 0.9vw, 30px)";
    return () => {
      raiz.style.fontSize = anterior;
    };
  }, []);
}

/** Mantém a tela acesa (quando o navegador deixa) e entra em tela cheia no primeiro toque. */
function useModoQuiosque() {
  useEffect(() => {
    let trava: { release: () => Promise<void> } | null = null;
    const pedirTrava = async () => {
      try {
        trava = await (navigator as Navigator & { wakeLock?: { request: (tipo: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null;
      } catch {
        // Sem suporte ou sem permissão: segue sem travar a tela.
      }
    };
    void pedirTrava();
    const aoVoltar = () => document.visibilityState === "visible" && void pedirTrava();
    const telaCheia = () => void document.documentElement.requestFullscreen?.().catch(() => {});
    document.addEventListener("visibilitychange", aoVoltar);
    document.addEventListener("click", telaCheia, { once: true });
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      document.removeEventListener("click", telaCheia);
      void trava?.release().catch(() => {});
    };
  }, []);
}

/** Quando o conteúdo não cabe, rola devagar até o fim, espera, e volta ao topo. */
function RolagemAutomatica({ children, className }: { children: ReactNode; className?: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    let quadro = 0;
    let ultimo = performance.now();
    let pausaAte = ultimo + 4000;
    let direcao = 1;
    let posicao = 0;
    const passo = (agora: number) => {
      const sobra = el.scrollHeight - el.clientHeight;
      const tempo = (agora - ultimo) / 1000;
      ultimo = agora;
      if (sobra <= 2) {
        posicao = 0;
        el.scrollTop = 0;
      } else if (agora >= pausaAte) {
        posicao = Math.min(sobra, Math.max(0, posicao + direcao * 28 * tempo));
        el.scrollTop = posicao;
        if (posicao >= sobra || posicao <= 0) {
          direcao = -direcao;
          pausaAte = agora + 4000;
        }
      }
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, []);
  return (
    <div ref={caixa} className={cn("min-h-0 overflow-hidden", className)}>
      {children}
    </div>
  );
}

/** Painel do pátio para a TV: chegadas do dia e as OS por etapa, sem login e só para ver. */
export function PainelTv({ token }: { token: string }) {
  useEscalaDaTela();
  useModoQuiosque();
  const agora = useAgora();
  const consulta = useQuery({
    queryKey: ["tv", token],
    queryFn: () => buscarPainel(token),
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    retry: (tentativas, erro) => !(erro instanceof LinkInvalido) && tentativas < 2,
  });

  if (consulta.error instanceof LinkInvalido) {
    return (
      <Tela>
        <div className="m-auto flex max-w-[40rem] flex-col items-center gap-4 text-center">
          <p className="text-4xl font-semibold">Este link de TV não vale mais</p>
          <p className="text-2xl text-white/60">Gere outro no sistema, em Agenda → Modo TV.</p>
        </div>
      </Tela>
    );
  }

  const painel = consulta.data;
  if (!painel) {
    return (
      <Tela>
        <p className="m-auto text-3xl text-white/60">{consulta.isError ? "Sem conexão. Tentando de novo…" : "Carregando o painel…"}</p>
      </Tela>
    );
  }

  const semConexao = consulta.isError;
  const agoraHora = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  const ativos = painel.agenda.filter((a) => a.status === "agendado");
  const proximo = ativos.find((a) => a.hora >= agoraHora) ?? null;

  return (
    <Tela>
      <header className="flex items-center justify-between gap-8">
        <div className="flex min-w-0 items-center gap-4">
          {painel.empresa.logo && <img src={painel.empresa.logo} alt="" className="size-14 rounded-xl bg-white object-contain p-1" />}
          <p className="truncate text-4xl font-semibold">{painel.empresa.nome || "Oficina"}</p>
        </div>
        <div className="flex items-baseline gap-6">
          <p className="text-2xl text-white/60 first-letter:uppercase">{agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
          <p className="text-6xl font-semibold tabular-nums">{agoraHora}</p>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,7fr)] gap-5">
        <section aria-label="Chegam hoje" className="flex min-h-0 flex-col gap-4 rounded-3xl bg-white/[0.04] p-5">
          <TituloColuna texto="Chegam hoje" total={painel.agenda.length} cor="#e2e8f0" icone={null} />
          {painel.agenda.length === 0 ? (
            <Vazio>Nenhum carro marcado para hoje.</Vazio>
          ) : (
            <RolagemAutomatica className="flex-1">
              <ul className="flex flex-col gap-3">
                {painel.agenda.map((a) => {
                  const feito = a.status !== "agendado";
                  const destaque = proximo?.id === a.id;
                  const atrasado = a.status === "agendado" && a.hora < agoraHora;
                  return (
                    <li
                      key={a.id}
                      className={cn("flex gap-4 rounded-2xl border border-white/10 p-4", destaque && "border-[#60a5fa] bg-[#60a5fa]/10", atrasado && "border-[#f59e0b]/60", feito && "opacity-40")}
                    >
                      <span className="w-[5.5rem] shrink-0 text-3xl font-semibold tabular-nums">{a.hora}</span>
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-2xl font-semibold">{a.modelo}</span>
                          {a.placa && <PlacaVeiculo placa={a.placa} className="h-8 px-2.5 text-lg" />}
                        </div>
                        <p className="line-clamp-2 text-xl text-white/75">{a.servico}</p>
                        {destaque && <p className="text-lg font-medium text-[#93c5fd]">Próximo</p>}
                        {atrasado && <p className="text-lg font-medium text-[#fbbf24]">Atrasado: ainda não chegou</p>}
                        {a.status === "chegou" && (
                          <p className="flex items-center gap-1.5 text-lg">
                            <Check className="size-5" /> Chegou{a.ordemNumero && ` · ${a.ordemNumero}`}
                          </p>
                        )}
                        {a.status === "faltou" && <p className="text-lg">Faltou</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </RolagemAutomatica>
          )}
        </section>

        <section aria-label="Pátio" className="grid min-h-0 grid-cols-4 gap-4">
          {COLUNAS.map((coluna) => {
            const carros = painel.patio.filter((o) => o.status === coluna.etapa);
            return (
              <div key={coluna.etapa} className="flex min-h-0 flex-col gap-4 rounded-3xl bg-white/[0.04] p-4">
                <TituloColuna texto={coluna.texto} total={carros.length} cor={coluna.cor} icone={coluna.icone} />
                {carros.length === 0 ? (
                  <Vazio>—</Vazio>
                ) : (
                  <RolagemAutomatica className="flex-1">
                    <ul className="flex flex-col gap-3">
                      {carros.map((o) => {
                        const parado = coluna.etapa === "aguardando_peca" && agora.getTime() - new Date(o.desde).getTime() > UM_DIA;
                        return (
                          <li key={o.id} className="flex flex-col gap-2 rounded-2xl border-l-[6px] bg-white/[0.06] p-4" style={{ borderLeftColor: parado ? "#f59e0b" : coluna.cor }}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-2xl leading-tight font-semibold">{o.modelo}</span>
                              {o.placa && <PlacaVeiculo placa={o.placa} className="h-8 px-2.5 text-lg" />}
                            </div>
                            {o.problema && <p className="line-clamp-2 text-lg leading-snug text-white/75">{o.problema}</p>}
                            <p className={cn("text-base text-white/50", parado && "font-medium text-[#fbbf24]")}>
                              {o.numero}
                              {o.cor && ` · ${o.cor}`} · {tempoDesde(o.desde, agora)}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </RolagemAutomatica>
                )}
              </div>
            );
          })}
        </section>
      </main>

      <footer className="flex items-center justify-between text-base text-white/40">
        <span>Atualiza sozinho a cada 30 segundos.</span>
        {semConexao ? (
          <span className="flex items-center gap-2 font-medium text-[#fbbf24]">
            <WifiOff className="size-5" /> Sem conexão. Mostrando os dados das {new Date(consulta.dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.
          </span>
        ) : (
          <span>Atualizado às {new Date(consulta.dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
        )}
      </footer>
    </Tela>
  );
}

function Tela({ children }: { children: ReactNode }) {
  return <div className="flex h-dvh cursor-none flex-col gap-5 overflow-hidden bg-[#0b0e14] p-6 text-white [color-scheme:dark] select-none">{children}</div>;
}

function TituloColuna({ texto, total, cor, icone: Icone }: { texto: string; total: number; cor: string; icone: LucideIcon | null }) {
  return (
    <h2 className="flex items-center gap-2.5 text-2xl font-semibold">
      {Icone && <Icone className="size-7 shrink-0" style={{ color: cor }} />}
      <span className="leading-tight">{texto}</span>
      <span className="ml-auto rounded-full px-3 py-0.5 text-2xl tabular-nums" style={{ backgroundColor: `${cor}26`, color: cor }}>
        {total}
      </span>
    </h2>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-xl text-white/35">{children}</p>;
}
