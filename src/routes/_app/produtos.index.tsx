import { createFileRoute } from '@tanstack/react-router'

import { ProdutosLista } from '@/features/produtos/produtos-lista'

export const Route = createFileRoute('/_app/produtos/')({ component: ProdutosLista })
