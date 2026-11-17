import { useVeiculos } from "@/features/veiculos/api";
import { usePessoas } from "@/features/pessoas/api";
import { useMemo, useState } from "react";

import { toast } from "sonner";

import { useEmpresa } from "@/features/empresa/api";
import { usePode } from "@/features/auth/sessao";

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
import { ConfirmarExclusaoRegistro } from "@/components/layout/registro-partes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { veiculoEmTexto } from "@/features/veiculos/tipos";
import { CLASSE_TABELA, normalizar, paginar } from "@/lib/listagem";
import { useEnvioUnico } from "@/lib/envio-unico";
import { formatarBRL } from "@/lib/numeros";

import { validoAte } from "./calculo";
import { GerarVendaDialog } from "@/features/vendas/gerar-venda-dialog";
import { useVendas } from "@/features/vendas/api";
import { useExcluirOrcamento, useMudarStatusOrcamento, useOrcamentos, useRenovarOrcamento } from "./api";
import { OrcamentoDetalhe, type MudancaStatus } from "./orcamento-detalhe";
import { gerarPdfOrcamento, entregarPdf } from "./orcamento-pdf";
import { OrcamentoForm } from "./orcamento-form";
import { AcoesOrcamento, StatusOrcamentoBadge } from "./orcamento-partes";

import { type Orcamento, ROTULO_STATUS, statusExibido, totaisDoOrcamento } from "./tipos";

const FILTRO_STATUS = [
  { valor: "todos", texto: "Todos" },
  ...(["rascunho", "enviado", "aprovado", "recusado", "convertido", "vencido"] as const).map((valor) => ({
    valor,
    texto: ROTULO_STATUS[valor],
  })),
];

const MENSAGEM_STATUS = {
  rascunho: "voltou para rascunho.",
  enviado: "marcado como enviado.",
  aprovado: "aprovado.",
  recusado: "marcado como recusado.",
  convertido: "virou venda.",
} as const;

function dataCurta(data: Date | string): string {
  return new Date(data).toLocaleDateString("pt-BR");
}

