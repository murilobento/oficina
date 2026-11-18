import { createFileRoute } from '@tanstack/react-router'

import { AReceberLista } from '@/features/vendas/a-receber-lista'

export const Route = createFileRoute('/_app/receber/')({ component: AReceberLista })
