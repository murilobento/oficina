/**
 * Catálogo de permissões da oficina (PRD seção 2).
 *
 * As chaves aqui precisam ser as mesmas do tipo enumerado `permissao` no banco. Cada módulo
 * novo acrescenta as suas. O Administrador escolhe, na tela de perfis, quais cada perfil recebe.
 */
export const PERMISSOES = {
  'clientes.ver': 'Ver clientes',
  'clientes.editar': 'Cadastrar e editar clientes',
  'veiculos.ver': 'Ver veículos',
  'veiculos.editar': 'Cadastrar e editar veículos',
  'orcamentos.ver': 'Ver orçamentos',
  'orcamentos.editar': 'Criar e editar orçamentos',
  'ordens.ver': 'Ver ordens de serviço',
  'ordens.editar': 'Abrir e atualizar ordens de serviço',
  'agenda.ver': 'Ver agenda',
  'agenda.editar': 'Marcar e remarcar atendimentos',
  'vendas.ver': 'Ver vendas',
  'vendas.editar': 'Lançar e cancelar vendas',
  'compras.ver': 'Ver compras',
  'compras.editar': 'Lançar e cancelar compras',
  'estoque.ver': 'Ver peças e saldos',
  'estoque.editar': 'Dar entrada e baixa de peças',
  'servicos.ver': 'Ver serviços',
  'servicos.editar': 'Cadastrar e editar serviços',
  'valores.ver': 'Ver preços e valores',
  'empresa.gerenciar': 'Gerenciar os dados da empresa e a logo',
  'funcionarios.gerenciar': 'Gerenciar funcionários',
  'perfis.gerenciar': 'Gerenciar perfis e permissões',
  'auditoria.ver': 'Consultar a auditoria',
} as const

export type Permissao = keyof typeof PERMISSOES
