import { createFileRoute } from '@tanstack/react-router'

import { VeiculosLista } from '@/features/veiculos/veiculos-lista'

export const Route = createFileRoute('/_app/veiculos/')({
  validateSearch: (busca: Record<string, unknown>): { ver?: string } =>
    typeof busca.ver === 'string' ? { ver: busca.ver } : {},
  component: Veiculos,
})

function Veiculos() {
  const { ver } = Route.useSearch()
  // `key` remonta a lista quando se chega de outro lugar (cliente) pedindo um veículo específico.
  return <VeiculosLista key={ver ?? 'lista'} abrirId={ver} />
}
