import { useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

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
import { CLIENTES } from "@/features/pessoas/entidades";
import { useVeiculosStore } from "@/features/veiculos/store";
import { veiculoEmTexto } from "@/features/veiculos/tipos";
import { CLASSE_TABELA, normalizar, paginar } from "@/lib/listagem";
import { formatarBRL } from "@/lib/numeros";

import { validoAte } from "./calculo";
import { OrcamentoDetalhe, type MudancaStatus } from "./orcamento-detalhe";
import { OrcamentoDocumento } from "./orcamento-documento";
import { OrcamentoForm } from "./orcamento-form";
import { AcoesOrcamento, StatusOrcamentoBadge } from "./orcamento-partes";
import { useOrcamentosStore } from "./store";
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
  convertido: "marcado como convertido em OS. A tela de ordens de serviço ainda será criada.",
} as const;

function dataCurta(data: Date | string): string {
  return new Date(data).toLocaleDateString("pt-BR");
}

/** Listagem de orçamentos. Criar, editar e visualizar abrem em painel lateral. */
export function OrcamentosLista() {
  const orcamentos = useOrcamentosStore((estado) => estado.itens);
  const atualizar = useOrcamentosStore((estado) => estado.atualizar);
  const remover = useOrcamentosStore((estado) => estado.remover);
  const clientes = CLIENTES.useStore((estado) => estado.pessoas);
  const veiculos = useVeiculosStore((estado) => estado.itens);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Orcamento | null>(null);
  const [abertura, setAbertura] = useState(0);
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [visualizandoId, setVisualizandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Orcamento | null>(null);
  const [imprimindo, setImprimindo] = useState<Orcamento | null>(null);

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

  // Imprimir: monta a folha na página, abre o diálogo de impressão e desmonta ao terminar.
  useEffect(() => {
    if (!imprimindo) return;
    const terminar = () => setImprimindo(null);
    window.addEventListener("afterprint", terminar);
    const espera = setTimeout(() => window.print(), 100);
    return () => {
      clearTimeout(espera);
      window.removeEventListener("afterprint", terminar);
    };
  }, [imprimindo]);

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

  function mudar(orcamento: Orcamento, mudanca: MudancaStatus) {
    if ("renovar" in mudanca) {
      atualizar(orcamento.id, { criadoEm: new Date().toISOString() });
      toast.success(`${orcamento.numero}: validade renovada por mais ${orcamento.validadeDias} dias.`);
      return;
    }
    atualizar(orcamento.id, { status: mudanca.status });
    toast.success(`${orcamento.numero} ${MENSAGEM_STATUS[mudanca.status]}`);
  }

  function confirmarExclusao() {
    if (!excluindo) return;
    remover(excluindo.id);
    toast.success(`${excluindo.numero} excluído.`);
    if (excluindo.id === visualizandoId) setDetalheAberto(false);
    setExcluindo(null);
  }

  const acoes = { aoVisualizar: abrirDetalhe, aoEditar: abrirForm, aoImprimir: setImprimindo, aoExcluir: setExcluindo };
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
        aoNovo={() => abrirForm(null)}
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

      <OrcamentoForm key={abertura} aberto={formAberto} orcamento={emEdicao} aoFechar={() => setFormAberto(false)} />
      <OrcamentoDetalhe
        aberto={detalheAberto}
        orcamento={visualizando}
        aoFechar={() => setDetalheAberto(false)}
        aoEditar={abrirForm}
        aoImprimir={setImprimindo}
        aoExcluir={setExcluindo}
        aoMudar={mudar}
      />
      <ConfirmarExclusaoRegistro
        nome={excluindo?.numero ?? null}
        singular="orçamento"
        aoCancelar={() => setExcluindo(null)}
        aoConfirmar={confirmarExclusao}
      />
      {imprimindo && (
        <OrcamentoDocumento
          orcamento={imprimindo}
          cliente={clientes.find((cliente) => cliente.id === imprimindo.clienteId) ?? null}
          veiculo={veiculoDe(imprimindo)}
        />
      )}
    </Listagem>
  );
}
