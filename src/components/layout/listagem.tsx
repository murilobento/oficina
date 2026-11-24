import { Children, isValidElement, type ReactNode } from "react";

import { ChevronDown, ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";

import { PlacaVeiculo } from "@/components/marca/placa-veiculo";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// PADRÃO DE LISTAGEM do sistema. Toda tela de cadastro monta a lista com estas peças, nesta
// ordem: cabeçalho (título + botão "Novo"), barra de busca e filtros (cada filtro é um botão
// suspenso "Rótulo: valor ▾", com "Limpar" quando algum está em uso), linhas no celular e tabela no computador, e rodapé com total e paginação. Criar, editar e visualizar abrem em
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
  acoes,
}: {
  titulo: string;
  descricao: string;
  /** Texto do botão no computador, ex.: "Novo cliente". No celular o botão é só o ＋ (com este nome acessível). */
  rotuloNovo?: string;
  /** Sem `aoNovo` o botão não aparece (listagens só de consulta). */
  aoNovo?: () => void;
  /** Botões extras, antes do "Novo" (ex.: "Modo TV" na agenda). */
  acoes?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold">{titulo}</h1>
        {/* No celular a descrição some: o título já diz onde se está. */}
        <p className="text-muted-foreground mt-0.5 hidden text-sm md:block">{descricao}</p>
      </div>
      {(aoNovo || acoes) && (
        <div className="flex shrink-0 items-center gap-2">
          {acoes}
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
      )}
    </div>
  );
}

/**
 * Linha de busca e filtros. Computador: busca e filtros na mesma linha.
 * Celular: busca em cima e os filtros embaixo, numa linha que rola de lado.
 */
export function ListagemFiltros({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background sticky top-14 z-20 -mx-4 flex flex-col gap-2 px-4 py-2 md:top-12 md:-mx-6 md:px-6 @2xl:flex-row @2xl:items-start @2xl:gap-3">
      {children}
    </div>
  );
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
    <InputGroup className="@2xl:max-w-80 @2xl:min-w-56 @2xl:flex-1">
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

type PropsFiltro = {
  /** Ex.: "Status". Aparece antes do valor escolhido. */
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  /** A primeira opção é o padrão (ex.: "Todos"); qualquer outra deixa o filtro "em uso". */
  opcoes: { valor: string; texto: string }[];
};

const emUso = ({ valor, opcoes }: PropsFiltro) => opcoes.length > 0 && valor !== opcoes[0].valor;

/**
 * Os filtros da listagem, lado a lado. Quando algum está em uso, aparece "Limpar",
 * que volta todos para a primeira opção.
 */
export function ListagemGrupoFiltros({ children }: { children: ReactNode }) {
  // Reconhece os filtros pelas props (e não pelo componente), para não depender da identidade da função.
  const filtros = Children.toArray(children)
    .filter(isValidElement)
    .map((filho) => filho.props as Partial<PropsFiltro>)
    .filter((props): props is PropsFiltro => Array.isArray(props.opcoes) && typeof props.aoMudar === "function" && typeof props.valor === "string");
  const algumEmUso = filtros.some(emUso);

  return (
    <div
      role="group"
      aria-label="Filtros"
      className="-mx-4 -my-1 flex min-w-0 items-center gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] md:-mx-6 md:px-6 @2xl:mx-0 @2xl:flex-initial @2xl:flex-wrap @2xl:overflow-visible @2xl:px-0"
    >
      {children}
      {algumEmUso && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-9 shrink-0"
          onClick={() => filtros.filter(emUso).forEach((filtro) => filtro.aoMudar(filtro.opcoes[0].valor))}
        >
          <X /> Limpar
        </Button>
      )}
    </div>
  );
}

/** Um filtro: botão compacto "Rótulo: valor ▾" que abre as opções. Destacado quando está em uso. */
export function ListagemFiltro(props: PropsFiltro) {
  const { rotulo, valor, aoMudar, opcoes } = props;
  const ativo = emUso(props);
  const escolhida = opcoes.find((opcao) => opcao.valor === valor)?.texto ?? opcoes[0]?.texto;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label={`Filtrar por ${rotulo.toLowerCase()}: ${escolhida}`}
          className={cn(
            "h-9 shrink-0 gap-1.5 px-3 font-normal",
            ativo && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary dark:border-primary/40 dark:bg-primary/15",
          )}
        >
          <span className={ativo ? "text-primary/80" : "text-muted-foreground"}>{rotulo}:</span>
          <span className="font-medium">{escolhida}</span>
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 min-w-48 overflow-y-auto">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">{rotulo}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={valor} onValueChange={aoMudar}>
          {opcoes.map((opcao) => (
            <DropdownMenuRadioItem key={opcao.valor} value={opcao.valor}>
              {opcao.texto}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Abas com contagem, para quando um filtro é o jeito principal de navegar a lista (ex.: etapas da OS). */
export function ListagemAbas<T extends string>({
  rotulo,
  valor,
  aoMudar,
  abas,
}: {
  /** Nome acessível do grupo, ex.: "Etapas". */
  rotulo: string;
  valor: T;
  aoMudar: (valor: T) => void;
  abas: { valor: T; texto: string; total: number }[];
}) {
  return (
    <div
      role="tablist"
      aria-label={rotulo}
      className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 [scrollbar-width:none] md:-mx-6 md:px-6"
    >
      {abas.map((aba) => {
        const ativa = aba.valor === valor;
        return (
          <button
            key={aba.valor}
            type="button"
            role="tab"
            aria-selected={ativa}
            onClick={() => aoMudar(aba.valor)}
            className={cn(
              "focus-visible:ring-ring -mb-px flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-inset",
              ativa ? "border-primary text-foreground font-medium" : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {aba.texto}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs leading-none tabular-nums",
                ativa ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              {aba.total}
            </span>
          </button>
        );
      })}
    </div>
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
