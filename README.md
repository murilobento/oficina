# Oficina

Sistema de gestão para oficina mecânica: clientes, veículos, orçamentos, vendas, compras, estoque e peças.

Layout portado do template Studio Admin (MIT), ver `src/components/layout/LICENSE-studio-admin.txt`.

## Como rodar

```bash
pnpm install
cp .env.example .env.local   # preencha DATABASE_URL e BETTER_AUTH_SECRET
pnpm dev                     # telas (http://localhost:5173)
pnpm api                     # API local (porta 8787; o Vite repassa /api)
```

Sem `DATABASE_URL`, a API sobe com um banco em memória (os dados somem ao reiniciar). Serve para testar.
Empresa, clientes, fornecedores, produtos, serviços e veículos já ficam no banco (via API). Orçamentos, vendas, compras, estoque, funcionários e perfis ainda guardam os dados no navegador (localStorage); a ligação deles é a próxima etapa. Enquanto isso, vendas, compras e acertos não alteram o saldo dos produtos.

Comandos: `pnpm build`, `pnpm lint`, `pnpm test`.

## Banco (Neon) e login (Better Auth)

1. Crie um projeto no [Neon](https://neon.tech) e copie a connection string para `DATABASE_URL`.
2. Gere um segredo (`openssl rand -base64 32`) e coloque em `BETTER_AUTH_SECRET`.
3. Crie as tabelas: `pnpm db:migrar` (pode rodar de novo; só aplica o que falta).
4. Crie o primeiro administrador:
   `ADMIN_EMAIL=voce@exemplo.com ADMIN_NOME="Seu Nome" ADMIN_SENHA=senha-provisoria pnpm db:admin`
   Ele será obrigado a trocar a senha no primeiro acesso.
5. Use `VITE_LOGIN_ATIVO=true`: as telas de cadastro precisam de login para falar com a API.

Não há cadastro público: só o administrador cria funcionários e redefine senhas (nova senha provisória).

## Publicar na Vercel

Variáveis de ambiente do projeto: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (endereço do site, ex.: `https://oficina.vercel.app`), `APP_ORIGENS` (se houver outros domínios) e `VITE_LOGIN_ATIVO=true`.
A API roda em `api/index.ts`; `vercel.json` direciona `/api/*` para ela e o resto para o app.

## Estrutura

- `src/routes`: telas (TanStack Router, arquivos em `_app/` usam a casca com menu)
- `src/features`: regras e telas de cada módulo
- `src/navigation/sidebar-items.ts`: itens do menu
- `src/components/ui`: componentes de interface (shadcn/ui)
- `server`: API (Hono), login (Better Auth), banco e migrações
- `db/migrations`: SQL do domínio da oficina
