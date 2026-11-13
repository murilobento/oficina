import { createFileRoute } from '@tanstack/react-router'

import { EmConstrucao, Pagina } from '@/components/layout/pagina'

export const Route = createFileRoute('/_app/orcamentos')({ component: Orcamentos })

function Orcamentos() {
  return (
    <Pagina titulo="Orçamentos" descricao="Propostas enviadas ao cliente antes da ordem de serviço.">
      <EmConstrucao />
    </Pagina>
  )
}
