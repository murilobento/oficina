import {
  Car,
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

/** Um grupo que abre e fecha dentro do painel (ex.: "Ordens"). */
export interface NavGroup {
  id: string;
  title: string;
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
export const navModules: NavModule[] = [
  { id: "inicio", title: "Início", icon: Home, url: "/" },
  { id: "clientes", title: "Clientes", icon: Users, url: "/clientes" },
  { id: "veiculos", title: "Veículos", icon: Car, url: "/veiculos" },
  {
    id: "atendimento",
    title: "Atendimento",
    icon: Wrench,
    groups: [
      {
        id: "ordens",
        title: "Ordens",
        items: [
          { id: "orcamentos", title: "Orçamentos", url: "/orcamentos" },
          { id: "ordens", title: "Ordens de serviço", url: "/ordens" },
        ],
      },
      {
        id: "agenda",
        title: "Agenda",
        items: [{ id: "agenda", title: "Agenda de atendimentos", url: "/agenda" }],
      },
    ],
  },
  {
    id: "estoque",
    title: "Estoque",
    icon: Package,
    groups: [
      {
        id: "pecas",
        title: "Peças",
        items: [
          { id: "pecas", title: "Peças e produtos", url: "/estoque" },
          { id: "movimentacoes", title: "Movimentações" },
        ],
      },
      {
        id: "fornecedores",
        title: "Cadastros",
        items: [{ id: "fornecedores", title: "Fornecedores" }],
      },
    ],
  },
  {
    id: "administracao",
    title: "Administração",
    icon: Settings,
    groups: [
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
