# Telas na API, etapa 1 (cadastros) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Empresa, clientes, fornecedores, produtos, serviços e veículos passam a ser lidos e gravados no Neon pela API, em vez do localStorage, e ficam iguais em todos os aparelhos.

**Architecture:** Abordagem B escolhida pelo Murilo: cada tela usa consultas e mutações explícitas do TanStack Query (um `api.ts` de hooks por módulo, sobre um cliente `fetch` único em `src/lib/api.ts`). Na API (Hono, `server/rotas/*.ts`) cada módulo é um arquivo de rotas que valida a entrada com o mesmo esquema zod usado no formulário e confere a permissão do perfil com `exigirPermissao`. Só online; o Neon começa vazio (sem importar o localStorage). Orçamentos, vendas, compras, estoque, usuários e perfis ficam para as etapas 2 e 3 e continuam em localStorage, lendo os cadastros pelos novos hooks.

**Tech Stack:** Hono, Better Auth, zod 4, `@tanstack/react-query` 5 (já no `main.tsx`), PGlite nos testes de servidor, vitest, Playwright para o teste de fumaça.

**Spec:** conversa de 2026-11-17 (respostas do Murilo: cadastros primeiro; começar do zero no Neon; só online; API confere permissões; abordagem B). Não há documento de design separado.

## Global Constraints

- Dinheiro em centavos (`integer`); quantidades `numeric(12,3)` chegam ao front como `number`.
- Documento, CEP e telefones gravados sem máscara e como texto.
- Nomes de tabela e coluna em snake_case no banco; camelCase nos tipos do front (`criadoEm`, `nomeFantasia`). A conversão fica no servidor, em `server/rotas/util.ts`.
- Erros da API: JSON `{ erro: string }`; 401 sem sessão, 403 sem permissão, 400 validação (com `campos: Record<string,string>`), 404 inexistente, 409 duplicidade (placa, código).
- Permissões: `clientes.ver|editar` valem para clientes e fornecedores (como o menu hoje); `estoque.ver|editar` para produtos; `servicos.ver|editar`; `veiculos.ver|editar`; `empresa.gerenciar` para gravar a empresa (qualquer sessão lê, pois o cabeçalho e os documentos usam). Valores `custo` e `venda` de produto e `valor` de serviço só são devolvidos com `valores.ver`; sem ela vêm `0`.
- Texto da interface em português do Brasil, com as mensagens de erro no padrão atual (frases completas).
- `pnpm test`, `npx tsc -b` e `npx oxlint src server api` passam ao fim de cada tarefa.
- Cada tarefa termina em commit, com os trailers `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` e `Claude-Session: https://claude.ai/code/session_01FCUcKQhG8YZhyfgNo5S7wh`. O Murilo faz o `git push`.

## Review Focus

- Dois cadastros enviados ao mesmo tempo com o mesmo código (produto/serviço) não podem gerar código repetido: o código vem de sequence no banco.
- Placa de veículo repetida (com maiúsculas/minúsculas e hífen diferentes, "abc-1234" e "ABC1D23") devolve 409 com mensagem clara, e placa vazia pode repetir.
- Excluir cliente com veículo ou excluir fornecedor ligado a produto: o cliente com veículo é recusado com 409 e mensagem; o fornecedor ligado a produto é excluído e o produto fica sem fornecedor (`on delete set null` já existente).
- Usuário sem `valores.ver` nunca recebe custo, preço ou valor (nem por `GET /produtos/:id`) e não consegue gravá-los.
- Sessão que expira com a tela aberta: a próxima chamada devolve 401 e o front leva ao `/login`, sem tela quebrada.
- Logo da empresa maior que o limite (500 KB) é recusada com 400 e mensagem, em vez de erro genérico 500.
- Lista vazia no Neon: as telas mostram o estado vazio atual, não um erro.

---

## File Structure

