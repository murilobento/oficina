# Telas na API — Etapa 2 (orçamentos, vendas, compras, estoque) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (execução inline escolhida pelo usuário).

**Goal:** Orçamentos, vendas, compras, movimentações e acertos de estoque passam a viver no Neon, com o saldo dos produtos movimentado só pela API, em transação.

**Architecture:** Rotas Hono por módulo (`orcamentos`, `vendas`, `compras`, `estoque`) devolvendo o mesmo formato (camelCase, itens aninhados) que os tipos do front já usam. `Banco.transacao()` garante que documento + saldo + movimento gravam juntos. `server/estoque.ts` é o único lugar que altera `produtos.saldo`. Front: hooks TanStack Query por módulo; regras de negócio (baixa, entrada, cancelamento, km, "Virou venda") ficam no servidor.

**Tech Stack:** Hono, zod 4, PGlite/Neon, TanStack Query, vitest.

**Spec:** conversa ("Siga para etapa 2"); regras do protótipo em `src/features/{vendas,compras,estoque}/acoes.ts` (versão com store local).

## Global Constraints

- Dinheiro em centavos inteiros; quantidades `numeric(12,3)` → number (estender `NUMERICOS` em `util.ts`).
- Numeração pelas sequences do banco (`ORC-`, `VND-`, `CMP-`, `ACE-`).
- Saldo pode ficar negativo na venda (a tela avisa); compra só cancela se o saldo atual cobrir a quantidade comprada (409).
- Permissões: `orcamentos.*`, `vendas.*`, `compras.*`, `estoque.ver` (movimentos/acertos ver), `estoque.editar` (acertos criar). Sem `valores.ver`, valores/custos/descontos/frete saem zerados; na criação sem `valores.ver` os valores dos itens vêm do catálogo (itens avulsos = 0).
- Online only; sem dados de exemplo; apagar chaves localStorage `orcamentos`, `vendas`, `compras`, `movimentos`, `acertos`.

## Review Focus

- Venda concorrente/duplo cancelamento não pode devolver estoque duas vezes (cancelamento com `update ... where status='concluida'`).
- Falha no meio (produto inexistente num item) não pode deixar documento sem movimento (transação com rollback).
- Item de venda cujo `origemId` é serviço ou avulso não mexe no estoque.
- Venda a partir de orçamento só se aprovado, e orçamento não vira venda duas vezes.
- Cancelar venda reabre o orçamento como aprovado; editar orçamento só em rascunho/enviado.
- Perfil sem permissão → 403; sem `valores.ver` → valores zerados.

---
### Task 1: Banco.transacao + estoque.ts
Files: `server/banco.ts`, `server/estoque.ts`, `server/estoque.test.ts`.
Produces: `Banco.transacao<T>(fn: (q: Consulta) => Promise<T>): Promise<T>`; `movimentar(q, {produtoId, delta, origem, documento, motivo}): Promise<{saldoApos:number}>`.
Test: transação com erro faz rollback; movimentar altera saldo e grava movimento.

### Task 2: Rotas de compras e estoque (movimentos, acertos)
Files: `server/rotas/compras.ts`, `server/rotas/estoque.ts` (+ testes), `server/app.ts`, `util.ts` NUMERICOS, migração `0003` se faltar índice.
Rotas: `GET/POST /compras`, `GET /compras/:id`, `POST /compras/:id/cancelar`; `GET /estoque/movimentos`, `GET/POST /estoque/acertos`, `GET /estoque/acertos/:id`.

### Task 3: Rotas de orçamentos e vendas
Files: `server/rotas/orcamentos.ts`, `server/rotas/vendas.ts` (+ testes).
Rotas: `GET/POST /orcamentos`, `GET/PUT /orcamentos/:id`, `PATCH /orcamentos/:id/status`; `GET/POST /vendas` (POST aceita `orcamentoId`+`formaPagamento`), `GET /vendas/:id`, `POST /vendas/:id/cancelar`.

### Task 4: Front — hooks e telas
Hooks `api.ts` por módulo; trocar stores por hooks nas listas/forms/detalhes; remover stubs (`ESTOQUE_MOVIMENTADO`, `AvisoEstoque`, no-op); `itensSemSaldo` usa saldo do cache; acertos "Novo" habilitado; histórico de veículos pela API; limpar localStorage.

### Task 5: Verificação e revisão
`pnpm test`, `tsc`, lint, E2E Playwright, revisão final com agente de contexto novo.

---
## Rulings durante a execução

- Compra só é lançada por quem tem `compras.editar` **e** `valores.ver` (compra sem custo não existe); botões "Novo" somem sem permissão.
- Edição de orçamento por perfil sem `valores.ver`: itens que já existiam mantêm o valor negociado, itens novos entram com o preço do catálogo (avulso = 0) e o desconto não muda.
- Quantidades aceitam no máximo 3 casas; desconto percentual no máximo 2 casas.
- Estoque movimentado sempre em ordem fixa de produto (evita deadlock entre documentos simultâneos no Neon).
- Migração `0003_acerto_posicao.sql` (coluna `posicao` em `acerto_itens`); acertos aceitam até 5000 produtos.
- Gerar venda de orçamento usa a linha travada pelo `update … returning *` (cabeçalho e itens da mesma versão).

## Fora do escopo / conhecido

- Cancelar compra não restaura o custo anterior do produto (o custo vale o da última compra lançada).
- `/estoque/movimentos` devolve os 1000 mais recentes (sem paginação no servidor ainda).
- Percentual de desconto com mais de 2 casas é recusado pela API; a máscara do front ainda aceita 3 (a API responde 400 com mensagem).
