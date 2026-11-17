import { createFileRoute } from '@tanstack/react-router'

import { VendasLista } from '@/features/vendas/vendas-lista'

export const Route = createFileRoute('/_app/vendas/')({ component: VendasLista })
