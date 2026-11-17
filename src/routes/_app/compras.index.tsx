import { createFileRoute } from '@tanstack/react-router'

import { ComprasLista } from '@/features/compras/compras-lista'

export const Route = createFileRoute('/_app/compras/')({ component: ComprasLista })
