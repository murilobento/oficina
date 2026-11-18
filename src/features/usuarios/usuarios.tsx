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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CLASSE_TABELA, normalizar, paginar } from "@/lib/listagem";
import { cn, getInitials } from "@/lib/utils";

import { usePerfis } from "@/features/perfis/api";
import { useEnvioUnico } from "@/lib/envio-unico";

import {
  type Usuario,
  useAlternarAtivoUsuario,
  useCriarUsuario,
  useEditarUsuario,
  useRedefinirSenhaUsuario,
  useUsuarios,
  useUsuariosConsulta,
} from "./api";
import { formatarData, formatarDataHora, statusDoUsuario } from "./data";
import { ConfirmacaoDialog, SenhaProvisoriaDialog } from "./usuario-dialogs";
import { UsuarioForm, type UsuarioFormValores } from "./usuario-form";
import { AcoesUsuario, StatusBadge } from "./usuario-partes";

const TODOS = "todos";
const FILTRO_STATUS = [
  { valor: TODOS, texto: "Todos" },
  { valor: "Ativo", texto: "Ativo" },
  { valor: "Senha provisória", texto: "Senha provisória" },
  { valor: "Desativado", texto: "Desativado" },
];

type Confirmacao = { tipo: "redefinir" | "desativar" | "reativar"; usuario: Usuario };
type SenhaExibida = { usuario: Usuario; senha: string; motivo: "cadastro" | "redefinicao" };

function Identidade({ usuario }: { usuario: Usuario }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar size="lg" className={cn("font-medium", !usuario.ativo && "opacity-50")}>
        <AvatarFallback>{getInitials(usuario.nome)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="truncate font-medium">{usuario.nome}</div>
        <div className="text-muted-foreground truncate text-sm">{usuario.email}</div>
      </div>
    </div>
  );
}

/**
 * Tela de funcionários, no padrão de listagem do sistema. Cadastro, edição, ativação e redefinição
 * de senha passam pela API, que aplica as proteções (último administrador, próprio acesso etc.).
 */
