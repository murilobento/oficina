-- Esquema do domínio da oficina (Neon / PostgreSQL).
-- As tabelas de login (user, session, account, verification) são criadas pelo Better Auth
-- em `pnpm db:migrar`; aqui ficam só as regras da oficina.
-- Valores em dinheiro: centavos (integer). Quantidades: numeric com 3 casas.


-- ---------- Acesso ----------
-- Perfil = papel do funcionário. O id do perfil é o valor de user.role no Better Auth.
create table perfis (
  id         text primary key,
  nome       text not null unique,
  descricao  text not null default '',
  protegido  boolean not null default false
);

create table perfil_permissoes (
  perfil_id  text not null references perfis (id) on delete cascade,
  permissao  text not null,
  primary key (perfil_id, permissao)
);

-- ---------- Empresa (uma única linha) ----------
create table empresa (
  id                      smallint primary key default 1 check (id = 1),
  razao_social            text not null default '',
  nome_fantasia           text not null default 'Nome da oficina',
  cnpj                    text not null default '',
  inscricao_estadual      text not null default '',
  inscricao_municipal     text not null default '',
  cep                     text not null default '',
  logradouro              text not null default '',
  numero                  text not null default '',
  complemento             text not null default '',
  bairro                  text not null default '',
  cidade                  text not null default '',
  uf                      text not null default '',
  telefone                text not null default '',
  whatsapp                text not null default '',
  email                   text not null default '',
  site                    text not null default '',
  instagram               text not null default '',
  horario                 text not null default '',
  validade_orcamento_dias integer not null default 7 check (validade_orcamento_dias between 1 and 90),
  condicoes_orcamento     text not null default '',
  rodape                  text not null default '',
  logo                    text not null default ''
);
insert into empresa (id) values (1);

-- ---------- Cadastros ----------
create table pessoas (
  id                  uuid primary key default gen_random_uuid(),
  papel               text not null check (papel in ('cliente', 'fornecedor')),
  tipo                text not null check (tipo in ('PF', 'PJ')),
  documento           text not null default '',
  nome                text not null,
  nome_fantasia       text not null default '',
  email               text not null default '',
  telefone            text not null default '',
  celular             text not null default '',
  cep                 text not null default '',
  logradouro          text not null default '',
  numero              text not null default '',
  complemento         text not null default '',
  bairro              text not null default '',
  cidade              text not null default '',
  uf                  text not null default '',
  observacoes         text not null default '',
  situacao_cadastral  text not null default '',
  cnae_principal      text not null default '',
  extras              jsonb not null default '{}'::jsonb,
  ativo               boolean not null default true,
  criado_em           timestamptz not null default now()
);
create index pessoas_papel_nome on pessoas (papel, nome);
create index pessoas_documento on pessoas (papel, documento) where documento <> '';

create table produtos (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique,
  descricao       text not null,
  categoria       text not null default 'outros',
  marca           text not null default '',
  referencia      text not null default '',
  codigo_barras   text not null default '',
  unidade         text not null default 'UN',
  aplicacao       text not null default '',
  custo           integer not null default 0 check (custo >= 0),
  venda           integer not null default 0 check (venda >= 0),
  estoque_minimo  numeric(12, 3) not null default 0,
  -- Só muda por movimentação de estoque (compra, venda, acerto); pode ficar negativo.
  saldo           numeric(12, 3) not null default 0,
  localizacao     text not null default '',
  fornecedor_id   uuid references pessoas (id) on delete set null,
  ncm             text not null default '',
  observacoes     text not null default '',
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);

