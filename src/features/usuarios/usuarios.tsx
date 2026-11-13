import { useMemo, useState } from "react";

import {
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dataTableFeatures } from "@/lib/data-table-features";

import { gerarSenhaProvisoria, perfis, type Usuario, type UsuarioStatus, usuariosIniciais } from "./data";
import { ConfirmacaoDialog, SenhaProvisoriaDialog } from "./usuario-dialogs";
import { UsuarioForm, type UsuarioFormValores } from "./usuario-form";
import { criarColunasUsuarios } from "./usuarios-columns";
import { UsuariosTable } from "./usuarios-table";

const TODOS = "Todos";
const FILTRO_PERFIL = [TODOS, ...perfis.map((perfil) => perfil.nome)];
const FILTRO_STATUS: string[] = [TODOS, "Ativo", "Senha provisória", "Desativado"] satisfies (UsuarioStatus | "Todos")[];

type Confirmacao = { tipo: "redefinir" | "desativar" | "reativar"; usuario: Usuario };
type SenhaExibida = { usuario: Usuario; senha: string; motivo: "cadastro" | "redefinicao" };

/**
 * Tela de usuários (protótipo): listagem com busca, filtros e paginação, formulário de
 * cadastro/edição e os fluxos de senha provisória e desativação. Os dados são de exemplo
 * e ficam só na memória; a ligação com o Supabase entra na etapa 1.2 do PRD.
 */
export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosIniciais);

  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Usuario | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [senhaExibida, setSenhaExibida] = useState<SenhaExibida | null>(null);

  const [sorting, setSorting] = useState<SortingState>([{ id: "nome", desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({ busca: false });
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const colunas = useMemo(
    () =>
      criarColunasUsuarios({
        aoEditar: (usuario) => {
          setEmEdicao(usuario);
          setFormAberto(true);
        },
        aoRedefinirSenha: (usuario) => setConfirmacao({ tipo: "redefinir", usuario }),
        aoAlternarAtivo: (usuario) => setConfirmacao({ tipo: usuario.ativo ? "desativar" : "reativar", usuario }),
      }),
    [],
  );

  const table = useTable({
    features: dataTableFeatures,
    data: usuarios,
    columns: colunas,
    state: { sorting, columnFilters, columnVisibility, pagination },
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  const busca = (table.getColumn("busca")?.getFilterValue() as string | undefined) ?? "";
  const filtroPerfil = (table.getColumn("perfil")?.getFilterValue() as string | undefined) ?? TODOS;
  const filtroStatus = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? TODOS;
  const totalFiltrado = table.getFilteredRowModel().rows.length;

  function filtrar(colunaId: string, valor: string) {
    table.getColumn(colunaId)?.setFilterValue(valor === TODOS ? undefined : valor);
    table.setPageIndex(0);
  }

  function salvar(valores: UsuarioFormValores) {
    if (emEdicao) {
      setUsuarios((lista) => lista.map((item) => (item.id === emEdicao.id ? { ...item, ...valores } : item)));
      toast.success(`Dados de ${valores.nome} atualizados.`);
    } else {
      const novo: Usuario = {
        id: crypto.randomUUID(),
        ...valores,
        ativo: true,
        trocarSenha: true,
        criadoEm: new Date().toISOString(),
        ultimoAcesso: null,
      };
      setUsuarios((lista) => [...lista, novo]);
      setSenhaExibida({ usuario: novo, senha: gerarSenhaProvisoria(), motivo: "cadastro" });
    }
    setFormAberto(false);
  }

  function confirmar() {
    if (!confirmacao) return;
    const { tipo, usuario } = confirmacao;
    if (tipo === "redefinir") {
      setUsuarios((lista) => lista.map((item) => (item.id === usuario.id ? { ...item, trocarSenha: true } : item)));
      setSenhaExibida({ usuario, senha: gerarSenhaProvisoria(), motivo: "redefinicao" });
    } else {
      const ativo = tipo === "reativar";
      setUsuarios((lista) => lista.map((item) => (item.id === usuario.id ? { ...item, ativo } : item)));
      toast.success(ativo ? `${usuario.nome} foi reativado.` : `${usuario.nome} foi desativado.`);
    }
    setConfirmacao(null);
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">Funcionários</CardTitle>
          <CardDescription className="max-w-sm leading-snug">
            Quem acessa o sistema e com qual perfil.
          </CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder="Buscar por nome ou e-mail"
                aria-label="Buscar usuários"
                value={busca}
                onChange={(event) => {
                  table.getColumn("busca")?.setFilterValue(event.target.value || undefined);
                  table.setPageIndex(0);
                }}
              />
            </InputGroup>
            <Button
              size="sm"
              onClick={() => {
                setEmEdicao(null);
                setFormAberto(true);
              }}
            >
              <Plus /> Novo usuário
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={filtroPerfil} onValueChange={(valor) => filtrar("perfil", valor)}>
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">Perfil:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    {FILTRO_PERFIL.map((opcao) => (
                      <SelectItem key={opcao} value={opcao}>
                        {opcao}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={filtroStatus} onValueChange={(valor) => filtrar("status", valor)}>
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">Situação:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    {FILTRO_STATUS.map((opcao) => (
                      <SelectItem key={opcao} value={opcao}>
                        {opcao}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="text-muted-foreground text-sm tabular-nums">
              {totalFiltrado} {totalFiltrado === 1 ? "usuário" : "usuários"}
            </div>
          </div>

          <UsuariosTable table={table} />
        </CardContent>
      </Card>

      <UsuarioForm
        aberto={formAberto}
        usuario={emEdicao}
        emailsEmUso={usuarios.filter((item) => item.id !== emEdicao?.id).map((item) => item.email.toLowerCase())}
        aoFechar={() => setFormAberto(false)}
        aoSalvar={salvar}
      />
      <ConfirmacaoDialog confirmacao={confirmacao} aoCancelar={() => setConfirmacao(null)} aoConfirmar={confirmar} />
      <SenhaProvisoriaDialog dados={senhaExibida} aoFechar={() => setSenhaExibida(null)} />
    </>
  );
}
