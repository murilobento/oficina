import type { Permissao } from "@/features/auth/permissoes";
import { PERMISSOES } from "@/features/auth/permissoes";

// Perfis de acesso. Protótipo em memória: na etapa de login vira a tabela `perfis`
// com as permissões em `perfil_permissoes`, no Supabase. As permissões iniciais abaixo são
// sugestões para revisar: o Administrador ajusta cada perfil na própria tela.

export type PerfilAcesso = {
  id: string;
  nome: string;
  descricao: string;
  /** Perfil protegido (Administrador) sempre tem todas as permissões e não pode ser alterado. */
  protegido: boolean;
  permissoes: Permissao[];
};

/** Módulos da tela de perfis. O prefixo de cada permissão (antes do ponto) indica o módulo. */
export const MODULOS: { id: string; nome: string }[] = [
  { id: "clientes", nome: "Clientes" },
  { id: "veiculos", nome: "Veículos" },
  { id: "orcamentos", nome: "Orçamentos" },
  { id: "ordens", nome: "Ordens de serviço" },
  { id: "agenda", nome: "Agenda" },
  { id: "estoque", nome: "Peças e estoque" },
  { id: "valores", nome: "Valores" },
  { id: "funcionarios", nome: "Funcionários" },
  { id: "perfis", nome: "Perfis" },
  { id: "auditoria", nome: "Auditoria" },
];

export function moduloDaPermissao(permissao: Permissao): string {
  return permissao.split(".")[0];
}

const TODAS = Object.keys(PERMISSOES) as Permissao[];

export const perfisIniciais: PerfilAcesso[] = [
  {
    id: "administrador",
    nome: "Administrador",
    descricao: "Acesso total. Não pode ser alterado nem removido.",
    protegido: true,
    permissoes: TODAS,
  },
  {
    id: "gerencia",
    nome: "Gerência",
    descricao: "Acompanha tudo e gerencia a equipe.",
    protegido: false,
    permissoes: TODAS.filter((permissao) => permissao !== "perfis.gerenciar"),
  },
  {
    id: "recepcao",
    nome: "Recepção",
    descricao: "Atende o cliente, marca horários e abre orçamentos e OS.",
    protegido: false,
    permissoes: [
      "clientes.ver",
      "clientes.editar",
      "veiculos.ver",
      "veiculos.editar",
      "orcamentos.ver",
      "orcamentos.editar",
      "ordens.ver",
      "ordens.editar",
      "agenda.ver",
      "agenda.editar",
      "estoque.ver",
      "valores.ver",
    ],
  },
  {
    id: "mecanico",
    nome: "Mecânico",
    descricao: "Executa as OS e dá baixa nas peças usadas.",
    protegido: false,
    permissoes: [
      "clientes.ver",
      "veiculos.ver",
      "orcamentos.ver",
      "ordens.ver",
      "ordens.editar",
      "agenda.ver",
      "estoque.ver",
      "estoque.editar",
    ],
  },
];
