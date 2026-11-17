import { useMemo, useState } from "react";

import { toast } from "sonner";

import { useAlternarAtivoPessoa, useExcluirPessoa, usePessoasConsulta } from "./api";

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

import { mascararDocumento, mascararTelefone } from "./documento";
import { capitalizar, type EntidadeConfig } from "./entidades";
import { PessoaDetalhe } from "./pessoa-detalhe";
import { PessoaForm } from "./pessoa-form";
import { AcoesPessoa, ConfirmarExclusao, StatusBadge } from "./pessoa-partes";
import type { Pessoa } from "./tipos";

const FILTRO_TIPO = [
  { valor: "todos", texto: "Todos" },
  { valor: "PF", texto: "Pessoa física" },
  { valor: "PJ", texto: "Pessoa jurídica" },
];
const FILTRO_STATUS = [
  { valor: "todos", texto: "Todos" },
  { valor: "ativos", texto: "Ativos" },
  { valor: "inativos", texto: "Inativos" },
];

function contato(pessoa: Pessoa): string {
  return mascararTelefone(pessoa.celular || pessoa.telefone);
}

function local(pessoa: Pessoa): string {
  return [pessoa.cidade, pessoa.uf].filter(Boolean).join("/");
}

/**
 * Listagem de clientes ou de fornecedores (a mesma tela, conforme `config`). Criar, editar
 * e visualizar abrem em painel lateral, sem sair da lista.
 */
