import { createFileRoute } from '@tanstack/react-router'

import { AcertosLista } from '@/features/estoque/acertos-lista'

export const Route = createFileRoute('/_app/estoque/acertos/')({ component: AcertosLista })
