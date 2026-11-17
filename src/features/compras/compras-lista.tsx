import { AvisoEstoque } from "@/features/estoque/aviso-estoque";
import { usePessoas } from "@/features/pessoas/api";
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
import { CLASSE_TABELA, normalizar, paginar } from "@/lib/listagem";
import { formatarBRL, formatarQuantidade } from "@/lib/numeros";

import { cancelarCompra } from "./acoes";
import { CompraDetalhe } from "./compra-detalhe";
import { CompraForm } from "./compra-form";
import { useComprasStore } from "./store";
import { type Compra, totaisDaCompra } from "./tipos";

const FILTRO_STATUS = FILTRO_STATUS_DOCUMENTO("Recebidas");
const data = (valor: string) => new Date(valor).toLocaleDateString("pt-BR");

/** Listagem de compras de peças. Compra lançada dá entrada no estoque; só pode ser cancelada. */
export function ComprasLista() {
  const compras = useComprasStore((estado) => estado.itens);
  const fornecedores = usePessoas("fornecedor");

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [formAberto, setFormAberto] = useState(false);
  const [abertura, setAbertura] = useState(0);
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [visualizandoId, setVisualizandoId] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<Compra | null>(null);

  const visualizando = compras.find((item) => item.id === visualizandoId) ?? null;
  const nomeFornecedor = (compra: Compra) => fornecedores.find((f) => f.id === compra.fornecedorId)?.nome ?? "Fornecedor removido";

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return compras
      .filter((c) => filtroStatus === "todos" || c.status === filtroStatus)
      .filter((c) => {
        if (termo === "") return true;
        const fornecedor = fornecedores.find((f) => f.id === c.fornecedorId)?.nome ?? "";
        return normalizar(`${c.numero} ${fornecedor} ${c.notaFiscal}`).includes(termo);
      })
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [compras, fornecedores, busca, filtroStatus]);

  const { visiveis, paginaAtual, totalPaginas } = paginar(filtrados, pagina);

  function abrirDetalhe(compra: Compra) {
    setVisualizandoId(compra.id);
    setDetalheAberto(true);
  }

  function confirmarCancelamento() {
    if (!cancelando) return;
    const resultado = cancelarCompra(cancelando);
    if (resultado.ok) {
      toast.success(`${cancelando.numero} cancelada. As peças saíram do estoque.`);
    } else {
      const detalhe = resultado.faltas.map((f) => `${f.descricao} (comprado ${formatarQuantidade(f.pedido)}, em estoque ${formatarQuantidade(f.saldo)})`).join("; ");
      toast.error(`Não dá para cancelar ${cancelando.numero}: parte das peças já saiu do estoque. ${detalhe}.`);
    }
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
    <ListagemVazia>{compras.length === 0 ? "Nenhuma compra lançada ainda." : "Nenhuma compra encontrada com esses filtros."}</ListagemVazia>
  );

  return (
    <Listagem>
      <AvisoEstoque />
      <ListagemCabecalho
        titulo="Compras"
        descricao="Peças compradas dos fornecedores. Cada compra dá entrada no estoque."
        rotuloNovo="Nova compra"
        aoNovo={() => {
          setAbertura((numero) => numero + 1);
          setFormAberto(true);
        }}
      />

      <ListagemFiltros>
        <ListagemBusca valor={busca} aoMudar={filtrar(setBusca)} placeholder="Número, fornecedor ou nota" rotulo="Buscar compras" />
        <ListagemGrupoFiltros>
          <ListagemFiltro rotulo="Status" valor={filtroStatus} opcoes={FILTRO_STATUS} aoMudar={filtrar(setFiltroStatus)} />
        </ListagemGrupoFiltros>
      </ListagemFiltros>

      <ListagemCartoes>
        {visiveis.map((compra) => (
          <ListagemCartao key={compra.id}>
            <div className="flex items-start justify-between gap-2">
              <button type="button" className="-my-1 flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left" onClick={() => abrirDetalhe(compra)}>
                <span className="block truncate font-medium">{compra.numero}</span>
                <span className="text-muted-foreground block truncate text-sm">{nomeFornecedor(compra)}</span>
              </button>
              <AcoesDocumento item={compra} {...acoes} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusDocumentoBadge status={compra.status} concluida="Recebida" />
              <span className="text-muted-foreground text-sm">{[data(compra.criadoEm), compra.notaFiscal && `NF ${compra.notaFiscal}`].filter(Boolean).join(" · ")}</span>
            </div>
            <p className="font-medium tabular-nums">{formatarBRL(totaisDaCompra(compra).total)}</p>
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
              <TableHead className="py-3 font-normal">Fornecedor</TableHead>
              <TableHead className="hidden py-3 font-normal @6xl:table-cell">Nota fiscal</TableHead>
              <TableHead className="py-3 text-right font-normal">Total</TableHead>
              <TableHead className="py-3 font-normal">Status</TableHead>
              <TableHead className="py-3 text-right font-normal">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((compra) => (
              <TableRow key={compra.id}>
                <TableCell className="py-3">
                  <button type="button" className="font-medium hover:underline" onClick={() => abrirDetalhe(compra)}>
                    {compra.numero}
                  </button>
                </TableCell>
                <TableCell className="py-3 whitespace-nowrap">{data(compra.criadoEm)}</TableCell>
                <TableCell className="max-w-64 truncate py-3">{nomeFornecedor(compra)}</TableCell>
                <TableCell className="hidden py-3 whitespace-nowrap @6xl:table-cell">{compra.notaFiscal}</TableCell>
                <TableCell className="py-3 text-right whitespace-nowrap tabular-nums">{formatarBRL(totaisDaCompra(compra).total)}</TableCell>
                <TableCell className="py-3">
                  <StatusDocumentoBadge status={compra.status} concluida="Recebida" />
                </TableCell>
                <TableCell className="py-3 text-right">
                  <AcoesDocumento item={compra} {...acoes} />
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

      <ListagemRodape total={filtrados.length} singular="compra" plural="compras" pagina={paginaAtual} totalPaginas={totalPaginas} aoMudarPagina={setPagina} />

      <CompraForm key={abertura} aberto={formAberto} aoFechar={() => setFormAberto(false)} />
      <CompraDetalhe aberto={detalheAberto} compra={visualizando} aoFechar={() => setDetalheAberto(false)} aoCancelar={setCancelando} />
      <ConfirmarCancelamento
        numero={cancelando?.numero ?? null}
        singular="compra"
        consequencia="A compra fica marcada como cancelada."
        aoCancelar={() => setCancelando(null)}
        aoConfirmar={confirmarCancelamento}
      />
    </Listagem>
  );
}
