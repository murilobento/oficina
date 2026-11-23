import { PlacaVeiculo } from "@/components/marca/placa-veiculo";
import { usePessoas } from "@/features/pessoas/api";
import { useMemo, useState } from "react";

import { toast } from "sonner";

import { useAlternarAtivoVeiculo, useExcluirVeiculo, useVeiculosConsulta } from "./api";

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
import { AcoesRegistro, ConfirmarExclusaoRegistro } from "@/components/layout/registro-partes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrcamentos } from "@/features/orcamentos/api";
import { StatusBadge } from "@/features/pessoas/pessoa-partes";
import { useAbrirQuandoPedido } from "@/lib/acao-novo";
import { CLASSE_TABELA, normalizar, paginar } from "@/lib/listagem";
import { formatarQuantidade } from "@/lib/numeros";

import { historicoDoVeiculo } from "./historico";
import { COMBUSTIVEIS, mascararPlaca, type Veiculo } from "./tipos";
import { VeiculoDetalhe } from "./veiculo-detalhe";
import { VeiculoForm } from "./veiculo-form";

const FILTRO_COMBUSTIVEL = [{ valor: "todos", texto: "Todos" }, ...COMBUSTIVEIS];
const FILTRO_STATUS = [
  { valor: "todos", texto: "Todos" },
  { valor: "ativos", texto: "Ativos" },
  { valor: "inativos", texto: "Inativos" },
];

const data = (valor: string | null) => (valor ? new Date(valor).toLocaleDateString("pt-BR") : "");

