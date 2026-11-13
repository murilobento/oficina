import { createFileRoute } from '@tanstack/react-router'

import { EmConstrucao, Pagina } from '@/components/layout/pagina'

export const Route = createFileRoute('/_app/ordens')({ component: Ordens })

function Ordens() {
  return (
    <Pagina titulo="Ordens de serviço" descricao="Serviços em andamento, com peças, mão de obra e status.">
      <EmConstrucao />
    </Pagina>
  )
}
