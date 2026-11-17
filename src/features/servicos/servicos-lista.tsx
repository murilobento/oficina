import { useMemo, useState } from "react";

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
import { AcoesRegistro, ConfirmarExclusaoRegistro } from "@/components/layout/registro-partes";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/features/pessoas/pessoa-partes";
import { CLASSE_TABELA, normalizar, paginar } from "@/lib/listagem";
import { formatarBRL } from "@/lib/numeros";

import { ServicoDetalhe } from "./servico-detalhe";
import { ServicoForm } from "./servico-form";
import { useServicosStore } from "./store";
import { CATEGORIAS_SERVICO, formatarGarantia, formatarTempo, rotuloCategoriaServico, type Servico } from "./tipos";

const FILTRO_CATEGORIA = [{ valor: "todos", texto: "Todas" }, ...CATEGORIAS_SERVICO];
const FILTRO_STATUS = [
  { valor: "todos", texto: "Todos" },
  { valor: "ativos", texto: "Ativos" },
  { valor: "inativos", texto: "Inativos" },
];

/** Listagem de serviços (mão de obra). Criar, editar e visualizar abrem em painel lateral. */
export function ServicosLista() {
  const servicos = useServicosStore((estado) => estado.itens);
  const alternarAtivo = useServicosStore((estado) => estado.alternarAtivo);
  const remover = useServicosStore((estado) => estado.remover);

  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Servico | null>(null);
  const [abertura, setAbertura] = useState(0);
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [visualizandoId, setVisualizandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Servico | null>(null);

  const visualizando = servicos.find((servico) => servico.id === visualizandoId) ?? null;

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return servicos
      .filter((servico) => filtroCategoria === "todos" || servico.categoria === filtroCategoria)
      .filter((servico) => filtroStatus === "todos" || servico.ativo === (filtroStatus === "ativos"))
      .filter((servico) => termo === "" || normalizar(`${servico.descricao} ${servico.codigo}`).includes(termo))
      .sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"));
  }, [servicos, busca, filtroCategoria, filtroStatus]);

  const { visiveis, paginaAtual, totalPaginas } = paginar(filtrados, pagina);

  function abrirForm(servico: Servico | null) {
    setDetalheAberto(false);
    setEmEdicao(servico);
    setAbertura((numero) => numero + 1);
    setFormAberto(true);
  }

  function abrirDetalhe(servico: Servico) {
    setVisualizandoId(servico.id);
    setDetalheAberto(true);
  }

  function aoAlternarAtivo(servico: Servico) {
    alternarAtivo(servico.id);
    toast.success(servico.ativo ? `${servico.descricao} foi inativado.` : `${servico.descricao} foi ativado.`);
  }

  function confirmarExclusao() {
    if (!excluindo) return;
    remover(excluindo.id);
    toast.success("Serviço excluído.");
    if (excluindo.id === visualizandoId) setDetalheAberto(false);
    setExcluindo(null);
  }

  function filtrar(definir: (valor: string) => void) {
    return (valor: string) => {
      definir(valor);
      setPagina(1);
    };
  }

  const acoes = { aoVisualizar: abrirDetalhe, aoEditar: abrirForm, aoAlternarAtivo, aoExcluir: setExcluindo };
  const vazio = (
    <ListagemVazia>
      {servicos.length === 0 ? "Nenhum serviço cadastrado ainda." : "Nenhum serviço encontrado com esses filtros."}
    </ListagemVazia>
  );

  return (
    <Listagem>
      <ListagemCabecalho
        titulo="Serviços"
        descricao="Mão de obra que a oficina executa, com valor e tempo padrão."
        rotuloNovo="Novo serviço"
        aoNovo={() => abrirForm(null)}
      />

      <ListagemFiltros>
        <ListagemBusca valor={busca} aoMudar={filtrar(setBusca)} placeholder="Descrição ou código" rotulo="Buscar serviços" />
        <ListagemGrupoFiltros>
          <ListagemFiltro rotulo="Categoria" valor={filtroCategoria} opcoes={FILTRO_CATEGORIA} aoMudar={filtrar(setFiltroCategoria)} />
          <ListagemFiltro rotulo="Status" valor={filtroStatus} opcoes={FILTRO_STATUS} aoMudar={filtrar(setFiltroStatus)} />
        </ListagemGrupoFiltros>
      </ListagemFiltros>

      <ListagemCartoes>
        {visiveis.map((servico) => (
          <ListagemCartao key={servico.id}>
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                className="-my-1 flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left"
                onClick={() => abrirDetalhe(servico)}
              >
                <span className="block truncate font-medium">{servico.descricao}</span>
                <span className="text-muted-foreground block truncate text-sm">{servico.codigo}</span>
              </button>
              <AcoesRegistro item={servico} nome={servico.descricao} {...acoes} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                {rotuloCategoriaServico(servico.categoria)}
              </Badge>
              <StatusBadge ativo={servico.ativo} />
            </div>
            <p className="text-muted-foreground text-sm">
              {[servico.valor > 0 ? formatarBRL(servico.valor) : "", formatarTempo(servico.tempoHoras)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </ListagemCartao>
        ))}
        {visiveis.length === 0 && <li className="col-span-full">{vazio}</li>}
      </ListagemCartoes>

      <ListagemTabela>
        <Table className={CLASSE_TABELA}>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3 font-normal">Serviço</TableHead>
              <TableHead className="py-3 font-normal">Categoria</TableHead>
              <TableHead className="py-3 text-right font-normal">Valor</TableHead>
              <TableHead className="py-3 font-normal">Tempo</TableHead>
              <TableHead className="hidden py-3 font-normal @6xl:table-cell">Garantia</TableHead>
              <TableHead className="py-3 font-normal">Status</TableHead>
              <TableHead className="py-3 text-right font-normal">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((servico) => (
              <TableRow key={servico.id}>
                <TableCell className="max-w-72 py-3">
                  <button
                    type="button"
                    className="block w-full text-left hover:underline"
                    onClick={() => abrirDetalhe(servico)}
                  >
                    <span className="block truncate font-medium">{servico.descricao}</span>
                    <span className="text-muted-foreground block truncate text-sm">{servico.codigo}</span>
                  </button>
                </TableCell>
                <TableCell className="py-3 whitespace-nowrap">{rotuloCategoriaServico(servico.categoria)}</TableCell>
                <TableCell className="py-3 text-right whitespace-nowrap tabular-nums">
                  {servico.valor > 0 ? formatarBRL(servico.valor) : ""}
                </TableCell>
                <TableCell className="py-3 whitespace-nowrap tabular-nums">{formatarTempo(servico.tempoHoras)}</TableCell>
                <TableCell className="hidden py-3 whitespace-nowrap @6xl:table-cell">{formatarGarantia(servico)}</TableCell>
                <TableCell className="py-3">
                  <StatusBadge ativo={servico.ativo} />
                </TableCell>
                <TableCell className="py-3 text-right">
                  <AcoesRegistro item={servico} nome={servico.descricao} {...acoes} />
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
        singular="serviço"
        plural="serviços"
        pagina={paginaAtual}
        totalPaginas={totalPaginas}
        aoMudarPagina={setPagina}
      />

      <ServicoForm key={abertura} aberto={formAberto} servico={emEdicao} aoFechar={() => setFormAberto(false)} />
      <ServicoDetalhe
        aberto={detalheAberto}
        servico={visualizando}
        aoFechar={() => setDetalheAberto(false)}
        aoEditar={abrirForm}
        aoAlternarAtivo={aoAlternarAtivo}
        aoExcluir={setExcluindo}
      />
      <ConfirmarExclusaoRegistro
        nome={excluindo?.descricao ?? null}
        singular="serviço"
        aoCancelar={() => setExcluindo(null)}
        aoConfirmar={confirmarExclusao}
      />
    </Listagem>
  );
}
