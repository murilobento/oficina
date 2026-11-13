import { createFileRoute } from '@tanstack/react-router'

import { Usuarios } from '@/features/usuarios/usuarios'

export const Route = createFileRoute('/_app/admin/usuarios')({ component: Usuarios })