- `server/rotas/util.ts` (novo): helpers de rota (validar corpo com zod, mapear linha↔objeto, erros padronizados).
- `server/rotas/{empresa,pessoas,produtos,servicos,veiculos}.ts` (novos): um por módulo; cada um exporta `registrarRotas<Modulo>(app, banco)`.
- `server/teste-util.ts` (novo): `iniciarAppDeTeste()` e `entrar(perfil)` compartilhados pelos testes de rota.
- `db/migrations/0002_codigos.sql` (novo): sequences `produto_codigo_seq` e `servico_codigo_seq`.
- `src/lib/api.ts` (novo): cliente `fetch` e `ApiErro`.
- `src/features/<modulo>/api.ts` (novos): hooks `use…` de consulta e mutação de cada módulo.
- Telas e formulários existentes mudam para os hooks; `store.ts` de cada módulo e os dados de exemplo saem.

## Task 1: Base da API de dados e cliente fetch

**Files:**
- Create: `server/rotas/util.ts`, `server/teste-util.ts`, `src/lib/api.ts`, `src/lib/api.test.ts`
- Modify: `server/app.ts` (aceitar `registrarRotas`), `server/app.test.ts` (usar `teste-util`)

**Interfaces:**
- Produces: `server/rotas/util.ts`: `lerCorpo<T>(c, esquema: z.ZodType<T>): Promise<T>` (lança `ErroApi(400, mensagem, campos)`), `class ErroApi extends Error { status: number; campos?: Record<string,string> }`, `paraCamel(linha: Record<string, unknown>): Record<string, unknown>`, `paraSnake(chave: string): string`. `criarApp` passa a devolver `app` com `exigirSessao` e `exigirPermissao` (já devolve) e o `onError` converte `ErroApi` em `{ erro, campos }` com o status certo.
- Produces: `server/teste-util.ts`: `iniciarAppDeTeste(): Promise<{ app; banco; fechar(): Promise<void> }>`, `entrar(app, email: string, senha: string): Promise<string>` (devolve o cookie), `criarFuncionario(app, cookieAdmin, { email, perfil }): Promise<{ email: string; senha: string }>`.
- Produces: `src/lib/api.ts`: `api<T>(caminho: string, opcoes?: { metodo?: string; corpo?: unknown }): Promise<T>`; `class ApiErro extends Error { status: number; campos?: Record<string,string> }`. Em 401 chama `useSessao.getState().limpar()` e `window.location.assign("/login")` (exceto se já estiver em `/login`).

- [ ] **Step 1: Write the failing tests.** `src/lib/api.test.ts` (vitest com `fetch` mockado): `api` devolve o JSON em 200; lança `ApiErro` com `status` 400 e `campos` quando a resposta traz `{ erro, campos }`; em 401 chama o `assign` de `/login`. Em `server/app.test.ts` troque o setup pelo `iniciarAppDeTeste` e acrescente `it("converte ErroApi em resposta com status e campos")` usando uma rota de teste registrada só no teste.
- [ ] **Step 2: Run** `npx vitest run src/lib/api.test.ts server/app.test.ts`. Expected: FAIL (módulos não existem).
- [ ] **Step 3: Implement** os arquivos acima. `paraCamel` converte chaves `snake_case` em `camelCase` e transforma `numeric` (string vinda do driver) em `number` para as chaves que terminam em `saldo`, `estoque_minimo`, `tempo_horas`; as datas viram ISO string.
- [ ] **Step 4: Run** os mesmos testes e `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: base da API de dados e cliente fetch`.

## Task 2: Empresa

**Files:**
- Create: `server/rotas/empresa.ts`, `server/rotas/empresa.test.ts`, `src/features/empresa/api.ts`
- Modify: `server/app.ts` (registrar), `src/features/empresa/empresa-form.tsx`, `cabecalho-empresa.tsx`, `logo-empresa.tsx`, `empresa.test.ts`; remover `src/features/empresa/store.ts`

