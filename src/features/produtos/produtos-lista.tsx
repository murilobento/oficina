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
import { formatarBRL, formatarQuantidade } from "@/lib/numeros";

import { ProdutoDetalhe } from "./produto-detalhe";
import { ProdutoForm } from "./produto-form";
import { AvisoEstoque } from "./produto-partes";
import { useProdutosStore } from "./store";
import { CATEGORIAS_PRODUTO, type Produto, rotuloCategoria, situacaoEstoque } from "./tipos";

const FILTRO_CATEGORIA = [{ valor: "todos", texto: "Todas" }, ...CATEGORIAS_PRODUTO];
const FILTRO_STATUS = [
  { valor: "todos", texto: "Todos" },
  { valor: "ativos", texto: "Ativos" },
  { valor: "inativos", texto: "Inativos" },
];
const FILTRO_ESTOQUE = [
  { valor: "todos", texto: "Todos" },
  { valor: "baixo", texto: "Baixo" },
  { valor: "sem", texto: "Sem estoque" },
];

function saldoEmTexto(produto: Produto): string {
  return `${formatarQuantidade(produto.saldo)} ${produto.unidade}`;
}

/** Listagem de produtos (peças e insumos). Criar, editar e visualizar abrem em painel lateral. */
export function ProdutosLista() {
  const produtos = useProdutosStore((estado) => estado.itens);
  const alternarAtivo = useProdutosStore((estado) => estado.alternarAtivo);
  const remover = useProdutosStore((estado) => estado.remover);

  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroEstoque, setFiltroEstoque] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Produto | null>(null);
  const [abertura, setAbertura] = useState(0);
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [visualizandoId, setVisualizandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Produto | null>(null);

  const visualizando = produtos.find((produto) => produto.id === visualizandoId) ?? null;

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return produtos
      .filter((produto) => filtroCategoria === "todos" || produto.categoria === filtroCategoria)
      .filter((produto) => filtroStatus === "todos" || produto.ativo === (filtroStatus === "ativos"))
      .filter((produto) => {
        if (filtroEstoque === "todos") return true;
        const situacao = situacaoEstoque(produto);
        // "Baixo" inclui quem já está sem estoque: é a lista do que precisa ser comprado.
        return filtroEstoque === "sem" ? situacao === "sem" : situacao !== "ok";
      })
      .filter(
        (produto) =>
          termo === "" ||
          normalizar(`${produto.descricao} ${produto.codigo} ${produto.marca} ${produto.referencia} ${produto.aplicacao}`).includes(termo) ||
          produto.codigoBarras.includes(termo),
      )
      .sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"));
  }, [produtos, busca, filtroCategoria, filtroStatus, filtroEstoque]);

  const { visiveis, paginaAtual, totalPaginas } = paginar(filtrados, pagina);

  function abrirForm(produto: Produto | null) {
    setDetalheAberto(false);
    setEmEdicao(produto);
    setAbertura((numero) => numero + 1);
    setFormAberto(true);
  }

  function abrirDetalhe(produto: Produto) {
    setVisualizandoId(produto.id);
    setDetalheAberto(true);
  }

  function aoAlternarAtivo(produto: Produto) {
    alternarAtivo(produto.id);
    toast.success(produto.ativo ? `${produto.descricao} foi inativado.` : `${produto.descricao} foi ativado.`);
  }

  function confirmarExclusao() {
    if (!excluindo) return;
    remover(excluindo.id);
    toast.success("Produto excluído.");
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
      {produtos.length === 0 ? "Nenhum produto cadastrado ainda." : "Nenhum produto encontrado com esses filtros."}
    </ListagemVazia>
  );

  return (
    <Listagem>
      <ListagemCabecalho
        titulo="Produtos"
        descricao="Peças e insumos usados nos serviços e vendidos no balcão."
        rotuloNovo="Novo produto"
        aoNovo={() => abrirForm(null)}
      />

      <ListagemFiltros>
        <ListagemBusca
          valor={busca}
          aoMudar={filtrar(setBusca)}
          placeholder="Descrição, código ou marca"
          rotulo="Buscar produtos"
        />
        <ListagemGrupoFiltros>
          <ListagemFiltro rotulo="Categoria" valor={filtroCategoria} opcoes={FILTRO_CATEGORIA} aoMudar={filtrar(setFiltroCategoria)} />
          <ListagemFiltro rotulo="Estoque" valor={filtroEstoque} opcoes={FILTRO_ESTOQUE} aoMudar={filtrar(setFiltroEstoque)} />
          <ListagemFiltro rotulo="Status" valor={filtroStatus} opcoes={FILTRO_STATUS} aoMudar={filtrar(setFiltroStatus)} />
        </ListagemGrupoFiltros>
      </ListagemFiltros>

      <ListagemCartoes>
        {visiveis.map((produto) => (
          <ListagemCartao key={produto.id}>
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                className="-my-1 flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left"
                onClick={() => abrirDetalhe(produto)}
              >
                <span className="block truncate font-medium">{produto.descricao}</span>
                <span className="text-muted-foreground block truncate text-sm">
                  {[produto.codigo, produto.marca].filter(Boolean).join(" · ")}
                </span>
              </button>
              <AcoesRegistro item={produto} nome={produto.descricao} {...acoes} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                {rotuloCategoria(produto.categoria)}
              </Badge>
              <StatusBadge ativo={produto.ativo} />
              <AvisoEstoque produto={produto} />
            </div>
            <p className="text-muted-foreground text-sm">
              {[produto.venda > 0 ? formatarBRL(produto.venda) : "", `Saldo ${saldoEmTexto(produto)}`, produto.localizacao]
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
              <TableHead className="py-3 font-normal">Produto</TableHead>
              <TableHead className="py-3 font-normal">Categoria</TableHead>
              <TableHead className="hidden py-3 font-normal @6xl:table-cell">Referência</TableHead>
              <TableHead className="py-3 text-right font-normal">Venda</TableHead>
              <TableHead className="py-3 font-normal">Estoque</TableHead>
              <TableHead className="py-3 font-normal">Status</TableHead>
              <TableHead className="py-3 text-right font-normal">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((produto) => (
              <TableRow key={produto.id}>
                <TableCell className="max-w-72 py-3">
                  <button
                    type="button"
                    className="block w-full text-left hover:underline"
                    onClick={() => abrirDetalhe(produto)}
                  >
                    <span className="block truncate font-medium">{produto.descricao}</span>
                    <span className="text-muted-foreground block truncate text-sm">
                      {[produto.codigo, produto.marca].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </TableCell>
                <TableCell className="py-3 whitespace-nowrap">{rotuloCategoria(produto.categoria)}</TableCell>
                <TableCell className="hidden py-3 whitespace-nowrap @6xl:table-cell">{produto.referencia}</TableCell>
                <TableCell className="py-3 text-right whitespace-nowrap tabular-nums">
                  {produto.venda > 0 ? formatarBRL(produto.venda) : ""}
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="whitespace-nowrap tabular-nums">{saldoEmTexto(produto)}</span>
                    <AvisoEstoque produto={produto} />
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <StatusBadge ativo={produto.ativo} />
                </TableCell>
                <TableCell className="py-3 text-right">
                  <AcoesRegistro item={produto} nome={produto.descricao} {...acoes} />
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
        singular="produto"
        plural="produtos"
        pagina={paginaAtual}
        totalPaginas={totalPaginas}
        aoMudarPagina={setPagina}
      />

      <ProdutoForm key={abertura} aberto={formAberto} produto={emEdicao} aoFechar={() => setFormAberto(false)} />
      <ProdutoDetalhe
        aberto={detalheAberto}
        produto={visualizando}
        aoFechar={() => setDetalheAberto(false)}
        aoEditar={abrirForm}
        aoAlternarAtivo={aoAlternarAtivo}
        aoExcluir={setExcluindo}
      />
      <ConfirmarExclusaoRegistro
        nome={excluindo?.descricao ?? null}
        singular="produto"
        aoCancelar={() => setExcluindo(null)}
        aoConfirmar={confirmarExclusao}
      />
    </Listagem>
  );
}