export function PessoasLista({ config }: { config: EntidadeConfig }) {
  const consulta = usePessoasConsulta(config.papel);
  const pessoas = useMemo(() => consulta.data ?? [], [consulta.data]);
  const alternar = useAlternarAtivoPessoa(config.papel);
  const excluir = useExcluirPessoa(config.papel);

  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [pagina, setPagina] = useState(1);

  // Painéis: o formulário guarda quem está em edição (null = cadastro novo) e um número de
  // abertura, usado como `key` para o formulário começar limpo a cada vez que abre.
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Pessoa | null>(null);
  const [abertura, setAbertura] = useState(0);
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [visualizandoId, setVisualizandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Pessoa | null>(null);

  function pedirExclusao(pessoa: Pessoa) {
    setExcluindo(pessoa);
  }

  const visualizando = pessoas.find((pessoa) => pessoa.id === visualizandoId) ?? null;

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    // Busca por documento: compara sem máscara, então "111.444" encontra "111444...".
    const termoDocumento = termo.replace(/[^a-z0-9]/g, "");

    return pessoas
      .filter((pessoa) => filtroTipo === "todos" || pessoa.tipo === filtroTipo)
      .filter((pessoa) => filtroStatus === "todos" || pessoa.ativo === (filtroStatus === "ativos"))
      .filter((pessoa) => {
        if (termo === "") return true;
        const noTexto = normalizar(`${pessoa.nome} ${pessoa.nomeFantasia} ${pessoa.email}`).includes(termo);
        const noDocumento = termoDocumento !== "" && pessoa.documento.toLowerCase().includes(termoDocumento);
        return noTexto || noDocumento;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [pessoas, busca, filtroTipo, filtroStatus]);

  const { visiveis, paginaAtual, totalPaginas } = paginar(filtradas, pagina);

  function abrirForm(pessoa: Pessoa | null) {
    setDetalheAberto(false);
    setEmEdicao(pessoa);
    setAbertura((numero) => numero + 1);
    setFormAberto(true);
  }

  function abrirDetalhe(pessoa: Pessoa) {
    setVisualizandoId(pessoa.id);
    setDetalheAberto(true);
  }

  async function aoAlternarAtivo(pessoa: Pessoa) {
    try {
      await alternar.mutateAsync({ id: pessoa.id, ativo: !pessoa.ativo });
      toast.success(pessoa.ativo ? `${pessoa.nome} foi inativado.` : `${pessoa.nome} foi ativado.`);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível alterar. Tente de novo.");
    }
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
    toast.success(`${capitalizar(config.singular)} excluído.`);
    if (excluindo.id === visualizandoId) setDetalheAberto(false);
    setExcluindo(null);
  }

  const acoes = { aoVisualizar: abrirDetalhe, aoEditar: abrirForm, aoAlternarAtivo, aoExcluir: pedirExclusao };
  const vazio = (
    <ListagemVazia>
      {consulta.isPending
        ? "Carregando…"
        : consulta.isError
          ? consulta.error.message
          : pessoas.length === 0
        ? `Nenhum ${config.singular} cadastrado ainda.`
        : `Nenhum ${config.singular} encontrado com esses filtros.`}
    </ListagemVazia>
  );

  return (
    <Listagem>
      <ListagemCabecalho
        titulo={config.titulo}
        descricao={config.descricao}
        rotuloNovo={`Novo ${config.singular}`}
        aoNovo={() => abrirForm(null)}
      />

      <ListagemFiltros>
        <ListagemBusca
          valor={busca}
          aoMudar={(valor) => {
            setBusca(valor);
            setPagina(1);
          }}
          placeholder="Nome, CPF, CNPJ ou e-mail"
          rotulo={`Buscar ${config.plural}`}
        />
        <ListagemGrupoFiltros>
          <ListagemFiltro
            rotulo="Tipo"
            valor={filtroTipo}
            opcoes={FILTRO_TIPO}
            aoMudar={(valor) => {
              setFiltroTipo(valor);
              setPagina(1);
            }}
          />
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
        {visiveis.map((pessoa) => (
          <ListagemCartao key={pessoa.id}>
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                className="-my-1 flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left"
                onClick={() => abrirDetalhe(pessoa)}
              >
                <span className="block truncate font-medium">{pessoa.nome}</span>
                {pessoa.nomeFantasia && (
                  <span className="text-muted-foreground block truncate text-sm">{pessoa.nomeFantasia}</span>
                )}
              </button>
              <AcoesPessoa pessoa={pessoa} {...acoes} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                {pessoa.tipo}
              </Badge>
              <StatusBadge ativo={pessoa.ativo} />
              {pessoa.documento && (
                <span className="text-muted-foreground text-sm tabular-nums">
                  {mascararDocumento(pessoa.tipo, pessoa.documento)}
                </span>
              )}
            </div>
            {(contato(pessoa) || local(pessoa)) && (
              <p className="text-muted-foreground text-sm">
                {[contato(pessoa), local(pessoa)].filter(Boolean).join(" · ")}
              </p>
            )}
          </ListagemCartao>
        ))}
        {visiveis.length === 0 && <li className="col-span-full">{vazio}</li>}
      </ListagemCartoes>

      <ListagemTabela>
        <Table className={CLASSE_TABELA}>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3 font-normal">Nome</TableHead>
              <TableHead className="py-3 font-normal">Tipo</TableHead>
              <TableHead className="py-3 font-normal">CPF / CNPJ</TableHead>
              <TableHead className="py-3 font-normal">Contato</TableHead>
              <TableHead className="hidden py-3 font-normal @6xl:table-cell">Cidade</TableHead>
              <TableHead className="py-3 font-normal">Status</TableHead>
              <TableHead className="py-3 text-right font-normal">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((pessoa) => (
              <TableRow key={pessoa.id}>
                <TableCell className="max-w-60 py-3">
                  <button
                    type="button"
                    className="block w-full text-left hover:underline"
                    onClick={() => abrirDetalhe(pessoa)}
                  >
                    <span className="block truncate font-medium">{pessoa.nome}</span>
                    {pessoa.nomeFantasia && (
                      <span className="text-muted-foreground block truncate text-sm">{pessoa.nomeFantasia}</span>
                    )}
                  </button>
                </TableCell>
                <TableCell className="py-3">{pessoa.tipo}</TableCell>
                <TableCell className="py-3 whitespace-nowrap tabular-nums">
                  {pessoa.documento ? mascararDocumento(pessoa.tipo, pessoa.documento) : ""}
                </TableCell>
                <TableCell className="py-3">
                  <span className="block whitespace-nowrap tabular-nums">{contato(pessoa)}</span>
                  {pessoa.email && (
                    <span className="text-muted-foreground block max-w-52 truncate text-sm" title={pessoa.email}>
                      {pessoa.email}
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden py-3 whitespace-nowrap @6xl:table-cell">{local(pessoa)}</TableCell>
                <TableCell className="py-3">
                  <StatusBadge ativo={pessoa.ativo} />
                </TableCell>
                <TableCell className="py-3 text-right">
                  <AcoesPessoa pessoa={pessoa} {...acoes} />
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
        total={filtradas.length}
        singular={config.singular}
        plural={config.plural}
        pagina={paginaAtual}
        totalPaginas={totalPaginas}
        aoMudarPagina={setPagina}
      />

      <PessoaForm
        key={abertura}
        config={config}
        aberto={formAberto}
        pessoa={emEdicao}
        aoFechar={() => setFormAberto(false)}
      />
      <PessoaDetalhe
        config={config}
        aberto={detalheAberto}
        pessoa={visualizando}
        aoFechar={() => setDetalheAberto(false)}
        aoEditar={abrirForm}
        aoAlternarAtivo={aoAlternarAtivo}
        aoExcluir={pedirExclusao}
      />
      <ConfirmarExclusao
        config={config}
        pessoa={excluindo}
        aoCancelar={() => setExcluindo(null)}
        aoConfirmar={confirmarExclusao}
      />
    </Listagem>
  );
}
