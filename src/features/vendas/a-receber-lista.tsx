import { useMemo, useState } from "react";

import { CircleAlert, HandCoins } from "lucide-react";

import { Listagem, ListagemBusca, ListagemCabecalho, ListagemCartoes, ListagemFiltros, ListagemVazia } from "@/components/layout/listagem";
import { FitaStatus } from "@/components/marca/fita-status";
import { Numeral } from "@/components/marca/numeral";
import { Button } from "@/components/ui/button";
import { usePode } from "@/features/auth/sessao";
import { usePessoas } from "@/features/pessoas/api";
import { normalizar } from "@/lib/listagem";
import { formatarBRL } from "@/lib/numeros";

import { useVendas } from "./api";
import { hojeISO, linhasAReceber } from "./parcelas";
import { ReceberPagamentoDialog } from "./recebimento";
import type { Venda } from "./tipos";

const dataBR = (iso: string) => iso.split("-").reverse().join("/");

/** Contas a receber: uma linha por parcela em aberto, da que vence antes para a depois. */
export function AReceberLista() {
  const vendas = useVendas();
  const clientes = usePessoas("cliente");
  const podeReceber = usePode("vendas.editar");
  const [busca, setBusca] = useState("");
  const [recebendo, setRecebendo] = useState({ id: "", abertura: 0 });

  const nomeCliente = (venda: Venda | undefined) =>
    venda ? (clientes.find((c) => c.id === venda.clienteId)?.nome ?? (venda.clienteId ? "Cliente removido" : "Consumidor final")) : "";
  const porId = useMemo(() => new Map(vendas.map((v) => [v.id, v])), [vendas]);
  const hoje = hojeISO();
  const linhas = useMemo(() => linhasAReceber(vendas, hoje), [vendas, hoje]);

  const termo = normalizar(busca);
  const visiveis = linhas.filter((l) => termo === "" || normalizar(`${porId.get(l.vendaId)?.numero} ${nomeCliente(porId.get(l.vendaId))}`).includes(termo));
  const totalAberto = linhas.reduce((s, l) => s + l.aberto, 0);
  const totalVencido = linhas.filter((l) => l.vencida).reduce((s, l) => s + l.aberto, 0);
  const alvo = vendas.find((v) => v.id === recebendo.id) ?? null;

  return (
    <Listagem>
      <ListagemCabecalho titulo="A receber" descricao="Parcelas em aberto, da que vence antes para a depois." />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border">
        <div className="bg-card p-4">
          <Numeral rotulo="Em aberto" valor={formatarBRL(totalAberto)} tamanho="sm" />
        </div>
        <div className="bg-card p-4">
          <Numeral rotulo="Vencido" valor={formatarBRL(totalVencido)} tamanho="sm" className={totalVencido > 0 ? "text-erro" : ""} />
        </div>
      </div>

      <ListagemFiltros>
        <ListagemBusca valor={busca} aoMudar={setBusca} placeholder="Número ou cliente" rotulo="Buscar contas a receber" />
      </ListagemFiltros>

      <ListagemCartoes sempre>
        {visiveis.map((l) => {
          const venda = porId.get(l.vendaId);
          return (
            <li key={`${l.vendaId}-${l.numero}`} className="bg-card flex min-w-0 flex-col gap-2 rounded-md border p-4 uppercase">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{nomeCliente(venda)}</p>
                  <p className="text-muted-foreground font-mono text-xs">
                    {venda?.numero}
                    {l.de > 1 && ` · parcela ${l.numero}/${l.de}`}
                  </p>
                </div>
                <p className="font-mono text-lg font-bold tabular-nums">{formatarBRL(l.aberto)}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                {l.vencida ? (
                  <FitaStatus tom="erro" icone={CircleAlert}>
                    Vencida · {dataBR(l.vencimento)}
                  </FitaStatus>
                ) : (
                  <span className="text-muted-foreground font-mono text-xs">{l.vencimento === hoje ? "Vence hoje" : `Vence ${dataBR(l.vencimento)}`}</span>
                )}
              </div>
              {podeReceber && (
                <Button type="button" className="mt-1 w-full" onClick={() => setRecebendo((a) => ({ id: l.vendaId, abertura: a.abertura + 1 }))}>
                  <HandCoins /> Receber
                </Button>
              )}
            </li>
          );
        })}
        {visiveis.length === 0 && (
          <li className="col-span-full">
            <ListagemVazia>{linhas.length === 0 ? "Nenhuma conta a receber." : "Nada encontrado."}</ListagemVazia>
          </li>
        )}
      </ListagemCartoes>

      <ReceberPagamentoDialog key={recebendo.abertura} venda={alvo} aoFechar={() => setRecebendo((a) => ({ ...a, id: "" }))} />
    </Listagem>
  );
}