**Interfaces:**
- Consumes: Task 1 (`lerCorpo`, `ErroApi`, `api`).
- Produces: `GET /api/empresa` (sessão) → `Empresa`; `PUT /api/empresa` (`empresa.gerenciar`) corpo `Empresa` sem `id` → `Empresa`. `src/features/empresa/api.ts`: `useEmpresa(): Empresa` (devolve `EMPRESA_PADRAO` enquanto carrega, sem quebrar documentos), `useSalvarEmpresa(): UseMutationResult<Empresa, ApiErro, Empresa>`. Esquema zod da empresa exportado de `tipos.ts` e usado nos dois lados.

- [ ] **Step 1: Write the failing tests** (`empresa.test.ts` de servidor): `GET` sem sessão → 401; `GET` logado devolve `nomeFantasia: "Nome da oficina"` (linha seeded); `PUT` por mecânico → 403; `PUT` por administrador altera e um `GET` seguinte devolve o novo valor; `PUT` com `logo` de 600 KB → 400 com mensagem sobre o tamanho; `validadeOrcamentoDias: 0` → 400 com `campos.validadeOrcamentoDias`.
- [ ] **Step 2: Run** `npx vitest run server/rotas/empresa.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** a rota (uma única linha `id = 1`, `update ... returning`) e os hooks (`useQuery` com chave `["empresa"]`, `staleTime` 5 min; a mutação invalida a chave). O formulário passa a usar `useSalvarEmpresa` e mostra o erro da API por campo.
- [ ] **Step 4: Run** `npx vitest run`, `npx tsc -b`, `npx oxlint src server api`. Expected: PASS.
- [ ] **Step 5: Verificação manual no navegador** (login ligado): salvar a empresa em um aparelho e abrir em outro mostra os mesmos dados e a logo.
- [ ] **Step 6: Commit** `feat: dados da empresa na API`.

## Task 3: Clientes e fornecedores

**Files:**
- Create: `server/rotas/pessoas.ts`, `server/rotas/pessoas.test.ts`, `src/features/pessoas/api.ts`
- Modify: `server/app.ts`, `src/features/pessoas/{entidades.ts,pessoas-lista.tsx,pessoa-form.tsx,pessoa-detalhe.tsx,campo-cliente.tsx,cliente-rapido.tsx,consultas.ts}`; remover `store.ts` e os dados de exemplo de `entidades.ts`

**Interfaces:**
- Consumes: Task 1; `esquemaPessoa` de `tipos.ts` (zod já existente, reaproveitado no servidor).
- Produces: `GET /api/pessoas?papel=cliente|fornecedor` → `Pessoa[]` ordenadas por nome; `GET /api/pessoas/:id`; `POST /api/pessoas` corpo `{ papel, ...PessoaFormValores sem máscara }`; `PUT /api/pessoas/:id`; `PATCH /api/pessoas/:id/ativo` corpo `{ ativo: boolean }`; `DELETE /api/pessoas/:id` (409 se houver veículo, venda ou orçamento ligado). Permissões `clientes.ver` para GET e `clientes.editar` para o resto. Hooks: `usePessoas(papel): { dados: Pessoa[]; carregando: boolean; erro: ApiErro | null }`, `usePessoa(id)`, `useSalvarPessoa(papel)`, `useAlternarAtivoPessoa()`, `useExcluirPessoa()`. `EntidadeConfig.useStore` é substituído por `papel: "cliente" | "fornecedor"`.

- [ ] **Step 1: Write the failing tests:** criar cliente PF válido → 201 e aparece em `GET ?papel=cliente` e não em `fornecedor`; CPF inválido → 400 com `campos.documento`; `PUT` altera; `PATCH ativo` alterna; `DELETE` de cliente com veículo → 409 com a mensagem "Este cliente tem veículos cadastrados."; excluir fornecedor ligado a um produto → 204 e o produto passa a ter `fornecedorId` vazio; `GET` com o banco vazio → `[]` (200); usuário sem `clientes.editar` → 403 no `POST` e 200 no `GET`.
- [ ] **Step 2: Run** `npx vitest run server/rotas/pessoas.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** rotas e hooks; `extras` vai em `jsonb`. As listas e formulários mostram "Carregando…" (componente `Carregando` já existente nas listagens, se não houver, criar um mínimo em `src/components/estado-vazio.tsx`) e o erro da API em um aviso no topo. O cadastro rápido (`cliente-rapido.tsx`) devolve o cliente criado pela mutação para o orçamento e a venda continuarem selecionando-o.
- [ ] **Step 4: Run** `npx vitest run`, `tsc`, `oxlint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: clientes e fornecedores na API`.

