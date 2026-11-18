# Etapa 3 — Funcionários e Perfis na API: Plano

> **Para executores:** use superpowers:executing-plans (execução inline, TDD).

**Objetivo:** tirar as telas de Funcionários e Perfis do protótipo local e ligá-las à API, com regras de proteção no servidor.

**Arquitetura:** rotas Hono próprias (`/api/funcionarios`, `/api/perfis`) que usam o `internalAdapter` do Better Auth (criar usuário, vincular senha, trocar senha, apagar sessões) e SQL direto nas tabelas `user`, `session`, `perfis`, `perfil_permissoes`. As rotas `/api/auth/admin/*` do plugin deixam de ser expostas (404), para que as proteções valham sempre.

**Stack:** Hono, Better Auth 1.7, zod 4, PGlite (testes), React + TanStack Query.

**Spec:** desenho aprovado no chat (2026-11-18).

## Restrições globais
- Mensagens de erro em português; erros de campo em `campos`.
- Permissões: `funcionarios.gerenciar` para `/funcionarios`; `perfis.gerenciar` para alterar perfis. `GET /perfis` aceita qualquer das duas (o formulário de funcionário precisa da lista).
- Senha provisória gerada no servidor (14 caracteres, alfabeto sem 0/O/1/l/I), mostrada uma vez, `trocarSenha = true`.
- Quem não tem o perfil protegido (Administrador) não cria, edita, redefine nem desativa administradores.

## Foco da revisão
- Último administrador ativo nunca some (desativar ou rebaixar).
- Funcionário desativado perde a sessão na hora (sessões apagadas e `exigirSessao` recusa `banned`).
- E-mail duplicado (sem diferenciar maiúsculas) → 409 com `campos.email`.
- Nome de perfil duplicado → 409 com `campos.nome`.
- Perfil novo não recebe `perfis.gerenciar` sozinho.

### Tarefa 1: Rotas de perfis (`server/rotas/perfis.ts`, `server/rotas/perfis.test.ts`)
- `registrarRotasPerfis(contexto)`: `GET /perfis` → `[{id,nome,descricao,protegido,permissoes,funcionarios}]`; `POST /perfis`; `PUT /perfis/:id`; `DELETE /perfis/:id` (204).
- Testes: lista traz os 4 iniciais com contagem; criar perfil (sem `perfis.gerenciar`), nome duplicado 409, permissão inexistente 400; editar troca permissões e vale na hora para o funcionário (`/api/eu`); protegido não edita/exclui (403); perfil com funcionário não exclui (409); mecânico (sem permissão) recebe 403.

### Tarefa 2: Rotas de funcionários (`server/rotas/funcionarios.ts`, `server/senha.ts`, testes)
- `gerarSenhaProvisoria(): string`; `registrarRotasFuncionarios(contexto, auth)`.
- `GET /funcionarios`, `POST /funcionarios`, `PUT /funcionarios/:id`, `PATCH /funcionarios/:id/ativo`, `POST /funcionarios/:id/redefinir-senha`.
- Testes: criar devolve senha e o funcionário entra com ela e vê `trocarSenha`; e-mail duplicado; perfil inexistente; não desativa a si mesmo; não rebaixa a si mesmo; último admin ativo protegido; desativar encerra sessão e impede login; reativar volta; redefinir invalida senha antiga, exige troca, derruba sessões; gerência não mexe em administrador; sem permissão 403.

### Tarefa 3: Integração (`server/app.ts`, `server/teste-util.ts`, `server/app.test.ts`)
- Registrar as rotas; `exigirSessao` recusa `banned`; `/api/auth/admin/*` → 404; remover o gancho de `set-user-password`; `teste-util.funcionario(perfil)` passa a usar `POST /funcionarios`; ajustar `app.test.ts`.

### Tarefa 4: Front de perfis (`src/features/perfis/api.ts`, `perfis.tsx`, `perfis-cards.tsx`, `perfil-form.tsx`)
- Hooks `usePerfis`, `useSalvarPerfil`, `useExcluirPerfil`; tela com carregando/erro, envio único, erros por campo, excluir com confirmação.

### Tarefa 5: Front de funcionários (`src/features/usuarios/api.ts`, `usuarios.tsx`, `usuario-form.tsx`, `usuario-dialogs.tsx`, `data.ts`)
- Hooks para listar/criar/editar/ativar/redefinir; senha provisória do servidor no diálogo; remover dados de exemplo.

### Tarefa 6: Verificação e entrega
- vitest, tsc, oxlint, build; revisão final com agente de contexto limpo; entregar e commitar.
