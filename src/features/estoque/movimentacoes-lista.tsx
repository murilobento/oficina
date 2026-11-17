import { useProdutos } from "@/features/produtos/api";
import { useMemo, useState } from "react";

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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CLASSE_TABELA, normalizar, paginar } from "@/lib/listagem";
import { formatarQuantidade } from "@/lib/numeros";
import { cn } from "@/lib/utils";

import { useMovimentos } from "@/features/estoque/api";
import { type Movimento, ROTULO_ORIGEM } from "./tipos";

const FILTRO_TIPO = [
  { valor: "todos", texto: "Todos" },
  { valor: "entrada", texto: "Entradas" },
  { valor: "saida", texto: "Saídas" },
];
const FILTRO_ORIGEM = [
  { valor: "todos", texto: "Todas" },
  ...Object.entries(ROTULO_ORIGEM).map(([valor, texto]) => ({ valor, texto })),
];

const dataHora = (valor: string) =>
  new Date(valor).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function TipoBadge({ tipo }: { tipo: Movimento["tipo"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "px-2 py-1 font-medium",
        tipo === "entrada"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      )}
    >
      {tipo === "entrada" ? "Entrada" : "Saída"}
    </Badge>
  );
}

/** Histórico de movimentações do estoque (somente consulta): quem lança são compras, vendas e acertos. */
export function MovimentacoesLista() {
  const movimentos = useMovimentos();
  const produtos = useProdutos();

  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroOrigem, setFiltroOrigem] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const produtoDe = (movimento: Movimento) => produtos.find((item) => item.id === movimento.produtoId);
  const nomeProduto = (movimento: Movimento) => produtoDe(movimento)?.descricao ?? "Produto removido";

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return movimentos
      .filter((m) => filtroTipo === "todos" || m.tipo === filtroTipo)
      .filter((m) => filtroOrigem === "todos" || m.origem === filtroOrigem)
      .filter((m) => {
        if (termo === "") return true;
        const produto = produtos.find((item) => item.id === m.produtoId);
        return normalizar(`${produto?.descricao ?? ""} ${produto?.codigo ?? ""} ${m.documento} ${m.motivo}`).includes(termo);
      })
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [movimentos, produtos, busca, filtroTipo, filtroOrigem]);

  const { visiveis, paginaAtual, totalPaginas } = paginar(filtrados, pagina);

  function filtrar(definir: (valor: string) => void) {
    return (valor: string) => {
      definir(valor);
      setPagina(1);
    };
  }

  const qtd = (m: Movimento) => `${m.tipo === "entrada" ? "+" : "−"}${formatarQuantidade(m.quantidade)}`;
  const origem = (m: Movimento) => [ROTULO_ORIGEM[m.origem], m.documento].filter(Boolean).join(" ");
  const vazio = (
    <ListagemVazia>
      {movimentos.length === 0 ? "Nenhuma movimentação ainda." : "Nenhuma movimentação encontrada com esses filtros."}
    </ListagemVazia>
  );

  return (
    <Listagem>
      <ListagemCabecalho
        titulo="Movimentação de estoque"
        descricao="Consulta de tudo que entrou e saiu das peças. Os registros vêm das compras, vendas e acertos."
      />

      <ListagemFiltros>
        <ListagemBusca valor={busca} aoMudar={filtrar(setBusca)} placeholder="Produto, documento ou motivo" rotulo="Buscar movimentações" />
        <ListagemGrupoFiltros>
          <ListagemFiltro rotulo="Tipo" valor={filtroTipo} opcoes={FILTRO_TIPO} aoMudar={filtrar(setFiltroTipo)} />
          <ListagemFiltro rotulo="Origem" valor={filtroOrigem} opcoes={FILTRO_ORIGEM} aoMudar={filtrar(setFiltroOrigem)} />
        </ListagemGrupoFiltros>
      </ListagemFiltros>

      <ListagemCartoes>
        {visiveis.map((m) => (
          <ListagemCartao key={m.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="block truncate font-medium">{nomeProduto(m)}</span>
                <span className="text-muted-foreground block truncate text-sm">{dataHora(m.criadoEm)}</span>
              </div>
              <TipoBadge tipo={m.tipo} />
            </div>
            <p className="text-sm tabular-nums">
              <span className="font-medium">
                {qtd(m)} {produtoDe(m)?.unidade}
              </span>
              <span className="text-muted-foreground"> · saldo {formatarQuantidade(m.saldoApos)}</span>
            </p>
            <p className="text-muted-foreground truncate text-sm">{[origem(m), m.motivo].filter(Boolean).join(" · ")}</p>
          </ListagemCartao>
        ))}
        {visiveis.length === 0 && <li className="col-span-full">{vazio}</li>}
      </ListagemCartoes>

      <ListagemTabela>
        <Table className={CLASSE_TABELA}>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3 font-normal">Data</TableHead>
              <TableHead className="py-3 font-normal">Produto</TableHead>
              <TableHead className="py-3 font-normal">Tipo</TableHead>
              <TableHead className="py-3 text-right font-normal">Quantidade</TableHead>
              <TableHead className="py-3 text-right font-normal">Saldo</TableHead>
              <TableHead className="py-3 font-normal">Origem</TableHead>
              <TableHead className="hidden py-3 font-normal @6xl:table-cell">Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="py-3 whitespace-nowrap">{dataHora(m.criadoEm)}</TableCell>
                <TableCell className="max-w-64 py-3">
                  <span className="block truncate font-medium">{nomeProduto(m)}</span>
                  <span className="text-muted-foreground block truncate text-sm">{produtoDe(m)?.codigo}</span>
                </TableCell>
                <TableCell className="py-3">
                  <TipoBadge tipo={m.tipo} />
                </TableCell>
                <TableCell className="py-3 text-right whitespace-nowrap tabular-nums">
                  {qtd(m)} {produtoDe(m)?.unidade}
                </TableCell>
                <TableCell className="py-3 text-right whitespace-nowrap tabular-nums">{formatarQuantidade(m.saldoApos)}</TableCell>
                <TableCell className="py-3 whitespace-nowrap">{origem(m)}</TableCell>
                <TableCell className="text-muted-foreground hidden max-w-64 truncate py-3 @6xl:table-cell">{m.motivo}</TableCell>
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
        singular="movimentação"
        plural="movimentações"
        pagina={paginaAtual}
        totalPaginas={totalPaginas}
        aoMudarPagina={setPagina}
      />
    </Listagem>
  );
}
