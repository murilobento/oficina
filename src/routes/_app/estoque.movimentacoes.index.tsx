import { createFileRoute } from '@tanstack/react-router'

import { MovimentacoesLista } from '@/features/estoque/movimentacoes-lista'

export const Route = createFileRoute('/_app/estoque/movimentacoes/')({ component: MovimentacoesLista })
