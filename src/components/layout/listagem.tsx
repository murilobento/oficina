import type { ReactNode } from "react";

import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// PADRÃO DE LISTAGEM do sistema. Toda tela de cadastro monta a lista com estas peças, nesta
// ordem: cabeçalho (título + botão "Novo"), barra de busca e filtros, cartões no celular e
// tabela no computador, e rodapé com total e paginação. Criar, editar e visualizar abrem em
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
  /** Texto do botão no computador, ex.: "Novo cliente". No celular aparece só "Novo". */
  rotuloNovo?: string;
  /** Sem `aoNovo` o botão não aparece (listagens só de consulta). */
  aoNovo?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        <p className="text-muted-foreground text-sm">{descricao}</p>
      </div>
      {aoNovo && (
        <Button className="shrink-0" aria-label={rotuloNovo} onClick={aoNovo}>
          <Plus /> <span className="hidden sm:inline">{rotuloNovo}</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      )}
    </div>
  );
}

/** Linha de busca e filtros: busca em cima e filtros lado a lado no celular; tudo em linha no computador. */
export function ListagemFiltros({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-center">{children}</div>;
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
  // Duas colunas no celular: com três filtros, o terceiro desce para a linha de baixo.
  return <div className="grid grid-cols-2 gap-2 @2xl:flex">{children}</div>;
}

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
export function ListagemCartoes({ children }: { children: ReactNode }) {
  return <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 @2xl:grid-cols-2 @4xl:hidden">{children}</ul>;
}

export function ListagemCartao({ children }: { children: ReactNode }) {
  return <li className="bg-card flex min-w-0 flex-col gap-3 rounded-xl border p-4 uppercase [&_button]:uppercase">{children}</li>;
}

/** Moldura da tabela, quando há largura para ela. Colunas secundárias usam "hidden @6xl:table-cell". */
export function ListagemTabela({ children }: { children: ReactNode }) {
  return <div className="bg-card hidden overflow-x-auto rounded-xl border @4xl:block">{children}</div>;
}

export function ListagemVazia({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground py-10 text-center text-sm normal-case">{children}</p>;
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
