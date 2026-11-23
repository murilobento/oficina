import type { ReactNode } from "react";

import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { PlacaVeiculo } from "@/components/marca/placa-veiculo";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// PADRÃO DE LISTAGEM do sistema. Toda tela de cadastro monta a lista com estas peças, nesta
// ordem: cabeçalho (título + botão "Novo"), barra de busca e filtros (filtros curtos viram
// chips), linhas no celular e tabela no computador, e rodapé com total e paginação. Criar, editar e visualizar abrem em
// painel lateral (Sheet), sem sair da lista.

export function Listagem({ children }: { children: ReactNode }) {
  // @container: cartões ou tabela dependem do espaço livre da tela (o menu lateral aberto conta).
  return <div className="@container flex flex-col gap-4 md:gap-6">{children}</div>;
}

export function ListagemCabecalho({
  titulo,
  descricao,
  rotuloNovo,
  aoNovo,
}: {
  titulo: string;
  descricao: string;
  /** Texto do botão no computador, ex.: "Novo cliente". No celular o botão é só o ＋ (com este nome acessível). */
  rotuloNovo?: string;
  /** Sem `aoNovo` o botão não aparece (listagens só de consulta). */
  aoNovo?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold">{titulo}</h1>
        {/* No celular a descrição some: o título já diz onde se está. */}
        <p className="text-muted-foreground mt-0.5 hidden text-sm md:block">{descricao}</p>
      </div>
      {aoNovo && (
        <>
          <Button size="icon" className="shrink-0 rounded-full sm:hidden" aria-label={rotuloNovo ?? "Novo"} onClick={aoNovo}>
            <Plus className="size-5" />
          </Button>
          <Button className="hidden shrink-0 sm:inline-flex" onClick={aoNovo}>
            <Plus /> {rotuloNovo ?? "Novo"}
          </Button>
        </>
      )}
    </div>
  );
}

/** Linha de busca e filtros: busca em cima e filtros lado a lado no celular; tudo em linha no computador. */
export function ListagemFiltros({ children }: { children: ReactNode }) {
  return <div className="bg-background sticky top-14 z-20 -mx-4 flex flex-col gap-3 px-4 py-2 md:top-12 md:-mx-6 md:px-6 @2xl:flex-row @2xl:items-center">{children}</div>;
}

export function ListagemBusca({
  valor,
  aoMudar,
  placeholder,
  rotulo,
}: {
  valor: string;
  aoMudar: (valor: string) => void;
  placeholder: string;
  /** Nome acessível do campo, ex.: "Buscar clientes". */
  rotulo: string;
}) {
  return (
    <InputGroup className="@2xl:max-w-sm">
      <InputGroupAddon align="inline-start">
        <Search className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        placeholder={placeholder}
        aria-label={rotulo}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
      />
    </InputGroup>
  );
}

export function ListagemGrupoFiltros({ children }: { children: ReactNode }) {
  // Celular: cada filtro numa linha (chips roláveis ou seleção). Computador: tudo lado a lado.
  return <div className="flex min-w-0 flex-col gap-2 @2xl:flex-row @2xl:flex-wrap @2xl:items-center">{children}</div>;
}

/** Filtros com até este número de opções aparecem como chips; mais que isso, como lista de seleção. */
const MAX_CHIPS = 5;

const CHIP = "focus-visible:ring-ring h-9 shrink-0 rounded-full px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

