import { createFileRoute } from '@tanstack/react-router'

import { EmpresaForm } from '@/features/empresa/empresa-form'

export const Route = createFileRoute('/_app/admin/empresa')({ component: EmpresaForm })
