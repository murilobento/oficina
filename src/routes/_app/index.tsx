import { createFileRoute, Link } from '@tanstack/react-router'
import { CalendarDays, Car, ClipboardList, FileText, Package, Users } from 'lucide-react'

import { Pagina } from '@/components/layout/pagina'
import { supabaseNaoConfigurado } from '@/lib/supabase'

export const Route = createFileRoute('/_app/')({ component: Inicio })

// Atalhos grandes, pensados para toque no celular.
const ATALHOS = [
  { to: '/ordens', titulo: 'Ordens de serviço', icone: ClipboardList },
  { to: '/orcamentos', titulo: 'Orçamentos', icone: FileText },
  { to: '/agenda', titulo: 'Agenda', icone: CalendarDays },
  { to: '/clientes', titulo: 'Clientes', icone: Users },
  { to: '/veiculos', titulo: 'Veículos', icone: Car },
  { to: '/estoque', titulo: 'Peças', icone: Package },
] as const

function Inicio() {
  return (
    <Pagina titulo="Início" descricao="Atalhos do dia a dia.">
      {supabaseNaoConfigurado && (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Supabase ainda não configurado: copie <code>.env.example</code> para <code>.env.local</code> e preencha as
          duas variáveis.
        </div>
      )}
      <nav className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {ATALHOS.map(({ to, titulo, icone: Icone }) => (
          <Link
            key={to}
            to={to}
            className="flex min-h-24 flex-col items-start justify-between gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-xs transition-colors hover:bg-accent active:scale-[0.99]"
          >
            <Icone className="size-6 text-primary" aria-hidden />
            <span className="font-medium">{titulo}</span>
          </Link>
        ))}
      </nav>
    </Pagina>
  )
}
