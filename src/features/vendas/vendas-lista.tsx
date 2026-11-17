import { useMemo, useState } from "react";

import { toast } from "sonner";

import { AcoesDocumento, ConfirmarCancelamento, FILTRO_STATUS_DOCUMENTO, StatusDocumentoBadge } from "@/components/layout/documento-partes";
import {
  Listagem,
  ListagemBusca,
  ListagemCabecalho,
  ListagemCartao,
  ListagemCartoes,
  ListagemFiltro,
  ListagemFiltros,
  ListagemGrupoFiltros,
  ListagemRodape,
  ListagemTabela,
  ListagemVazia,
} from "@/components/layout/listagem";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CLIENTES } from "@/features/pessoas/entidades";
import { CLASSE_TABELA, normalizar, paginar } from "@/lib/listagem";
import { formatarBRL } from "@/lib/numeros";

import { cancelarVenda } from "./acoes";
import { useVendasStore } from "./store";
import { FORMAS_PAGAMENTO, rotuloPagamento, totaisDaVenda, type Venda } from "./tipos";
import { VendaDetalhe } from "./venda-detalhe";
import { VendaForm } from "./venda-form";

const FILTRO_STATUS = FILTRO_STATUS_DOCUMENTO("Concluídas");
const FILTRO_PAGAMENTO = [{ valor: "todos", texto: "Todas" }, ...FORMAS_PAGAMENTO];
const data = (valor: string) => new Date(valor).toLocaleDateString("pt-BR");

