import { createFileRoute } from '@tanstack/react-router'

import { FORNECEDORES } from '@/features/pessoas/entidades'
import { PessoasLista } from '@/features/pessoas/pessoas-lista'

export const Route = createFileRoute('/_app/fornecedores/')({ component: () => <PessoasLista config={FORNECEDORES} /> })
