import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { AppLayout } from '@/components/layout/app-layout'
import { LOGIN_ATIVO, useSessao } from '@/features/auth/sessao'

// Tudo dentro de _app/ usa esta casca. Com o login ativo, sem sessão volta para /login e, enquanto
// a senha provisória não for trocada, para /trocar-senha.
export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    if (!LOGIN_ATIVO) return
    const eu = await useSessao.getState().carregar()
    if (!eu) throw redirect({ to: '/login' })
    if (eu.trocarSenha) throw redirect({ to: '/trocar-senha' })
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
})