/** Listagem de veículos dos clientes. `abrirId` já abre o painel de um veículo (vindo do cliente). */
export function VeiculosLista({ abrirId }: { abrirId?: string }) {
  const consulta = useVeiculosConsulta();
  const veiculos = useMemo(() => consulta.data ?? [], [consulta.data]);
  const alternar = useAlternarAtivoVeiculo();
  const excluir = useExcluirVeiculo();
  const orcamentos = useOrcamentos();
  const clientes = usePessoas("cliente");

  const [busca, setBusca] = useState("");
  const [filtroCombustivel, setFiltroCombustivel] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Veiculo | null>(null);
  const [abertura, setAbertura] = useState(0);
  const [detalheAberto, setDetalheAberto] = useState(abrirId !== undefined);
  const [visualizandoId, setVisualizandoId] = useState<string | null>(abrirId ?? null);
  const [excluindo, setExcluindo] = useState<Veiculo | null>(null);

  const visualizando = veiculos.find((item) => item.id === visualizandoId) ?? null;
  const nomeCliente = (veiculo: Veiculo) => clientes.find((c) => c.id === veiculo.clienteId)?.nome ?? "Cliente removido";
  const ultimaVisita = (veiculo: Veiculo) => historicoDoVeiculo(orcamentos, veiculo.id).ultimaVisita;

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    const termoPlaca = termo.replace(/[^a-z0-9]/g, "");
    return veiculos
      .filter((v) => filtroCombustivel === "todos" || v.combustivel === filtroCombustivel)
      .filter((v) => filtroStatus === "todos" || v.ativo === (filtroStatus === "ativos"))
      .filter((v) => {
        if (termo === "") return true;
        const cliente = clientes.find((c) => c.id === v.clienteId)?.nome ?? "";
        const noTexto = normalizar(`${v.modelo} ${cliente}`).includes(termo);
        return noTexto || (termoPlaca !== "" && v.placa.toLowerCase().includes(termoPlaca));
      })
      .sort((a, b) => a.modelo.localeCompare(b.modelo, "pt-BR"));
  }, [veiculos, clientes, busca, filtroCombustivel, filtroStatus]);

  const { visiveis, paginaAtual, totalPaginas } = paginar(filtrados, pagina);

  function abrirForm(veiculo: Veiculo | null) {
    setDetalheAberto(false);
    setEmEdicao(veiculo);
    setAbertura((numero) => numero + 1);
    setFormAberto(true);
  }

  function abrirDetalhe(veiculo: Veiculo) {
    setVisualizandoId(veiculo.id);
    setDetalheAberto(true);
  }

  async function aoAlternarAtivo(veiculo: Veiculo) {
    try {
      await alternar.mutateAsync({ id: veiculo.id, ativo: !veiculo.ativo });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível alterar. Tente de novo.");
      return;
    }
    toast.success(veiculo.ativo ? `${veiculo.modelo} foi inativado.` : `${veiculo.modelo} foi ativado.`);
  }

  function pedirExclusao(veiculo: Veiculo) {
    // Excluir apagaria a referência dos orçamentos: com histórico, só inativar.
    if (orcamentos.some((o) => o.veiculoId === veiculo.id)) {
      toast.error(`${veiculo.modelo} tem orçamentos no histórico e não pode ser excluído. Inative o veículo.`);
      return;
    }
    setExcluindo(veiculo);
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    try {
      await excluir.mutateAsync(excluindo.id);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir. Tente de novo.");
      setExcluindo(null);
      return;
    }
    toast.success("Veículo excluído.");
    if (excluindo.id === visualizandoId) setDetalheAberto(false);
    setExcluindo(null);
  }

  function filtrar(definir: (valor: string) => void) {
    return (valor: string) => {
      definir(valor);
      setPagina(1);
    };
  }

  useAbrirQuandoPedido("veiculo", () => abrirForm(null));
  const acoes = { aoVisualizar: abrirDetalhe, aoEditar: abrirForm, aoAlternarAtivo, aoExcluir: pedirExclusao };
  const vazio = (
    <ListagemVazia>
      {consulta.isPending ? "Carregando…" : consulta.isError ? consulta.error.message : veiculos.length === 0 ? "Nenhum veículo cadastrado ainda." : "Nenhum veículo encontrado com esses filtros."}
    </ListagemVazia>
  );

  return (
    <Listagem>
      <ListagemCabecalho
        titulo="Veículos"
        descricao="Carros dos clientes, com o histórico de visitas de cada um."
        rotuloNovo="Novo veículo"
        aoNovo={() => abrirForm(null)}
      />

      <ListagemFiltros>
        <ListagemBusca valor={busca} aoMudar={filtrar(setBusca)} placeholder="Modelo, placa ou cliente" rotulo="Buscar veículos" />
        <ListagemGrupoFiltros>
          <ListagemFiltro rotulo="Combustível" valor={filtroCombustivel} opcoes={FILTRO_COMBUSTIVEL} aoMudar={filtrar(setFiltroCombustivel)} />
          <ListagemFiltro rotulo="Status" valor={filtroStatus} opcoes={FILTRO_STATUS} aoMudar={filtrar(setFiltroStatus)} />
        </ListagemGrupoFiltros>
      </ListagemFiltros>

      <ListagemCartoes>
        {visiveis.map((veiculo) => (
          <ListagemCartao key={veiculo.id}>
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                className="-my-1 flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center gap-1 text-left"
                onClick={() => abrirDetalhe(veiculo)}
              >
                {veiculo.placa ? <PlacaVeiculo placa={veiculo.placa} /> : <span className="text-muted-foreground text-xs">Sem placa</span>}
                <span className="block max-w-full truncate font-semibold">{[veiculo.modelo, veiculo.ano].filter(Boolean).join(" · ")}</span>
              </button>
              <AcoesRegistro item={veiculo} nome={veiculo.modelo} {...acoes} />
            </div>
            <p className="text-muted-foreground truncate text-sm">{nomeCliente(veiculo)}</p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge ativo={veiculo.ativo} />
              <span className="text-muted-foreground tabular-nums text-xs">
                {[veiculo.km > 0 && `${formatarQuantidade(veiculo.km)} km`, ultimaVisita(veiculo) && `visita ${data(ultimaVisita(veiculo))}`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </ListagemCartao>
        ))}
        {visiveis.length === 0 && <li className="col-span-full">{vazio}</li>}
      </ListagemCartoes>

      <ListagemTabela>
        <Table className={CLASSE_TABELA}>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3 font-normal">Veículo</TableHead>
              <TableHead className="py-3 font-normal">Placa</TableHead>
              <TableHead className="py-3 font-normal">Cliente</TableHead>
              <TableHead className="hidden py-3 text-right font-normal @6xl:table-cell">Km</TableHead>
              <TableHead className="hidden py-3 font-normal @6xl:table-cell">Última visita</TableHead>
              <TableHead className="py-3 font-normal">Status</TableHead>
              <TableHead className="py-3 text-right font-normal">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((veiculo) => (
              <TableRow key={veiculo.id}>
                <TableCell className="max-w-64 py-3">
                  <button type="button" className="block w-full text-left hover:underline" onClick={() => abrirDetalhe(veiculo)}>
                    <span className="block truncate font-medium">{veiculo.modelo}</span>
                    <span className="text-muted-foreground block truncate text-sm">
                      {[veiculo.ano, veiculo.cor].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </TableCell>
                <TableCell className="py-3 whitespace-nowrap">{mascararPlaca(veiculo.placa)}</TableCell>
                <TableCell className="max-w-56 truncate py-3">{nomeCliente(veiculo)}</TableCell>
                <TableCell className="hidden py-3 text-right whitespace-nowrap tabular-nums @6xl:table-cell">
                  {veiculo.km > 0 ? `${formatarQuantidade(veiculo.km)} km` : ""}
                </TableCell>
                <TableCell className="hidden py-3 whitespace-nowrap @6xl:table-cell">{data(ultimaVisita(veiculo))}</TableCell>
                <TableCell className="py-3">
                  <StatusBadge ativo={veiculo.ativo} />
                </TableCell>
                <TableCell className="py-3 text-right">
                  <AcoesRegistro item={veiculo} nome={veiculo.modelo} {...acoes} />
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
        singular="veículo"
        plural="veículos"
        pagina={paginaAtual}
        totalPaginas={totalPaginas}
        aoMudarPagina={setPagina}
      />

      <VeiculoForm key={abertura} aberto={formAberto} veiculo={emEdicao} aoFechar={() => setFormAberto(false)} />
      <VeiculoDetalhe
        aberto={detalheAberto}
        veiculo={visualizando}
        aoFechar={() => setDetalheAberto(false)}
        aoEditar={abrirForm}
        aoAlternarAtivo={aoAlternarAtivo}
        aoExcluir={pedirExclusao}
      />
      <ConfirmarExclusaoRegistro
        nome={excluindo?.modelo ?? null}
        singular="veículo"
        aoCancelar={() => setExcluindo(null)}
        aoConfirmar={confirmarExclusao}
      />
    </Listagem>
  );
}