/** Listagem de orçamentos. Criar, editar e visualizar abrem em painel lateral. */
export function OrcamentosLista() {
  const orcamentos = useOrcamentos();
  const podeEditar = usePode("orcamentos.editar");
  const mudarStatus = useMudarStatusOrcamento();
  const renovar = useRenovarOrcamento();
  const remover = useExcluirOrcamento();
  const { proteger } = useEnvioUnico();
  const clientes = usePessoas("cliente");
  const empresa = useEmpresa();
  const veiculos = useVeiculos();
  const vendas = useVendas();
  const [gerandoVenda, setGerandoVenda] = useState<Orcamento | null>(null);
  const [aberturaVenda, setAberturaVenda] = useState(0);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Orcamento | null>(null);
  const [abertura, setAbertura] = useState(0);
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [visualizandoId, setVisualizandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Orcamento | null>(null);

  const visualizando = orcamentos.find((item) => item.id === visualizandoId) ?? null;
  const veiculoDe = (orcamento: Orcamento) => veiculos.find((item) => item.id === orcamento.veiculoId) ?? null;
  const textoVeiculo = (orcamento: Orcamento) => {
    const veiculo = veiculoDe(orcamento);
    return veiculo ? veiculoEmTexto(veiculo) : "Veículo removido";
  };
  const nomeCliente = (orcamento: Orcamento) =>
    clientes.find((cliente) => cliente.id === orcamento.clienteId)?.nome ?? "Cliente removido";

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    const termoPlaca = termo.replace(/[^a-z0-9]/g, "");
    return orcamentos
      .filter((orcamento) => filtroStatus === "todos" || statusExibido(orcamento) === filtroStatus)
      .filter((orcamento) => {
        if (termo === "") return true;
        const cliente = clientes.find((item) => item.id === orcamento.clienteId)?.nome ?? "";
        const veiculo = veiculos.find((item) => item.id === orcamento.veiculoId);
        const noTexto = normalizar(`${orcamento.numero} ${cliente} ${veiculo?.modelo ?? ""}`).includes(termo);
        const naPlaca = termoPlaca !== "" && (veiculo?.placa ?? "").toLowerCase().includes(termoPlaca);
        return noTexto || naPlaca;
      })
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [orcamentos, clientes, veiculos, busca, filtroStatus]);

  const { visiveis, paginaAtual, totalPaginas } = paginar(filtrados, pagina);

  // PDF: gera o arquivo do orçamento e baixa (ou abre o compartilhar, no celular).
  async function gerarPdf(orcamento: Orcamento) {
    const aviso = toast.loading(`Gerando o PDF de ${orcamento.numero}...`);
    try {
      const blob = await gerarPdfOrcamento({
        orcamento,
        cliente: clientes.find((cliente) => cliente.id === orcamento.clienteId) ?? null,
        veiculo: veiculoDe(orcamento),
        empresa,
      });
      toast.dismiss(aviso);
      await entregarPdf(blob, `${orcamento.numero}.pdf`);
    } catch {
      toast.error("Não foi possível gerar o PDF. Tente de novo.", { id: aviso });
    }
  }

  function abrirForm(orcamento: Orcamento | null) {
    setDetalheAberto(false);
    setEmEdicao(orcamento);
    setAbertura((numero) => numero + 1);
    setFormAberto(true);
  }

  function abrirDetalhe(orcamento: Orcamento) {
    setVisualizandoId(orcamento.id);
    setDetalheAberto(true);
  }

  async function mudar(orcamento: Orcamento, mudanca: MudancaStatus) {
    try {
      if ("renovar" in mudanca) {
        await renovar.mutateAsync(orcamento.id);
        toast.success(`${orcamento.numero}: validade renovada por mais ${orcamento.validadeDias} dias.`);
        return;
      }
      if (mudanca.status === "convertido") return;
      await mudarStatus.mutateAsync({ id: orcamento.id, status: mudanca.status });
      toast.success(`${orcamento.numero} ${MENSAGEM_STATUS[mudanca.status]}`);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível mudar o status. Tente de novo.");
    }
  }

  const confirmarExclusao = proteger(async () => {
    if (!excluindo) return;
    try {
      await remover.mutateAsync(excluindo.id);
      toast.success(`${excluindo.numero} excluído.`);
      if (excluindo.id === visualizandoId) setDetalheAberto(false);
      setExcluindo(null);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir. Tente de novo.");
      setExcluindo(null);
    }
  });

  function pedirExclusao(orcamento: Orcamento) {
    // A venda guarda o vínculo com o orçamento de origem: com venda, o orçamento fica no histórico.
    const venda = vendas.find((item) => item.orcamentoId === orcamento.id);
    if (venda) {
      toast.error(`${orcamento.numero} gerou a venda ${venda.numero} e não pode ser excluído.`);
      return;
    }
    setExcluindo(orcamento);
  }

  function gerarVenda(orcamento: Orcamento) {
    setAberturaVenda((numero) => numero + 1);
    setGerandoVenda(orcamento);
  }

  const acoes = { aoVisualizar: abrirDetalhe, aoEditar: abrirForm, aoImprimir: gerarPdf, aoExcluir: pedirExclusao };
  const vazio = (
    <ListagemVazia>
      {orcamentos.length === 0 ? "Nenhum orçamento criado ainda." : "Nenhum orçamento encontrado com esses filtros."}
    </ListagemVazia>
  );

  return (
    <Listagem>
      <ListagemCabecalho
        titulo="Orçamentos"
        descricao="Propostas de peças e serviços para o cliente aprovar antes da ordem de serviço."
        rotuloNovo="Novo orçamento"
        aoNovo={podeEditar ? () => abrirForm(null) : undefined}
      />

      <ListagemFiltros>
        <ListagemBusca
          valor={busca}
          aoMudar={(valor) => {
            setBusca(valor);
            setPagina(1);
          }}
          placeholder="Número, cliente ou placa"
          rotulo="Buscar orçamentos"
        />
        <ListagemGrupoFiltros>
          <ListagemFiltro
            rotulo="Status"
            valor={filtroStatus}
            opcoes={FILTRO_STATUS}
            aoMudar={(valor) => {
              setFiltroStatus(valor);
              setPagina(1);
            }}
          />
        </ListagemGrupoFiltros>
      </ListagemFiltros>

      <ListagemCartoes>
        {visiveis.map((orcamento) => (
          <ListagemCartao key={orcamento.id}>
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                className="-my-1 flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left"
                onClick={() => abrirDetalhe(orcamento)}
              >
                <span className="block truncate font-medium">{nomeCliente(orcamento)}</span>
                <span className="text-muted-foreground block truncate text-sm">
                  {orcamento.numero} · {dataCurta(orcamento.criadoEm)}
                </span>
              </button>
              <AcoesOrcamento orcamento={orcamento} {...acoes} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusOrcamentoBadge status={statusExibido(orcamento)} />
              <span className="text-sm font-medium tabular-nums">{formatarBRL(totaisDoOrcamento(orcamento).total)}</span>
            </div>
            <p className="text-muted-foreground text-sm">{textoVeiculo(orcamento)}</p>
          </ListagemCartao>
        ))}
        {visiveis.length === 0 && <li className="col-span-full">{vazio}</li>}
      </ListagemCartoes>

      <ListagemTabela>
        <Table className={CLASSE_TABELA}>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3 font-normal">Número</TableHead>
              <TableHead className="py-3 font-normal">Cliente</TableHead>
              <TableHead className="py-3 font-normal">Emissão</TableHead>
              <TableHead className="hidden py-3 font-normal @6xl:table-cell">Validade</TableHead>
              <TableHead className="py-3 text-right font-normal">Total</TableHead>
              <TableHead className="py-3 font-normal">Status</TableHead>
              <TableHead className="py-3 text-right font-normal">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((orcamento) => (
              <TableRow key={orcamento.id}>
                <TableCell className="py-3 whitespace-nowrap">
                  <button type="button" className="font-medium hover:underline" onClick={() => abrirDetalhe(orcamento)}>
                    {orcamento.numero}
                  </button>
                </TableCell>
                <TableCell className="max-w-72 py-3">
                  <span className="block truncate font-medium">{nomeCliente(orcamento)}</span>
                  <span className="text-muted-foreground block truncate text-sm">{textoVeiculo(orcamento)}</span>
                </TableCell>
                <TableCell className="py-3 whitespace-nowrap tabular-nums">{dataCurta(orcamento.criadoEm)}</TableCell>
                <TableCell className="hidden py-3 whitespace-nowrap tabular-nums @6xl:table-cell">
                  {dataCurta(validoAte(orcamento.criadoEm, orcamento.validadeDias))}
                </TableCell>
                <TableCell className="py-3 text-right whitespace-nowrap tabular-nums">
                  {formatarBRL(totaisDoOrcamento(orcamento).total)}
                </TableCell>
                <TableCell className="py-3">
                  <StatusOrcamentoBadge status={statusExibido(orcamento)} />
                </TableCell>
                <TableCell className="py-3 text-right">
                  <AcoesOrcamento orcamento={orcamento} {...acoes} />
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

      <ListagemRodape
        total={filtrados.length}
        singular="orçamento"
        plural="orçamentos"
        pagina={paginaAtual}
        totalPaginas={totalPaginas}
        aoMudarPagina={setPagina}
      />

      <OrcamentoForm key={`form-${abertura}`} aberto={formAberto} orcamento={emEdicao} aoFechar={() => setFormAberto(false)} />
      <OrcamentoDetalhe
        aberto={detalheAberto}
        orcamento={visualizando}
        aoFechar={() => setDetalheAberto(false)}
        aoEditar={abrirForm}
        aoImprimir={gerarPdf}
        aoExcluir={pedirExclusao}
        aoMudar={mudar}
        aoGerarVenda={gerarVenda}
      />
      <GerarVendaDialog key={`venda-${aberturaVenda}`} orcamento={gerandoVenda} aoFechar={() => setGerandoVenda(null)} aoGerada={() => setDetalheAberto(false)} />
      <ConfirmarExclusaoRegistro
        nome={excluindo?.numero ?? null}
        singular="orçamento"
        aoCancelar={() => setExcluindo(null)}
        aoConfirmar={confirmarExclusao}
      />
    </Listagem>
  );
}
