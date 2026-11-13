import { createFileRoute } from '@tanstack/react-router'

import { EmConstrucao, Pagina } from '@/components/layout/pagina'

export const Route = createFileRoute('/_app/veiculos')({ component: Veiculos })

function Veiculos() {
  return (
    <Pagina titulo="Veículos" descricao="Carros cadastrados, com o histórico de cada um.">
      <EmConstrucao />
    </Pagina>
  )
}