create table servicos (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null unique,
  descricao     text not null,
  categoria     text not null default 'outros',
  valor         integer not null default 0 check (valor >= 0),
  tempo_horas   numeric(6, 2) not null default 0,
  garantia_dias integer not null default 0,
  garantia_km   integer not null default 0,
  observacoes   text not null default '',
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

create table veiculos (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references pessoas (id) on delete restrict,
  placa        text not null default '',
  modelo       text not null,
  ano          text not null default '',
  cor          text not null default '',
  km           integer not null default 0 check (km >= 0),
  combustivel  text not null default '',
  cambio       text not null default '',
  motor        text not null default '',
  observacoes  text not null default '',
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now()
);
create unique index veiculos_placa_unica on veiculos (placa) where placa <> '';
create index veiculos_cliente on veiculos (cliente_id);

-- ---------- Numeração dos documentos ----------
create sequence orcamento_numero_seq;
create sequence venda_numero_seq;
create sequence compra_numero_seq;
create sequence acerto_numero_seq;

-- ---------- Orçamentos ----------
create table orcamentos (
  id             uuid primary key default gen_random_uuid(),
  numero         text not null unique default ('ORC-' || lpad(nextval('orcamento_numero_seq')::text, 4, '0')),
  cliente_id     uuid not null references pessoas (id) on delete restrict,
  veiculo_id     uuid not null references veiculos (id) on delete restrict,
  km             integer not null default 0,
  problema       text not null default '',
  desconto_tipo  text not null default 'percentual' check (desconto_tipo in ('valor', 'percentual')),
  -- Centavos quando desconto_tipo = 'valor'; percentual (0 a 100) quando 'percentual'.
  desconto       numeric(12, 2) not null default 0 check (desconto >= 0),
  validade_dias  integer not null default 7,
  observacoes    text not null default '',
  status         text not null default 'rascunho'
                   check (status in ('rascunho', 'enviado', 'aprovado', 'recusado', 'convertido')),
  criado_em      timestamptz not null default now()
);
create index orcamentos_cliente on orcamentos (cliente_id);
create index orcamentos_veiculo on orcamentos (veiculo_id);

create table orcamento_itens (
  id            uuid primary key default gen_random_uuid(),
  orcamento_id  uuid not null references orcamentos (id) on delete cascade,
  posicao       integer not null,
  tipo          text not null check (tipo in ('produto', 'servico')),
  -- Produto ou serviço de origem; nulo no item avulso (sem chave estrangeira: aponta para duas tabelas).
  origem_id     uuid,
  descricao     text not null,
  unidade       text not null default 'UN',
  quantidade    numeric(12, 3) not null check (quantidade > 0),
  valor         integer not null default 0 check (valor >= 0)
);
create index orcamento_itens_orcamento on orcamento_itens (orcamento_id);

-- ---------- Vendas ----------
create table vendas (
  id               uuid primary key default gen_random_uuid(),
  numero           text not null unique default ('VND-' || lpad(nextval('venda_numero_seq')::text, 4, '0')),
  -- Nulo = consumidor final (venda de balcão).
  cliente_id       uuid references pessoas (id) on delete restrict,
  veiculo_id       uuid references veiculos (id) on delete restrict,
  km               integer not null default 0,
  orcamento_id     uuid references orcamentos (id) on delete restrict,
  desconto_tipo    text not null default 'percentual' check (desconto_tipo in ('valor', 'percentual')),
  desconto         numeric(12, 2) not null default 0 check (desconto >= 0),
  forma_pagamento  text not null,
  observacoes      text not null default '',
  status           text not null default 'concluida' check (status in ('concluida', 'cancelada')),
  criado_em        timestamptz not null default now()
);
create index vendas_cliente on vendas (cliente_id);
create index vendas_orcamento on vendas (orcamento_id);

create table venda_itens (
  id          uuid primary key default gen_random_uuid(),
  venda_id    uuid not null references vendas (id) on delete cascade,
  posicao     integer not null,
  tipo        text not null check (tipo in ('produto', 'servico')),
  origem_id   uuid,
  descricao   text not null,
  unidade     text not null default 'UN',
  quantidade  numeric(12, 3) not null check (quantidade > 0),
  valor       integer not null default 0 check (valor >= 0)
);
create index venda_itens_venda on venda_itens (venda_id);

-- ---------- Compras ----------
create table compras (
  id             uuid primary key default gen_random_uuid(),
  numero         text not null unique default ('CMP-' || lpad(nextval('compra_numero_seq')::text, 4, '0')),
  fornecedor_id  uuid not null references pessoas (id) on delete restrict,
  nota_fiscal    text not null default '',
  frete          integer not null default 0 check (frete >= 0),
  desconto       integer not null default 0 check (desconto >= 0),
  observacoes    text not null default '',
  status         text not null default 'concluida' check (status in ('concluida', 'cancelada')),
  criado_em      timestamptz not null default now()
);
create index compras_fornecedor on compras (fornecedor_id);

create table compra_itens (
  id          uuid primary key default gen_random_uuid(),
  compra_id   uuid not null references compras (id) on delete cascade,
  posicao     integer not null,
  produto_id  uuid not null references produtos (id) on delete restrict,
  descricao   text not null,
  unidade     text not null default 'UN',
  quantidade  numeric(12, 3) not null check (quantidade > 0),
  custo       integer not null check (custo > 0)
);
create index compra_itens_compra on compra_itens (compra_id);

-- ---------- Estoque ----------
create table movimentos_estoque (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references produtos (id) on delete restrict,
  tipo        text not null check (tipo in ('entrada', 'saida')),
  quantidade  numeric(12, 3) not null check (quantidade > 0),
  saldo_apos  numeric(12, 3) not null,
  origem      text not null check (origem in ('compra', 'venda', 'acerto', 'inicial')),
  documento   text not null default '',
  motivo      text not null default '',
  criado_em   timestamptz not null default now()
);
create index movimentos_produto_data on movimentos_estoque (produto_id, criado_em desc);

create table acertos (
  id           uuid primary key default gen_random_uuid(),
  numero       text not null unique default ('ACE-' || lpad(nextval('acerto_numero_seq')::text, 4, '0')),
  motivo       text not null,
  observacoes  text not null default '',
  criado_em    timestamptz not null default now()
);

create table acerto_itens (
  id             uuid primary key default gen_random_uuid(),
  acerto_id      uuid not null references acertos (id) on delete cascade,
  produto_id     uuid not null references produtos (id) on delete restrict,
  descricao      text not null,
  unidade        text not null default 'UN',
  saldo_sistema  numeric(12, 3) not null,
  contado        numeric(12, 3) not null check (contado >= 0)
);
create index acerto_itens_acerto on acerto_itens (acerto_id);
