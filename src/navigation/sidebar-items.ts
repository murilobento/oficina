import {
  Car,
  FileText,
  Home,
  type LucideIcon,
  Package,
  Settings,
  Receipt,
  Users,
  Wrench,
} from "lucide-react";

import type { Permissao } from "@/features/auth/permissoes";

/** Um link do menu. Sem `url` = tela ainda não construída (aparece como "em breve"). */
export interface NavItem {
  id: string;
  title: string;
  url?: string;
  /** Permissão exigida: sem ela o item some do menu e a tela mostra "sem permissão". */
  permissao?: Permissao;
}

/** Um grupo dentro do painel. Com `title` ele abre e fecha; sem `title` os itens aparecem direto. */
export interface NavGroup {
  id: string;
  title?: string;
  items: NavItem[];
}

/**
 * Um módulo: é o ícone da faixa da esquerda.
 * Com `url` o ícone leva direto a uma tela; com `groups` ele abre o painel de itens.
 */
export interface NavModule {
  id: string;
  title: string;
  icon: LucideIcon;
  url?: string;
  groups?: NavGroup[];
}

// Menu do sistema. A ordem aqui é a ordem dos ícones na faixa da esquerda.
// Itens sem `url` são telas ainda não construídas.
export const navModules: NavModule[] = [
  { id: "inicio", title: "Início", icon: Home, url: "/" },
  {
    id: "atendimento",
    title: "Atendimento",
    icon: Wrench,
    groups: [
      {
        id: "atendimento",
        items: [
          { id: "orcamentos", title: "Orçamento", url: "/orcamentos", permissao: "orcamentos.ver" },
          { id: "vendas", title: "Venda", url: "/vendas", permissao: "vendas.ver" },
          { id: "receber", title: "A receber", url: "/receber", permissao: "valores.ver" },
          { id: "compras", title: "Compra", url: "/compras", permissao: "compras.ver" },
        ],
      },
    ],
  },
  {
    id: "cadastro",
    title: "Cadastro",
    icon: Users,
    groups: [
      {
        id: "cadastro",
        items: [
          { id: "clientes", title: "Cliente", url: "/clientes", permissao: "clientes.ver" },
          { id: "veiculos", title: "Veículo", url: "/veiculos", permissao: "veiculos.ver" },
          { id: "fornecedores", title: "Fornecedor", url: "/fornecedores", permissao: "clientes.ver" },
          { id: "produtos", title: "Produto", url: "/produtos", permissao: "estoque.ver" },
          { id: "servicos", title: "Serviço", url: "/servicos", permissao: "servicos.ver" },
        ],
      },
    ],
  },
  {
    id: "estoque",
    title: "Estoque",
    icon: Package,
    groups: [
      {
        id: "estoque",
        items: [
          { id: "movimentacoes", title: "Movimentação de estoque", url: "/estoque/movimentacoes", permissao: "estoque.ver" },
          { id: "acertos", title: "Acerto de estoque", url: "/estoque/acertos", permissao: "estoque.editar" },
        ],
      },
    ],
  },
  {
    id: "administracao",
    title: "Administração",
    icon: Settings,
    groups: [
      {
        id: "empresa",
        title: "Empresa",
        items: [{ id: "dados-empresa", title: "Dados da empresa", url: "/admin/empresa", permissao: "empresa.gerenciar" }],
      },
      {
        id: "acesso",
        title: "Acesso",
        items: [
          { id: "usuarios", title: "Funcionários", url: "/admin/usuarios", permissao: "funcionarios.gerenciar" },
          { id: "perfis", title: "Perfis", url: "/admin/perfis", permissao: "perfis.gerenciar" },
        ],
      },
      {
        id: "seguranca",
        title: "Segurança",
        items: [{ id: "auditoria", title: "Auditoria", url: "/admin/auditoria", permissao: "auditoria.ver" }],
      },
    ],
  },
];

/** Telas que ainda não estão no menu mas já têm permissão definida. */
const PERMISSAO_EXTRA: Record<string, Permissao> = { "/agenda": "agenda.ver", "/ordens": "ordens.ver" };

/**
 * Menu que a pessoa pode ver: tira os itens sem permissão e, em cascata, os grupos e módulos que ficaram vazios.
 * `permissoes` nulo = login desativado (desenvolvimento): mostra tudo.
 */
