import { useMemo, useState } from "react";

import { HandCoins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Listagem, ListagemBusca, ListagemCabecalho, ListagemCartoes, ListagemFiltros, ListagemVazia } from "@/components/layout/listagem";
import { Numeral } from "@/components/marca/numeral";
import { usePode } from "@/features/auth/sessao";
import { usePessoas } from "@/features/pessoas/api";
import { normalizar } from "@/lib/listagem";
import { formatarBRL } from "@/lib/numeros";

import { useVendas } from "./api";
import { ReceberPagamentoDialog, SeloSaldo } from "./recebimento";
import { totaisDaVenda, type Venda } from "./tipos";

const data = (valor: string) => new Date(valor).toLocaleDateString("pt-BR");

/** Contas a receber: vendas concluídas com saldo em aberto, da mais antiga para a mais nova. */
export function AReceberLista() {
  const vendas = useVendas();
  const clientes = usePessoas("cliente");
  const podeReceber = usePode("vendas.editar");
  const verValores = usePode("valores.ver");
  const [busca, setBusca] = useState("");
  const [recebendo, setRecebendo] = useState({ id: "", abertura: 0 });

  const nomeCliente = (venda: Venda) => clientes.find((c) => c.id === venda.clienteId)?.nome ?? (venda.clienteId ? "Cliente removido" : "Consumidor final");

  const abertas = useMemo(() => vendas.filter((v) => v.status === "concluida" && v.saldo > 0).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm)), [vendas]);
  const termo = normalizar(busca);
  const visiveis = abertas.filter((v) => termo === "" || normalizar(`${v.numero} ${nomeCliente(v)}`).includes(termo));
  const totalEmAberto = abertas.reduce((soma, v) => soma + v.saldo, 0);
  const alvo = vendas.find((v) => v.id === recebendo.id) ?? null;

  return (
    <Listagem>
      <ListagemCabecalho titulo="A receber" descricao="Vendas com saldo em aberto." />

      {!verValores ? (
        <ListagemVazia>Seu perfil não vê valores.</ListagemVazia>
      ) : (
        <>
          <Numeral rotulo="Total em aberto" valor={formatarBRL(totalEmAberto)} tamanho="sm" />
          <ListagemFiltros>
            <ListagemBusca valor={busca} aoMudar={setBusca} placeholder="Número ou cliente" rotulo="Buscar contas a receber" />
          </ListagemFiltros>
          <ListagemCartoes>
            {visiveis.map((venda) => (
              <li key={venda.id} className="bg-card flex min-w-0 flex-col gap-2 rounded-md border p-4 uppercase">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{nomeCliente(venda)}</p>
                    <p className="text-muted-foreground font-mono text-xs">
                      {venda.numero} · {data(venda.criadoEm)}
                    </p>
                  </div>
                  <p className="font-mono text-lg font-bold tabular-nums">{formatarBRL(venda.saldo)}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SeloSaldo venda={venda} />
                  <span className="text-muted-foreground font-mono text-xs">de {formatarBRL(totaisDaVenda(venda).total)}</span>
                </div>
                {podeReceber && (
                  <Button type="button" className="mt-1 w-full" onClick={() => setRecebendo((a) => ({ id: venda.id, abertura: a.abertura + 1 }))}>
                    <HandCoins /> Receber
                  </Button>
                )}
              </li>
            ))}
            {visiveis.length === 0 && <li className="col-span-full"><ListagemVazia>{abertas.length === 0 ? "Nenhuma venda com saldo em aberto." : "Nada encontrado."}</ListagemVazia></li>}
          </ListagemCartoes>
        </>
      )}

      <ReceberPagamentoDialog key={recebendo.abertura} venda={alvo} aoFechar={() => setRecebendo((a) => ({ ...a, id: "" }))} />
    </Listagem>
  );
}