export function ListagemFiltro({
  rotulo,
  valor,
  aoMudar,
  opcoes,
}: {
  /** Ex.: "Status". Aparece antes do valor escolhido. */
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  opcoes: { valor: string; texto: string }[];
}) {
  if (opcoes.length <= MAX_CHIPS) {
    return (
      <div
        role="group"
        aria-label={`Filtrar por ${rotulo.toLowerCase()}`}
        className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:-mx-6 md:px-6 @2xl:mx-0 @2xl:px-0"
      >
        {opcoes.map((opcao) => {
          const ativo = opcao.valor === valor;
          return (
            <button
              key={opcao.valor}
              type="button"
              aria-pressed={ativo}
              onClick={() => aoMudar(opcao.valor)}
              className={ativo ? `${CHIP} bg-foreground text-background font-medium` : `${CHIP} bg-card text-foreground hover:bg-muted border`}
            >
              {opcao.texto}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <Select value={valor} onValueChange={aoMudar}>
      <SelectTrigger className="min-w-0 flex-1 @2xl:flex-none" aria-label={`Filtrar por ${rotulo.toLowerCase()}`}>
        <span className="text-muted-foreground">{rotulo}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        <SelectGroup>
          {opcoes.map((opcao) => (
            <SelectItem key={opcao.valor} value={opcao.valor}>
              {opcao.texto}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

/** Lista de cartões, quando a área da tela é estreita (celular, tablet). Cada filho deve ser um <ListagemCartao>. */
export function ListagemCartoes({ children, sempre = false }: { children: ReactNode; sempre?: boolean }) {
  // Padrão: linhas num só bloco (lista de app), trocado pela tabela quando há espaço.
  // `sempre`: telas sem tabela (quadro de OS, A receber) usam cartões soltos, em mais colunas no computador.
  return (
    <ul
      data-sempre={sempre}
      className={
        sempre
          ? "group/lista grid grid-cols-[minmax(0,1fr)] gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3 @7xl:grid-cols-4"
          : "group/lista bg-card flex flex-col divide-y overflow-hidden rounded-xl border @4xl:hidden"
      }
    >
      {children}
    </ul>
  );
}

/** Um item da lista: linha dentro do bloco, ou cartão solto quando a lista é `sempre`. */
const ITEM_LISTA =
  "flex min-w-0 flex-col group-data-[sempre=true]/lista:overflow-hidden group-data-[sempre=true]/lista:rounded-xl group-data-[sempre=true]/lista:border group-data-[sempre=true]/lista:bg-card";

export function ListagemCartao({ children }: { children: ReactNode }) {
  return <li className={`${ITEM_LISTA} gap-2 px-4 py-3`}>{children}</li>;
}

/**
 * Cartão de documento (orçamento, venda, compra): cabeçalho com código e status, corpo com
 * cliente e detalhe (e placa, se houver) e rodapé com o valor em destaque e a data.
 */
export function ListagemCartaoDocumento({
  codigo,
  status,
  acoes,
  titulo,
  detalhe,
  placa,
  valor,
  data,
  aoAbrir,
}: {
  codigo: string;
  status: ReactNode;
  acoes: ReactNode;
  titulo: string;
  detalhe: string;
  placa?: string;
  valor: string;
  data: string;
  aoAbrir: () => void;
}) {
  return (
    <li className={ITEM_LISTA}>
      <button type="button" className="hover:bg-muted/50 flex min-w-0 flex-col gap-1 px-4 pt-3 pb-1.5 text-left" onClick={aoAbrir}>
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate font-medium">{titulo}</span>
          <span className="shrink-0 font-semibold tabular-nums">{valor}</span>
        </span>
        <span className="text-muted-foreground flex items-center justify-between gap-3 text-sm">
          <span className="truncate">{[detalhe, codigo, data].filter(Boolean).join(" · ")}</span>
          {placa && <PlacaVeiculo placa={placa} tamanho="sm" />}
        </span>
      </button>
      <div className="flex min-h-10 items-center justify-between gap-2 pr-1 pb-1.5 pl-4">
        {status}
        <div className="flex items-center">{acoes}</div>
      </div>
    </li>
  );
}

/** Moldura da tabela, quando há largura para ela. Colunas secundárias usam "hidden @6xl:table-cell". */
export function ListagemTabela({ children }: { children: ReactNode }) {
  return <div className="bg-card hidden overflow-x-auto rounded-xl border @4xl:block">{children}</div>;
}

export function ListagemVazia({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground py-10 text-center text-sm">{children}</p>;
}

export function ListagemRodape({
  total,
  singular,
  plural,
  pagina,
  totalPaginas,
  aoMudarPagina,
}: {
  total: number;
  singular: string;
  plural: string;
  pagina: number;
  totalPaginas: number;
  aoMudarPagina: (pagina: number) => void;
}) {
  return (
    <div className="text-muted-foreground flex items-center justify-between gap-3 text-sm">
      <span className="tabular-nums">
        {total} {total === 1 ? singular : plural}
      </span>
      <div className="flex items-center gap-2">
        <span className="tabular-nums">
          Página {pagina} de {totalPaginas}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Página anterior"
          disabled={pagina <= 1}
          onClick={() => aoMudarPagina(pagina - 1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Próxima página"
          disabled={pagina >= totalPaginas}
          onClick={() => aoMudarPagina(pagina + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