export function filtrarModulos(modulos: NavModule[], permissoes: readonly Permissao[] | null): NavModule[] {
  if (permissoes === null) return modulos;
  const pode = (item: NavItem) => !item.permissao || permissoes.includes(item.permissao);
  return modulos.flatMap((modulo) => {
    if (!modulo.groups) return [modulo];
    const groups = modulo.groups.map((group) => ({ ...group, items: group.items.filter(pode) })).filter((group) => group.items.length > 0);
    return groups.length > 0 ? [{ ...modulo, groups }] : [];
  });
}

/** Permissão que a tela do endereço exige (nenhuma = livre para quem está logado). */
export function permissaoDaRota(pathname: string): Permissao | undefined {
  const itens = navModules.flatMap((modulo) => modulo.groups?.flatMap((group) => group.items) ?? []);
  const item = itens.find((candidato) => candidato.url && isSamePath(candidato.url, pathname));
  if (item) return item.permissao;
  const extra = Object.keys(PERMISSAO_EXTRA).find((url) => isSamePath(url, pathname));
  return extra ? PERMISSAO_EXTRA[extra] : undefined;
}

/** Módulo que contém a tela do endereço atual (para abrir o painel certo ao carregar). */
export function findModuleByPath(pathname: string, modulos: NavModule[] = navModules): NavModule | undefined {
  return modulos.find((module) =>
    module.groups?.some((group) => group.items.some((item) => item.url && isSamePath(item.url, pathname))),
  );
}

export function isSamePath(url: string, pathname: string): boolean {
  return pathname === url || pathname.startsWith(`${url}/`);
}

/** Atalhos da barra inferior do celular, na ordem de prioridade. O Início sempre entra; os demais pedem permissão. */
const ATALHOS_CANDIDATOS: { id: string; titulo: string; url: string; icone: LucideIcon; permissao?: Permissao }[] = [
  { id: "inicio", titulo: "Início", url: "/", icone: Home },
  { id: "orcamentos", titulo: "Orçam.", url: "/orcamentos", icone: FileText, permissao: "orcamentos.ver" },
  { id: "vendas", titulo: "Vendas", url: "/vendas", icone: Receipt, permissao: "vendas.ver" },
  { id: "estoque", titulo: "Estoque", url: "/estoque/movimentacoes", icone: Package, permissao: "estoque.ver" },
  { id: "clientes", titulo: "Clientes", url: "/clientes", icone: Users, permissao: "clientes.ver" },
];

export type AtalhoInferior = (typeof ATALHOS_CANDIDATOS)[number];

export function atalhosInferiores(permissoes: readonly Permissao[] | null): AtalhoInferior[] {
  return ATALHOS_CANDIDATOS.filter((a) => !a.permissao || permissoes === null || permissoes.includes(a.permissao)).slice(0, 3);
}

/** Ações do botão ＋ Novo. `chave` liga a ação à lista que abre o formulário (ver src/lib/acao-novo.ts). */
const ACOES_NOVO: { id: string; titulo: string; url: string; icone: LucideIcon; permissoes: Permissao[] }[] = [
  { id: "orcamento", titulo: "Novo orçamento", url: "/orcamentos", icone: FileText, permissoes: ["orcamentos.ver", "orcamentos.editar"] },
  { id: "venda", titulo: "Nova venda", url: "/vendas", icone: Receipt, permissoes: ["vendas.ver", "vendas.editar"] },
  { id: "compra", titulo: "Nova compra", url: "/compras", icone: Package, permissoes: ["compras.ver", "compras.editar", "valores.ver"] },
  { id: "cliente", titulo: "Novo cliente", url: "/clientes", icone: Users, permissoes: ["clientes.ver", "clientes.editar"] },
  { id: "veiculo", titulo: "Novo veículo", url: "/veiculos", icone: Car, permissoes: ["veiculos.ver", "veiculos.editar"] },
];

export type AcaoNovo = (typeof ACOES_NOVO)[number];

export function acoesNovoPermitidas(permissoes: readonly Permissao[] | null): AcaoNovo[] {
  return ACOES_NOVO.filter((a) => permissoes === null || a.permissoes.every((p) => permissoes.includes(p)));
}
