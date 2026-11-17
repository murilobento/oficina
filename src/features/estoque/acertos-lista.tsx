import { useMemo, useState } from "react";

import { Eye } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CLASSE_TABELA, normalizar, paginar } from "@/lib/listagem";

import { type Acerto, itensDivergentes, MOTIVOS_ACERTO } from "./acerto";
import { AcertoDetalhe } from "./acerto-detalhe";
import { AcertoForm } from "./acerto-form";
import { useAcertos } from "@/features/estoque/api";

const FILTRO_MOTIVO = [{ valor: "todos", texto: "Todos" }, ...MOTIVOS_ACERTO.map((texto) => ({ valor: texto, texto }))];
const data = (valor: string) => new Date(valor).toLocaleDateString("pt-BR");

/** Listagem de acertos de estoque. Registrar abre um painel lateral; acertos salvos não se alteram. */
export function AcertosLista() {
  const acertos = useAcertos();
  const podeEditar = usePode("estoque.editar");

  const [busca, setBusca] = useState("");
  const [filtroMotivo, setFiltroMotivo] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [formAberto, setFormAberto] = useState(false);
  const [abertura, setAbertura] = useState(0);
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [visualizandoId, setVisualizandoId] = useState<string | null>(null);

  const visualizando = acertos.find((item) => item.id === visualizandoId) ?? null;

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return acertos
      .filter((a) => filtroMotivo === "todos" || a.motivo === filtroMotivo)
      .filter((a) => termo === "" || normalizar(`${a.numero} ${a.motivo} ${a.observacoes} ${a.itens.map((i) => i.descricao).join(" ")}`).includes(termo))
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [acertos, busca, filtroMotivo]);

  const { visiveis, paginaAtual, totalPaginas } = paginar(filtrados, pagina);

  function abrirDetalhe(acerto: Acerto) {
    setVisualizandoId(acerto.id);
    setDetalheAberto(true);
  }

  function filtrar(definir: (valor: string) => void) {
    return (valor: string) => {
      definir(valor);
      setPagina(1);
    };
  }

  const vazio = (
    <ListagemVazia>
      {acertos.length === 0 ? "Nenhum acerto de estoque registrado ainda." : "Nenhum acerto encontrado com esses filtros."}
    </ListagemVazia>
  );
  const botao = (acerto: Acerto) => (
    <Button variant="ghost" size="icon" className="text-muted-foreground -my-1 shrink-0" aria-label={`Visualizar ${acerto.numero}`} onClick={() => abrirDetalhe(acerto)}>
      <Eye className="size-4" />
    </Button>
  );

  return (
    <Listagem>
      <ListagemCabecalho
        titulo="Acerto de estoque"
        descricao="Correção do saldo a partir da contagem física das peças."
        rotuloNovo="Novo acerto"
        aoNovo={
          podeEditar
            ? () => {
                setAbertura((numero) => numero + 1);
                setFormAberto(true);
              }
            : undefined
        }
      />

      <ListagemFiltros>
        <ListagemBusca valor={busca} aoMudar={filtrar(setBusca)} placeholder="Número, motivo ou produto" rotulo="Buscar acertos" />
        <ListagemGrupoFiltros>
          <ListagemFiltro rotulo="Motivo" valor={filtroMotivo} opcoes={FILTRO_MOTIVO} aoMudar={filtrar(setFiltroMotivo)} />
        </ListagemGrupoFiltros>
      </ListagemFiltros>

      <ListagemCartoes>
        {visiveis.map((acerto) => (
          <ListagemCartao key={acerto.id}>
            <div className="flex items-start justify-between gap-2">
              <button type="button" className="-my-1 flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left" onClick={() => abrirDetalhe(acerto)}>
                <span className="block truncate font-medium">{acerto.numero}</span>
                <span className="text-muted-foreground block truncate text-sm">{data(acerto.criadoEm)} · {acerto.motivo}</span>
              </button>
              {botao(acerto)}
            </div>
            <p className="text-muted-foreground text-sm">
              {acerto.itens.length} {acerto.itens.length === 1 ? "produto" : "produtos"} · {itensDivergentes(acerto).length} com diferença
            </p>
          </ListagemCartao>
        ))}
        {visiveis.length === 0 && <li className="col-span-full">{vazio}</li>}
      </ListagemCartoes>

      <ListagemTabela>
        <Table className={CLASSE_TABELA}>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3 font-normal">Número</TableHead>
              <TableHead className="py-3 font-normal">Data</TableHead>
              <TableHead className="py-3 font-normal">Motivo</TableHead>
              <TableHead className="py-3 text-right font-normal">Produtos</TableHead>
              <TableHead className="py-3 text-right font-normal">Com diferença</TableHead>
              <TableHead className="py-3 text-right font-normal">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((acerto) => (
              <TableRow key={acerto.id}>
                <TableCell className="py-3">
                  <button type="button" className="font-medium hover:underline" onClick={() => abrirDetalhe(acerto)}>
                    {acerto.numero}
                  </button>
                </TableCell>
                <TableCell className="py-3 whitespace-nowrap">{data(acerto.criadoEm)}</TableCell>
                <TableCell className="py-3">{acerto.motivo}</TableCell>
                <TableCell className="py-3 text-right tabular-nums">{acerto.itens.length}</TableCell>
                <TableCell className="py-3 text-right tabular-nums">{itensDivergentes(acerto).length}</TableCell>
                <TableCell className="py-3 text-right">{botao(acerto)}</TableCell>
              </TableRow>
            ))}
            {visiveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>{vazio}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ListagemTabela>

      <ListagemRodape total={filtrados.length} singular="acerto" plural="acertos" pagina={paginaAtual} totalPaginas={totalPaginas} aoMudarPagina={setPagina} />

      <AcertoForm key={abertura} aberto={formAberto} aoFechar={() => setFormAberto(false)} />
      <AcertoDetalhe aberto={detalheAberto} acerto={visualizando} aoFechar={() => setDetalheAberto(false)} />
    </Listagem>
  );
}
