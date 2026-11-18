import { createFileRoute } from '@tanstack/react-router'

import { Pagina } from '@/components/layout/pagina'
import { PainelDoDia } from '@/features/inicio/painel'

export const Route = createFileRoute('/_app/')({ component: Inicio })

function Inicio() {
  return (
    <Pagina titulo="Início" descricao="Painel do dia.">
      <PainelDoDia />
    </Pagina>
  )
}
