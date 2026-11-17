import {
  Home,
  type LucideIcon,
  Package,
  Settings,
  Users,
  Wrench,
} from "lucide-react";

import type { Permissao } from "@/features/auth/permissoes";

/** Um link do menu. Sem `url` = tela ainda não construída (aparece como "em breve"). */
export interface NavItem {
  id: string;
  title: string;
  url?: string;
  /** Permissão exigida para o item aparecer (passa a valer com o login por funcionário). */
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
          { id: "orcamentos", title: "Orçamento", url: "/orcamentos" },
          { id: "vendas", title: "Venda" },
          { id: "compras", title: "Compra" },
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
          { id: "clientes", title: "Cliente", url: "/clientes" },
          { id: "veiculos", title: "Veículo", url: "/veiculos" },
          { id: "fornecedores", title: "Fornecedor", url: "/fornecedores" },
          { id: "produtos", title: "Produto", url: "/produtos" },
          { id: "servicos", title: "Serviço", url: "/servicos" },
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
          { id: "movimentacoes", title: "Movimentação de estoque" },
          { id: "acertos", title: "Acerto de estoque" },
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

/** Módulo que contém a tela do endereço atual (para abrir o painel certo ao carregar). */
export function findModuleByPath(pathname: string): NavModule | undefined {
  return navModules.find((module) =>
    module.groups?.some((group) => group.items.some((item) => item.url && isSamePath(item.url, pathname))),
  );
}

export function isSamePath(url: string, pathname: string): boolean {
  return pathname === url || pathname.startsWith(`${url}/`);
}
