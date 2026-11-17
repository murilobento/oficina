import { createFileRoute } from '@tanstack/react-router'

import { ServicosLista } from '@/features/servicos/servicos-lista'

export const Route = createFileRoute('/_app/servicos/')({ component: ServicosLista })
