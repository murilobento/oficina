import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

export const Route = createRootRoute({
  component: Outlet,
  notFoundComponent: NaoEncontrada,
})

function NaoEncontrada() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground">
        O endereço acessado não existe no sistema.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}
