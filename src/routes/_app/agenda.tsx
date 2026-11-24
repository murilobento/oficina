import { createFileRoute } from '@tanstack/react-router'

import { Agenda } from '@/features/agenda/agenda'

export const Route = createFileRoute('/_app/agenda')({ component: Agenda })
