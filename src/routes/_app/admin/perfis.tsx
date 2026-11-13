import { createFileRoute } from '@tanstack/react-router'

import { Perfis } from '@/features/perfis/perfis'

export const Route = createFileRoute('/_app/admin/perfis')({ component: Perfis })
