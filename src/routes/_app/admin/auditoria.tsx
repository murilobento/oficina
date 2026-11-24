import { createFileRoute } from '@tanstack/react-router'

import { AuditoriaLista } from '@/features/auditoria/auditoria-lista'

export const Route = createFileRoute('/_app/admin/auditoria')({ component: AuditoriaLista })
