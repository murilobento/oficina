import { createFileRoute, Outlet, redirect, useLocation } from '@tanstack/react-router'

import { AppLayout } from '@/components/layout/app-layout'
import { SemPermissao } from '@/components/layout/sem-permissao'
import { LOGIN_ATIVO, useSessao } from '@/features/auth/sessao'
import { useAcessoLiberado } from '@/navigation/acesso'

// Tudo dentro de _app/ usa esta casca. Com o login ativo, sem sessão volta para /login e, enquanto
// a senha provisória não for trocada, para /trocar-senha.
export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    if (!LOGIN_ATIVO) return
    const eu = await useSessao.getState().carregar()
    if (eu === 'sem-conexao') return // abre a casca do app; a faixa avisa e os dados vêm quando a rede voltar
    if (!eu) throw redirect({ to: '/login' })
    if (eu.trocarSenha) throw redirect({ to: '/trocar-senha' })
  },
  component: Casca,
})

// Sem a permissão da tela, mostra o aviso no lugar dela (o menu já nem lista essas telas).
function Casca() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const liberado = useAcessoLiberado(pathname)
  return <AppLayout>{liberado ? <Outlet /> : <SemPermissao />}</AppLayout>
}
