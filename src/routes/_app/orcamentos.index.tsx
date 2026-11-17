import { createFileRoute } from '@tanstack/react-router'

import { OrcamentosLista } from '@/features/orcamentos/orcamentos-lista'

export const Route = createFileRoute('/_app/orcamentos/')({ component: OrcamentosLista })
