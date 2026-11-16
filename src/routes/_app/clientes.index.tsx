import { createFileRoute } from '@tanstack/react-router'

import { CLIENTES } from '@/features/pessoas/entidades'
import { PessoasLista } from '@/features/pessoas/pessoas-lista'

export const Route = createFileRoute('/_app/clientes/')({ component: () => <PessoasLista config={CLIENTES} /> })
