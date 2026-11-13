import { createFileRoute } from '@tanstack/react-router'

import { EmConstrucao, Pagina } from '@/components/layout/pagina'

export const Route = createFileRoute('/_app/clientes')({ component: Clientes })

function Clientes() {
  return (
    <Pagina titulo="Clientes" descricao="Cadastro de clientes e o histórico de atendimentos.">
      <EmConstrucao />
    </Pagina>
  )
}
