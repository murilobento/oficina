import { createFileRoute, Outlet } from '@tanstack/react-router'

import { AppLayout } from '@/components/layout/app-layout'

// Tudo dentro de _app/ usa esta casca. Na etapa 1.1 entra aqui o `beforeLoad`
// que redireciona para /login quando não há sessão.
export const Route = createFileRoute('/_app')({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
})
