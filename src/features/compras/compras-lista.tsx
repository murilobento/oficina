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

import { CompraDetalhe } from "./compra-detalhe";
import { CompraForm } from "./compra-form";
import { useCancelarCompra, useCompras } from "./api";
import { type Compra, totaisDaCompra } from "./tipos";

const FILTRO_STATUS = FILTRO_STATUS_DOCUMENTO("Recebidas");
const data = (valor: string) => new Date(valor).toLocaleDateString("pt-BR");

/** Listagem de compras de peças. Compra lançada dá entrada no estoque; só pode ser cancelada. */
export function ComprasLista() {
  const compras = useCompras();
  // Compra tem custo: só quem edita compras e vê valores lança.
  const podeEditarCompras = usePode("compras.editar");
  const podeVerValores = usePode("valores.ver");
  const podeEditar = podeEditarCompras && podeVerValores;
  const cancelar = useCancelarCompra();
  const { proteger } = useEnvioUnico();
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

  useAbrirQuandoPedido("compra", () => {
    if (!podeEditar) return;
    setAbertura((numero) => numero + 1);
    setFormAberto(true);
  });

  function abrirDetalhe(compra: Compra) {
    setVisualizandoId(compra.id);
    setDetalheAberto(true);
  }

  const confirmarCancelamento = proteger(async () => {
    if (!cancelando) return;
    try {
      await cancelar.mutateAsync(cancelando.id);
      toast.success(`${cancelando.numero} cancelada. As peças saíram do estoque.`);
    } catch (erro) {
      // 409: parte das peças já saiu do estoque; a mensagem da API diz quais.
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
    <ListagemVazia>{compras.length === 0 ? "Nenhuma compra lançada ainda." : "Nenhuma compra encontrada com esses filtros."}</ListagemVazia>
  );

  return (
    <Listagem>
      <ListagemCabecalho
        titulo="Compras"
        descricao="Peças compradas dos fornecedores. Cada compra dá entrada no estoque."
        rotuloNovo="Nova compra"
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
        <ListagemBusca valor={busca} aoMudar={filtrar(setBusca)} placeholder="Número, fornecedor ou nota" rotulo="Buscar compras" />
        <ListagemGrupoFiltros>
          <ListagemFiltro rotulo="Status" valor={filtroStatus} opcoes={FILTRO_STATUS} aoMudar={filtrar(setFiltroStatus)} />
        </ListagemGrupoFiltros>
      </ListagemFiltros>

      <ListagemCartoes>
        {visiveis.map((compra) => (
          <ListagemCartaoDocumento
            key={compra.id}
            codigo={compra.numero}
            status={<StatusDocumentoBadge status={compra.status} concluida="Recebida" />}
            acoes={<AcoesDocumento item={compra} {...acoes} />}
            titulo={nomeFornecedor(compra)}
            detalhe={compra.notaFiscal ? `NF ${compra.notaFiscal}` : "Sem nota fiscal"}
            valor={formatarBRL(totaisDaCompra(compra).total)}
            data={data(compra.criadoEm)}
            aoAbrir={() => abrirDetalhe(compra)}
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
