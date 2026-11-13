import { createFileRoute } from '@tanstack/react-router'

import { EmConstrucao, Pagina } from '@/components/layout/pagina'

export const Route = createFileRoute('/_app/estoque')({ component: Estoque })

function Estoque() {
  return (
    <Pagina titulo="Peças e produtos" descricao="Itens em estoque, com saldo e baixa automática pelas OS.">
      <EmConstrucao />
    </Pagina>
  )
}