## Task 4: Produtos

**Files:**
- Create: `db/migrations/0002_codigos.sql`, `server/rotas/produtos.ts`, `server/rotas/produtos.test.ts`, `src/features/produtos/api.ts`
- Modify: `server/app.ts`, `src/features/produtos/{produto-form.tsx,produtos-lista.tsx,seletor-produto.tsx,produto-detalhe.tsx,tipos.ts}`; remover `store.ts`

**Interfaces:**
- Consumes: Task 1, Task 3 (`usePessoas("fornecedor")` para o seletor de fornecedor).
- Produces: `GET /api/produtos`, `GET /api/produtos/:id`, `POST`, `PUT /:id`, `PATCH /:id/ativo`, `DELETE /:id` (409 se tiver movimentação). `estoque.ver` lê, `estoque.editar` grava. O `saldo` **nunca** é aceito em `POST`/`PUT` (ignorado). O `codigo` é gerado no `POST` como `PRD-` + `lpad(nextval('produto_codigo_seq'), 4, '0')`. Hooks: `useProdutos()`, `useProduto(id)`, `useSalvarProduto()`, `useAlternarAtivoProduto()`, `useExcluirProduto()`.

- [ ] **Step 1: Write the failing tests:** dois `POST` em paralelo (`Promise.all`) geram `PRD-0001` e `PRD-0002` distintos; `PUT` com `saldo: 999` não altera o saldo; usuário sem `valores.ver` recebe `custo: 0, venda: 0` na lista e no detalhe e, ao enviar `PUT` com `venda: 100`, o valor gravado não muda; `DELETE` de produto sem movimentação → 204; exclusão de produto com movimentação → 409.
- [ ] **Step 2: Run** `npx vitest run server/rotas/produtos.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** a migração (sequences começando em 1), as rotas e os hooks. O `seletor-produto.tsx` usa `useProdutos()` e filtra no cliente (lista pequena).
- [ ] **Step 4: Run** `npx vitest run`, `tsc`, `oxlint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: produtos na API`.

## Task 5: Serviços

**Files:**
- Create: `server/rotas/servicos.ts`, `server/rotas/servicos.test.ts`, `src/features/servicos/api.ts`
- Modify: `server/app.ts`, `src/features/servicos/{servico-form.tsx,servicos-lista.tsx,servico-detalhe.tsx}`; remover `store.ts`

**Interfaces:**
- Consumes: Task 1, `servico_codigo_seq` da Task 4.
- Produces: mesmas rotas de Produtos em `/api/servicos` (código `SRV-0001`), permissões `servicos.ver|editar`, `valor` só com `valores.ver`. Hooks: `useServicos()`, `useServico(id)`, `useSalvarServico()`, `useAlternarAtivoServico()`, `useExcluirServico()`.

- [ ] **Step 1: Write the failing tests:** criar serviço gera `SRV-0001`; `valor` oculto sem `valores.ver`; garantia negativa → 400 com `campos.garantiaDias`; mecânico sem `servicos.editar` → 403 no `POST`.
- [ ] **Step 2: Run** `npx vitest run server/rotas/servicos.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** igual a Produtos. Hoje o código de serviço é montado em `servico-form.tsx`: trocar para o código devolvido pela API.
- [ ] **Step 4: Run** `npx vitest run`, `tsc`, `oxlint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: serviços na API`.

## Task 6: Veículos

**Files:**
- Create: `server/rotas/veiculos.ts`, `server/rotas/veiculos.test.ts`, `src/features/veiculos/api.ts`
- Modify: `server/app.ts`, `src/features/veiculos/{veiculo-form.tsx,veiculos-lista.tsx,veiculo-detalhe.tsx,veiculos-do-cliente.tsx,veiculo-rapido.tsx,historico.ts}`; remover `store.ts`

