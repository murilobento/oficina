import { useEffect, useMemo, useState } from "react";

import { TriangleAlert } from "lucide-react";

import { Listagem, ListagemBusca, ListagemCabecalho, ListagemFiltro, ListagemFiltros, ListagemGrupoFiltros, ListagemVazia } from "@/components/layout/listagem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useAuditoria, useUsuariosAuditoria } from "./api";
import { AuditoriaDetalhe } from "./auditoria-detalhe";
import { CATEGORIAS, type CategoriaAuditoria, ehSensivel, hora, inicioDoPeriodo, PERIODOS, type RegistroAuditoria, rotuloDia } from "./tipos";

const TODOS = "todos";
const FILTRO_CATEGORIA = [{ valor: TODOS, texto: "Todas" }, ...Object.entries(CATEGORIAS).map(([valor, { texto }]) => ({ valor, texto }))];

/** Espera o usuário parar de digitar antes de buscar no servidor. */
function useAtrasado(valor: string, ms = 300) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const espera = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(espera);
  }, [valor, ms]);
  return atrasado;
}

export function AuditoriaLista() {
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState(PERIODOS[0].valor);
  const [categoria, setCategoria] = useState(TODOS);
  const [usuario, setUsuario] = useState(TODOS);
  const [aberto, setAberto] = useState<RegistroAuditoria | null>(null);
  const termo = useAtrasado(busca.trim());

  // O início do período é fixado quando o filtro muda (não a cada render), para a consulta não mudar de chave.
  const de = useMemo(() => inicioDoPeriodo(periodo), [periodo]);
  const consulta = useAuditoria({ de, categoria: categoria === TODOS ? undefined : categoria, usuario: usuario === TODOS ? undefined : usuario, busca: termo });
  const usuarios = useUsuariosAuditoria().data ?? [];
  const opcoesUsuario = [{ valor: TODOS, texto: "Todos" }, ...usuarios.map((u) => ({ valor: u.id, texto: u.nome }))];

  const registros = consulta.data?.pages.flatMap((pagina) => pagina.registros) ?? [];
  const porDia = agrupar(registros);

  return (
    <Listagem>
      <ListagemCabecalho titulo="Auditoria" descricao="Quem fez o quê: dinheiro, estoque, preços, exclusões, acessos e entradas no sistema." />

      <ListagemFiltros>
        <ListagemBusca valor={busca} aoMudar={setBusca} placeholder="Ação, documento ou funcionário" rotulo="Buscar na auditoria" />
        <ListagemGrupoFiltros>
          <ListagemFiltro rotulo="Período" valor={periodo} opcoes={PERIODOS} aoMudar={setPeriodo} />
          <ListagemFiltro rotulo="Categoria" valor={categoria} opcoes={FILTRO_CATEGORIA} aoMudar={setCategoria} />
          <ListagemFiltro rotulo="Funcionário" valor={usuario} opcoes={opcoesUsuario} aoMudar={setUsuario} />
        </ListagemGrupoFiltros>
      </ListagemFiltros>

      {consulta.isError ? (
        <ListagemVazia>Não foi possível carregar a auditoria.</ListagemVazia>
      ) : consulta.isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : registros.length === 0 ? (
        <ListagemVazia>Nada registrado com estes filtros.</ListagemVazia>
      ) : (
        <div className="flex flex-col gap-6">
          {porDia.map(([dia, itens]) => (
            <section key={dia} className="flex flex-col gap-2">
              <h2 className="text-muted-foreground text-sm font-medium first-letter:uppercase">{dia}</h2>
              <ul className="bg-card flex flex-col divide-y overflow-hidden rounded-xl border">
                {itens.map((registro) => (
                  <LinhaAuditoria key={registro.id} registro={registro} aoAbrir={() => setAberto(registro)} />
                ))}
              </ul>
            </section>
          ))}
          {consulta.hasNextPage && (
            <Button variant="outline" className="self-center" disabled={consulta.isFetchingNextPage} onClick={() => void consulta.fetchNextPage()}>
              {consulta.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
            </Button>
          )}
        </div>
      )}

      <AuditoriaDetalhe registro={aberto} aoFechar={() => setAberto(null)} />
    </Listagem>
  );
}

function LinhaAuditoria({ registro, aoAbrir }: { registro: RegistroAuditoria; aoAbrir: () => void }) {
  const categoria = CATEGORIAS[registro.categoria as CategoriaAuditoria];
  const Icone = categoria?.icone;
  const sensivel = ehSensivel(registro);

  return (
    <li>
      <button type="button" onClick={aoAbrir} className="hover:bg-muted/50 flex w-full items-start gap-3 px-4 py-3 text-left">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
            sensivel ? "bg-erro-fundo text-erro" : "bg-muted text-muted-foreground",
          )}
          title={categoria?.texto}
        >
          {Icone && <Icone className="size-4" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm break-words">{registro.descricao}</span>
          <span className="text-muted-foreground text-xs">
            {registro.usuario || "Sem identificação"} · {categoria?.texto ?? registro.categoria}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-muted-foreground text-xs tabular-nums">{hora(registro.criadoEm)}</span>
          {sensivel && (
            <span className="text-erro flex items-center gap-1 text-xs font-medium">
              <TriangleAlert className="size-3" /> Atenção
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

/** Agrupa por dia, mantendo a ordem (mais recentes primeiro). */
function agrupar(registros: RegistroAuditoria[]): [string, RegistroAuditoria[]][] {
  const grupos = new Map<string, RegistroAuditoria[]>();
  for (const registro of registros) {
    const dia = rotuloDia(registro.criadoEm);
    grupos.set(dia, [...(grupos.get(dia) ?? []), registro]);
  }
  return [...grupos];
}