/** Listagem de vendas. Orçamento aprovado vira venda no próprio orçamento; aqui também se lança venda manual. */
export function VendasLista() {
  const vendas = useVendasStore((estado) => estado.itens);
  const clientes = CLIENTES.useStore((estado) => estado.pessoas);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroPagamento, setFiltroPagamento] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [formAberto, setFormAberto] = useState(false);
  const [abertura, setAbertura] = useState(0);
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [visualizandoId, setVisualizandoId] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<Venda | null>(null);

  const visualizando = vendas.find((item) => item.id === visualizandoId) ?? null;
  const nomeCliente = (venda: Venda) => clientes.find((c) => c.id === venda.clienteId)?.nome ?? (venda.clienteId ? "Cliente removido" : "Consumidor final");

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return vendas
      .filter((v) => filtroStatus === "todos" || v.status === filtroStatus)
      .filter((v) => filtroPagamento === "todos" || v.formaPagamento === filtroPagamento)
      .filter((v) => {
        if (termo === "") return true;
        const cliente = clientes.find((c) => c.id === v.clienteId)?.nome ?? (v.clienteId ? "" : "consumidor final");
        return normalizar(`${v.numero} ${cliente}`).includes(termo);
      })
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [vendas, clientes, busca, filtroStatus, filtroPagamento]);

  const { visiveis, paginaAtual, totalPaginas } = paginar(filtrados, pagina);

  function abrirDetalhe(venda: Venda) {
    setVisualizandoId(venda.id);
    setDetalheAberto(true);
  }

  function confirmarCancelamento() {
    if (!cancelando) return;
    cancelarVenda(cancelando);
    toast.success(`${cancelando.numero} cancelada. As peças voltaram ao estoque.`);
    setCancelando(null);
  }

  function filtrar(definir: (valor: string) => void) {
    return (valor: string) => {
      definir(valor);
      setPagina(1);
    };
  }

  const acoes = { aoVisualizar: abrirDetalhe, aoCancelar: setCancelando };
  const vazio = (
    <ListagemVazia>{vendas.length === 0 ? "Nenhuma venda lançada ainda." : "Nenhuma venda encontrada com esses filtros."}</ListagemVazia>
  );

  return (
    <Listagem>
      <ListagemCabecalho
        titulo="Vendas"
        descricao="Vendas concluídas: de orçamentos aprovados ou lançadas direto no balcão."
        rotuloNovo="Nova venda"
        aoNovo={() => {
          setAbertura((numero) => numero + 1);
          setFormAberto(true);
        }}
      />

      <ListagemFiltros>
        <ListagemBusca valor={busca} aoMudar={filtrar(setBusca)} placeholder="Número ou cliente" rotulo="Buscar vendas" />
        <ListagemGrupoFiltros>
          <ListagemFiltro rotulo="Status" valor={filtroStatus} opcoes={FILTRO_STATUS} aoMudar={filtrar(setFiltroStatus)} />
          <ListagemFiltro rotulo="Pagamento" valor={filtroPagamento} opcoes={FILTRO_PAGAMENTO} aoMudar={filtrar(setFiltroPagamento)} />
        </ListagemGrupoFiltros>
      </ListagemFiltros>

      <ListagemCartoes>
        {visiveis.map((venda) => (
          <ListagemCartao key={venda.id}>
            <div className="flex items-start justify-between gap-2">
              <button type="button" className="-my-1 flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left" onClick={() => abrirDetalhe(venda)}>
                <span className="block truncate font-medium">{venda.numero}</span>
                <span className="text-muted-foreground block truncate text-sm">{nomeCliente(venda)}</span>
              </button>
              <AcoesDocumento item={venda} {...acoes} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusDocumentoBadge status={venda.status} concluida="Concluída" />
              <span className="text-muted-foreground text-sm">{data(venda.criadoEm)} · {rotuloPagamento(venda.formaPagamento)}</span>
            </div>
            <p className="font-medium tabular-nums">{formatarBRL(totaisDaVenda(venda).total)}</p>
          </ListagemCartao>
        ))}
        {visiveis.length === 0 && <li className="col-span-full">{vazio}</li>}
      </ListagemCartoes>

      <ListagemTabela>
        <Table className={CLASSE_TABELA}>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3 font-normal">Número</TableHead>
              <TableHead className="py-3 font-normal">Data</TableHead>
              <TableHead className="py-3 font-normal">Cliente</TableHead>
              <TableHead className="hidden py-3 font-normal @6xl:table-cell">Pagamento</TableHead>
              <TableHead className="py-3 text-right font-normal">Total</TableHead>
              <TableHead className="py-3 font-normal">Status</TableHead>
              <TableHead className="py-3 text-right font-normal">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((venda) => (
              <TableRow key={venda.id}>
                <TableCell className="py-3">
                  <button type="button" className="font-medium hover:underline" onClick={() => abrirDetalhe(venda)}>
                    {venda.numero}
                  </button>
                </TableCell>
                <TableCell className="py-3 whitespace-nowrap">{data(venda.criadoEm)}</TableCell>
                <TableCell className="max-w-64 truncate py-3">{nomeCliente(venda)}</TableCell>
                <TableCell className="hidden py-3 whitespace-nowrap @6xl:table-cell">{rotuloPagamento(venda.formaPagamento)}</TableCell>
                <TableCell className="py-3 text-right whitespace-nowrap tabular-nums">{formatarBRL(totaisDaVenda(venda).total)}</TableCell>
                <TableCell className="py-3">
                  <StatusDocumentoBadge status={venda.status} concluida="Concluída" />
                </TableCell>
                <TableCell className="py-3 text-right">
                  <AcoesDocumento item={venda} {...acoes} />
                </TableCell>
              </TableRow>
            ))}
            {visiveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>{vazio}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ListagemTabela>

      <ListagemRodape total={filtrados.length} singular="venda" plural="vendas" pagina={paginaAtual} totalPaginas={totalPaginas} aoMudarPagina={setPagina} />

      <VendaForm key={abertura} aberto={formAberto} aoFechar={() => setFormAberto(false)} />
      <VendaDetalhe aberto={detalheAberto} venda={visualizando} aoFechar={() => setDetalheAberto(false)} aoCancelar={setCancelando} />
      <ConfirmarCancelamento
        numero={cancelando?.numero ?? null}
        singular="venda"
        consequencia="As peças vendidas voltam ao estoque e, se a venda veio de um orçamento, ele volta para aprovado."
        aoCancelar={() => setCancelando(null)}
        aoConfirmar={confirmarCancelamento}
      />
    </Listagem>
  );
}
