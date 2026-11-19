import { createFileRoute } from '@tanstack/react-router'

import { OrdensLista } from '@/features/ordens/ordens-lista'

export const Route = createFileRoute('/_app/ordens')({ component: OrdensLista })
