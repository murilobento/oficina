import { createFileRoute } from '@tanstack/react-router'

import { EmConstrucao, Pagina } from '@/components/layout/pagina'

export const Route = createFileRoute('/trocar-senha')({ component: TrocarSenha })

function TrocarSenha() {
  return (
    <div className="p-6">
      <Pagina
        titulo="Trocar senha"
        descricao="No primeiro acesso, a senha provisória precisa ser trocada."
      >
        <EmConstrucao />
      </Pagina>
    </div>
  )
}