export function Usuarios() {
  const consulta = useUsuariosConsulta();
  const usuarios = useUsuarios();
  const perfis = usePerfis();
  const criar = useCriarUsuario();
  const editar = useEditarUsuario();
  const alternarAtivo = useAlternarAtivoUsuario();
  const redefinirSenha = useRedefinirSenhaUsuario();
  const { enviando, proteger } = useEnvioUnico();
  const perfilPorId = (id: string) => perfis.find((perfil) => perfil.id === id);
  const opcoesPerfil = [{ valor: TODOS, texto: "Todos" }, ...perfis.map((perfil) => ({ valor: perfil.id, texto: perfil.nome }))];

  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState(TODOS);
  const [filtroStatus, setFiltroStatus] = useState(TODOS);
  const [pagina, setPagina] = useState(1);

  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Usuario | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [senhaExibida, setSenhaExibida] = useState<SenhaExibida | null>(null);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return usuarios
      .filter((usuario) => filtroPerfil === TODOS || usuario.perfilId === filtroPerfil)
      .filter((usuario) => filtroStatus === TODOS || statusDoUsuario(usuario) === filtroStatus)
      .filter((usuario) => termo === "" || normalizar(`${usuario.nome} ${usuario.email}`).includes(termo))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [usuarios, busca, filtroPerfil, filtroStatus]);

  const { visiveis, paginaAtual, totalPaginas } = paginar(filtrados, pagina);

  function abrirForm(usuario: Usuario | null) {
    setEmEdicao(usuario);
    setFormAberto(true);
  }

  const acoes = {
    aoEditar: abrirForm,
    aoRedefinirSenha: (usuario: Usuario) => setConfirmacao({ tipo: "redefinir", usuario }),
    aoAlternarAtivo: (usuario: Usuario) =>
      setConfirmacao({ tipo: usuario.ativo ? "desativar" : "reativar", usuario }),
  };

  async function salvar(valores: UsuarioFormValores) {
    if (emEdicao) {
      await editar.mutateAsync({ id: emEdicao.id, dados: valores });
      toast.success(`Dados de ${valores.nome} atualizados.`);
    } else {
      const { funcionario, senhaProvisoria } = await criar.mutateAsync(valores);
      setSenhaExibida({ usuario: funcionario, senha: senhaProvisoria, motivo: "cadastro" });
    }
    setFormAberto(false);
  }

  const confirmar = proteger(async () => {
    if (!confirmacao) return;
    const { tipo, usuario } = confirmacao;
    try {
      if (tipo === "redefinir") {
        const { funcionario, senhaProvisoria } = await redefinirSenha.mutateAsync(usuario.id);
        setSenhaExibida({ usuario: funcionario, senha: senhaProvisoria, motivo: "redefinicao" });
      } else {
        const ativo = tipo === "reativar";
        await alternarAtivo.mutateAsync({ id: usuario.id, ativo });
        toast.success(ativo ? `${usuario.nome} foi reativado.` : `${usuario.nome} foi desativado.`);
      }
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível concluir. Tente de novo.");
    }
    setConfirmacao(null);
  });

  const vazio = (
    <ListagemVazia>
      {consulta.isPending ? "Carregando…" : consulta.isError ? consulta.error.message : "Nenhum funcionário encontrado com esses filtros."}
    </ListagemVazia>
  );

  return (
    <Listagem>
      <ListagemCabecalho
        titulo="Funcionários"
        descricao="Quem acessa o sistema e com qual perfil."
        rotuloNovo="Novo funcionário"
        aoNovo={() => abrirForm(null)}
      />

      <ListagemFiltros>
        <ListagemBusca
          valor={busca}
          aoMudar={(valor) => {
            setBusca(valor);
            setPagina(1);
          }}
          placeholder="Nome ou e-mail"
          rotulo="Buscar funcionários"
        />
        <ListagemGrupoFiltros>
          <ListagemFiltro
            rotulo="Perfil"
            valor={filtroPerfil}
            opcoes={opcoesPerfil}
            aoMudar={(valor) => {
              setFiltroPerfil(valor);
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
        {visiveis.map((usuario) => (
          <ListagemCartao key={usuario.id}>
            <div className="flex items-center justify-between gap-2">
              <Identidade usuario={usuario} />
              <AcoesUsuario usuario={usuario} {...acoes} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                {perfilPorId(usuario.perfilId)?.nome ?? "Sem perfil"}
              </Badge>
              <StatusBadge status={statusDoUsuario(usuario)} />
            </div>
            <p className="text-muted-foreground text-sm">Último acesso: {formatarDataHora(usuario.ultimoAcesso)}</p>
          </ListagemCartao>
        ))}
        {visiveis.length === 0 && <li className="col-span-full">{vazio}</li>}
      </ListagemCartoes>

      <ListagemTabela>
        <Table className={CLASSE_TABELA}>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3 font-normal">Funcionário</TableHead>
              <TableHead className="py-3 font-normal">Perfil</TableHead>
              <TableHead className="py-3 font-normal">Status</TableHead>
              <TableHead className="py-3 font-normal">Último acesso</TableHead>
              <TableHead className="hidden py-3 font-normal @6xl:table-cell">Cadastro</TableHead>
              <TableHead className="py-3 text-right font-normal">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell className="max-w-60 py-3">
                  <Identidade usuario={usuario} />
                </TableCell>
                <TableCell className="py-3 whitespace-nowrap">{perfilPorId(usuario.perfilId)?.nome ?? ""}</TableCell>
                <TableCell className="py-3">
                  <StatusBadge status={statusDoUsuario(usuario)} />
                </TableCell>
                <TableCell className="py-3 whitespace-nowrap">{formatarDataHora(usuario.ultimoAcesso)}</TableCell>
                <TableCell className="hidden py-3 whitespace-nowrap @6xl:table-cell">{formatarData(usuario.criadoEm)}</TableCell>
                <TableCell className="py-3 text-right">
                  <AcoesUsuario usuario={usuario} {...acoes} />
                </TableCell>
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

      <ListagemRodape
        total={filtrados.length}
        singular="funcionário"
        plural="funcionários"
        pagina={paginaAtual}
        totalPaginas={totalPaginas}
        aoMudarPagina={setPagina}
      />

      <UsuarioForm
        aberto={formAberto}
        usuario={emEdicao}
        aoFechar={() => setFormAberto(false)}
        aoSalvar={salvar}
      />
      <ConfirmacaoDialog confirmacao={confirmacao} enviando={enviando} aoCancelar={() => setConfirmacao(null)} aoConfirmar={confirmar} />
      <SenhaProvisoriaDialog dados={senhaExibida} aoFechar={() => setSenhaExibida(null)} />
    </Listagem>
  );
}