**Interfaces:**
- Consumes: Task 1, Task 3 (`usePessoa(id)` para o nome do cliente na lista).
- Produces: `GET /api/veiculos?clienteId=`, `GET /:id`, `POST`, `PUT`, `PATCH /:id/ativo`, `DELETE /:id`; permissões `veiculos.ver|editar`. A placa é normalizada no servidor (maiúscula, sem hífen e sem espaço) antes de gravar e comparar. Hooks: `useVeiculos(clienteId?)`, `useVeiculo(id)`, `useSalvarVeiculo()`, `useAlternarAtivoVeiculo()`, `useExcluirVeiculo()`.

- [ ] **Step 1: Write the failing tests:** placa "abc-1234" gravada como "ABC1234"; segundo veículo com "ABC1234" → 409 "Já existe um veículo com esta placa."; dois veículos sem placa convivem; `clienteId` inexistente → 400; `GET ?clienteId=` filtra; `historico.ts` continua passando com os dados vindos dos hooks (ver Step 3).
- [ ] **Step 2: Run** `npx vitest run server/rotas/veiculos.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** `historico.ts` hoje lê os stores de orçamentos e vendas (ainda locais) e o veículo: passa a receber o veículo por parâmetro, para o teste existente `historico.test.ts` seguir válido sem depender da API.
- [ ] **Step 4: Run** `npx vitest run`, `tsc`, `oxlint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: veículos na API`.

## Task 7: Telas de documentos leem os cadastros da API

**Files:**
- Modify: `src/features/orcamentos/{orcamento-form.tsx,orcamento-detalhe.tsx,orcamentos-lista.tsx,item-rapido.tsx,seletor-item.tsx}`, `src/features/vendas/{acoes.ts,venda-form.tsx,venda-detalhe.tsx}`, `src/features/compras/acoes.ts`, `src/features/estoque/{movimentar.ts,acerto-form.tsx,movimentacoes-lista.tsx}` e os testes `acoes.test.ts`, `movimentar.test.ts`
- Create: `server/rotas/estoque.ts`, `server/rotas/estoque.test.ts`

**Interfaces:**
- Consumes: hooks das Tasks 3 a 6.
- Produces: `POST /api/estoque/movimentos` (`estoque.editar`) corpo `{ produtoId, tipo: "entrada" | "saida", quantidade: number, origem: "compra" | "venda" | "acerto", documento?: string, observacao?: string }` → `{ saldo: number }`, em uma transação (`insert movimentos_estoque` + `update produtos set saldo`). `movimentarEstoque` (local) passa a chamar esse endpoint **ponte** em vez de alterar `produto.saldo` no store local. Esta é a única regra de estoque que muda na etapa 1; a etapa 2 reaproveita o endpoint.

- [ ] **Step 1: Write the failing tests:** endpoint de estoque: entrada de 5 soma, saída de 8 com saldo 5 deixa -3 (saldo negativo é permitido, como hoje), quantidade 0 ou negativa → 400, produto inexistente → 404, mecânico sem `estoque.editar` → 403. Frontend: `acoes.test.ts` e `movimentar.test.ts` passam a injetar um `movimentar` falso e continuam verificando as mesmas regras de venda e compra.
- [ ] **Step 2: Run** `npx vitest run server/rotas/estoque.test.ts src/features/vendas src/features/compras src/features/estoque`. Expected: FAIL.
- [ ] **Step 3: Implement** a rota e a troca dos leitores dos stores antigos pelos hooks (`useClientes`, `useProdutos`, `useServicos`, `useVeiculos`). Registrar uma venda ou compra chama a ponte de saldo para cada item; se a chamada falhar, a venda não é registrada e a tela mostra o erro.
- [ ] **Step 4: Run** `npx vitest run`, `tsc`, `oxlint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: documentos usam cadastros da API e ponte de saldo`.

## Task 8: Limpeza, verificação e entrega

**Files:**
- Modify: `README.md` (nota: cadastros no Neon; documentos ainda locais), qualquer comentário "PROTÓTIPO" que sobrou nos módulos migrados; `src/lib/cadastro-store.ts` e `src/features/pessoas/store.ts` removidos se sem uso
- Create: `e2e/cadastros.spec.ts` (Playwright, roda contra `pnpm api` com PGlite e o front com `VITE_LOGIN_ATIVO=true`)

**Interfaces:**
- Consumes: tudo acima.
- Produces: rotina de limpeza das chaves antigas `oficina.*` do localStorage no primeiro carregamento (`localStorage.removeItem` para as chaves migradas), em `src/main.tsx`.

- [ ] **Step 1: Write the e2e test:** entra como administrador, cadastra cliente, veículo, produto e serviço, recarrega a página e confere que continuam na lista; abre uma segunda aba com outro contexto (outro "aparelho") e vê os mesmos registros; sai e confere o redirecionamento ao `/login`; entra como mecânico sem `clientes.editar` e não vê o botão de novo cliente.
- [ ] **Step 2: Run** o e2e. Expected: FAIL até tudo estar ligado.
- [ ] **Step 3: Implement** a limpeza e ajustes que o e2e apontar.
- [ ] **Step 4: Verificação final:** `npx vite build`, `npx tsc -b`, `npx oxlint src server api`, `npx vitest run`, e2e. Expected: tudo passa.
- [ ] **Step 5: Entregar:** copiar os arquivos para o repositório do Murilo, rodar `pnpm db:migrar` (aplica a `0002`), commitar. Avisar que o Neon passa a ter dados reais e que a Vercel precisa do `db:migrar` contra o banco de produção antes do primeiro uso.

---

## Decisões que ainda precisam do Murilo

1. **Ponte de saldo (Task 7):** vendas, compras e acertos ainda são locais na etapa 1, mas o saldo do produto agora mora no banco. A ponte `POST /api/estoque/movimentos` mantém o saldo certo, mas a lista "Movimentação de estoque" local deixa de refletir as saídas que a venda faz no banco até a etapa 2. A alternativa é migrar estoque, vendas e compras juntos na etapa 2 e, até lá, desligar a baixa de saldo.
2. **Gerência e funcionários:** hoje só o Administrador gerencia usuários. Fica para a etapa 3.

---

## Rulings durante a execução

- Decisão do Murilo: estoque, vendas e compras migram juntos na etapa 2. Na etapa 1 não há ponte de saldo: `movimentarEstoque`/`movimentarItens` não fazem nada, o aviso "sem saldo" fica desligado (`ESTOQUE_MOVIMENTADO = false`), o acerto de estoque só mostra um aviso e a compra não atualiza o custo do produto.
- `GET /api/empresa` é público (a tela de entrada mostra nome e logo antes do login).
- Código de serviço `SRV-###` (3 dígitos, como as telas já faziam); produto `PRD-####`. A função SQL `numero_com_zeros` evita o corte do `lpad` acima de 999/9999 e vale também para a numeração de orçamentos, vendas, compras e acertos.
- Os esquemas de validação do servidor ficam em `server/rotas/*.ts` (valores já sem máscara), em vez de reaproveitar os esquemas do formulário (que trabalham com máscara).
- Sem `valores.ver`, os campos de preço somem dos formulários de produto e serviço; os botões de cadastro rápido do orçamento só aparecem com `estoque.editar` / `servicos.editar`.
- Teste ponta a ponta feito à mão com Playwright (login, troca de senha, cadastros, segundo aparelho), não incluído no repositório.
- Revisão final (agente): corrigidos código automático acima de 999, cache de consultas ao sair (`queryClient.clear()`), botões da Recepção, preço sem `valores.ver`, limites numéricos (400 em vez de 500), dono do veículo precisa ser cliente, invalidar produtos ao excluir fornecedor.
- Adiado (menor): listas ainda carregando aparecem como vazias no seletor de item e no campo de cliente; CPF/CNPJ duplicado por duas requisições simultâneas (falta índice único); o cadastro rápido de cliente/veículo mostra o nome só depois da lista recarregar.
