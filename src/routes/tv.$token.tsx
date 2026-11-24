import { createFileRoute } from '@tanstack/react-router'

import { PainelTv } from '@/features/tv/painel-tv'

// Painel da TV do pátio: fora de _app (sem menu e sem login). O link traz o token de leitura.
export const Route = createFileRoute('/tv/$token')({ component: Tela })

function Tela() {
  const { token } = Route.useParams()
  return <PainelTv token={token} />
}
