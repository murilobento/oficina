import { usePessoas } from "@/features/pessoas/api";
import { useMemo, useState } from "react";

import { toast } from "sonner";

import { usePode } from "@/features/auth/sessao";

import { AcoesDocumento, ConfirmarCancelamento, FILTRO_STATUS_DOCUMENTO, StatusDocumentoBadge } from "@/components/layout/documento-partes";
import {
  Listagem,
  ListagemBusca,
  ListagemCabecalho,
  ListagemCartaoDocumento,
  ListagemCartoes,
  ListagemFiltro,
  ListagemFiltros,
  ListagemGrupoFiltros,
  ListagemRodape,
  ListagemTabela,
  ListagemVazia,
} from "@/components/layout/listagem";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAbrirQuandoPedido } from "@/lib/acao-novo";
import { CLASSE_TABELA, normalizar, paginar } from "@/lib/listagem";
import { useEnvioUnico } from "@/lib/envio-unico";
import { formatarBRL } from "@/lib/numeros";

import { useCancelarVenda, useVendas } from "./api";
import { FORMAS_PAGAMENTO, rotuloPagamento, totaisDaVenda, type Venda } from "./tipos";
import { SeloSaldo } from "./recebimento";
import { VendaDetalhe } from "./venda-detalhe";
import { VendaForm } from "./venda-form";

const FILTRO_STATUS = FILTRO_STATUS_DOCUMENTO("Concluídas");
const FILTRO_PAGAMENTO = [{ valor: "todos", texto: "Todas" }, { valor: "areceber", texto: "A receber" }, ...FORMAS_PAGAMENTO];
const data = (valor: string) => new Date(valor).toLocaleDateString("pt-BR");

/** Listagem de vendas. Orçamento aprovado vira venda no próprio orçamento; aqui também se lança venda manual. */
export function VendasLista() {
  const vendas = useVendas();
  const podeEditar = usePode("vendas.editar");
  const cancelar = useCancelarVenda();
  const { proteger } = useEnvioUnico();
  const clientes = usePessoas("cliente");

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
      .filter((v) => filtroPagamento === "todos" || (filtroPagamento === "areceber" ? v.saldo > 0 : v.formaPagamento === filtroPagamento || v.pagamentos.some((p) => !p.estornadoEm && p.forma === filtroPagamento)))
      .filter((v) => {
        if (termo === "") return true;
        const cliente = clientes.find((c) => c.id === v.clienteId)?.nome ?? (v.clienteId ? "" : "consumidor final");
        return normalizar(`${v.numero} ${cliente}`).includes(termo);
      })
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [vendas, clientes, busca, filtroStatus, filtroPagamento]);

  const { visiveis, paginaAtual, totalPaginas } = paginar(filtrados, pagina);

  useAbrirQuandoPedido("venda", () => {
    if (!podeEditar) return;
    setAbertura((numero) => numero + 1);
    setFormAberto(true);
  });

  function abrirDetalhe(venda: Venda) {
    setVisualizandoId(venda.id);
    setDetalheAberto(true);
  }

  const confirmarCancelamento = proteger(async () => {
    if (!cancelando) return;
    try {
      await cancelar.mutateAsync(cancelando.id);
      toast.success(`${cancelando.numero} cancelada. As peças voltaram ao estoque.`);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível cancelar. Tente de novo.");
    }
    setCancelando(null);
  });

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
        aoNovo={
          podeEditar
            ? () => {
                setAbertura((numero) => numero + 1);
                setFormAberto(true);
              }
            : undefined
        }
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
          <ListagemCartaoDocumento
            key={venda.id}
            codigo={venda.numero}
            status={venda.saldo > 0 ? <SeloSaldo venda={venda} /> : <StatusDocumentoBadge status={venda.status} concluida="Concluída" />}
            acoes={<AcoesDocumento item={venda} {...acoes} />}
            titulo={nomeCliente(venda)}
            detalhe={rotuloPagamento(venda.formaPagamento)}
            valor={formatarBRL(totaisDaVenda(venda).total)}
            data={data(venda.criadoEm)}
            aoAbrir={() => abrirDetalhe(venda)}
          />
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
                  <div className="flex flex-wrap items-center gap-1">
                    <StatusDocumentoBadge status={venda.status} concluida="Concluída" />
                    <SeloSaldo venda={venda} />
                  </div>
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
