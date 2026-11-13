import { createFileRoute } from '@tanstack/react-router'

import { EmConstrucao, Pagina } from '@/components/layout/pagina'

export const Route = createFileRoute('/_app/admin/auditoria')({ component: Auditoria })

function Auditoria() {
  return (
    <Pagina titulo="Auditoria" descricao="Registro das ações sensíveis feitas no sistema.">
      <EmConstrucao />
    </Pagina>
  )
}
