import { Link } from "@tanstack/react-router";

import { useOrcamentosStore } from "@/features/orcamentos/store";
import { totaisDoOrcamento } from "@/features/orcamentos/tipos";
import { formatarBRL, formatarQuantidade } from "@/lib/numeros";

import { historicoDoVeiculo } from "./historico";
import { useVeiculosStore } from "./store";
import { mascararPlaca } from "./tipos";

const data = (valor: string | null) => (valor ? new Date(valor).toLocaleDateString("pt-BR") : "");

/** Seção "Veículos" do painel do cliente: carros, visitas, total gasto e atalho para o histórico. */
export function VeiculosDoCliente({ clienteId }: { clienteId: string }) {
  const veiculos = useVeiculosStore((estado) => estado.itens).filter((v) => v.clienteId === clienteId);
  const orcamentos = useOrcamentosStore((estado) => estado.itens);

  const totalCliente = orcamentos
    .filter((o) => o.clienteId === clienteId && (o.status === "aprovado" || o.status === "convertido"))
    .reduce((soma, o) => soma + totaisDoOrcamento(o).total, 0);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Veículos</h3>
        <span className="text-muted-foreground text-sm">
          Total gasto: <span className="text-foreground font-medium tabular-nums">{formatarBRL(totalCliente)}</span>
        </span>
      </div>
      {veiculos.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum veículo cadastrado para este cliente.</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {veiculos.map((veiculo) => {
            const h = historicoDoVeiculo(orcamentos, veiculo.id);
            return (
              <li key={veiculo.id}>
                <Link
                  to="/veiculos"
                  search={{ ver: veiculo.id }}
                  className="hover:bg-muted/50 flex min-h-11 items-start justify-between gap-3 p-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block font-medium break-words">{veiculo.modelo}</span>
                    <span className="text-muted-foreground block">
                      {[
                        veiculo.placa && mascararPlaca(veiculo.placa),
                        veiculo.km > 0 && `${formatarQuantidade(veiculo.km)} km`,
                        h.ultimaVisita && `última visita ${data(h.ultimaVisita)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block font-medium">{formatarBRL(h.totalGasto)}</span>
                    <span className="text-muted-foreground block">
                      {h.realizadas} {h.realizadas === 1 ? "visita" : "visitas"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
