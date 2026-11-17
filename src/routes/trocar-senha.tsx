import { useState } from 'react'

import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'

import { EmConstrucao, Pagina } from '@/components/layout/pagina'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { LOGIN_ATIVO, useSessao } from '@/features/auth/sessao'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/trocar-senha')({
  beforeLoad: async () => {
    if (!LOGIN_ATIVO) return
    if (!(await useSessao.getState().carregar())) throw redirect({ to: '/login' })
  },
  component: TrocarSenha,
})

function TrocarSenha() {
  const navigate = useNavigate()
  const eu = useSessao((estado) => estado.eu)
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  if (!LOGIN_ATIVO) {
    return (
      <div className="p-6">
        <Pagina titulo="Trocar senha" descricao="Disponível quando o login estiver ativo neste ambiente.">
          <EmConstrucao />
        </Pagina>
      </div>
    )
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    if (salvando) return
    if (atual === '') return setErro('Informe a senha atual.')
    if (nova.length < 8) return setErro('A nova senha precisa ter ao menos 8 caracteres.')
    if (nova === atual) return setErro('A nova senha precisa ser diferente da atual.')
    if (nova !== confirmacao) return setErro('A confirmação não é igual à nova senha.')

    setSalvando(true)
    setErro('')
    const { error } = await authClient.changePassword({
      currentPassword: atual,
      newPassword: nova,
      revokeOtherSessions: true,
    })
    if (error) {
      setErro('Não foi possível trocar a senha. Confira a senha atual.')
      setSalvando(false)
      return
    }
    await useSessao.getState().carregar()
    await navigate({ to: '/' })
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <form noValidate onSubmit={salvar} className="flex w-full max-w-sm flex-col gap-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-medium">Trocar senha</h1>
          <p className="text-muted-foreground text-sm">
            {eu?.trocarSenha
              ? 'No primeiro acesso a senha provisória precisa ser trocada.'
              : 'Escolha uma nova senha para a sua conta.'}
          </p>
        </div>
        <FieldGroup className="gap-4">
          <Field className="gap-1.5">
            <FieldLabel htmlFor="senha-atual">Senha atual</FieldLabel>
            <Input id="senha-atual" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel htmlFor="senha-nova">Nova senha</FieldLabel>
            <Input id="senha-nova" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel htmlFor="senha-confirmacao">Repita a nova senha</FieldLabel>
            <Input id="senha-confirmacao" type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
          </Field>
        </FieldGroup>
        {erro && (
          <p role="alert" className="text-destructive text-center text-sm">
            {erro}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Trocar senha'}
          </Button>
          {!eu?.trocarSenha && (
            <Button asChild variant="ghost">
              <Link to="/">Cancelar</Link>
            </Button>
          )}
        </div>
      </form>
    </main>
  )
}
