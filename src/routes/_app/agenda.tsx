import { createFileRoute } from '@tanstack/react-router'

import { EmConstrucao, Pagina } from '@/components/layout/pagina'

export const Route = createFileRoute('/_app/agenda')({ component: Agenda })

function Agenda() {
  return (
    <Pagina titulo="Agenda" descricao="Entradas de veículos marcadas por dia.">
      <EmConstrucao />
    </Pagina>
  )
}
