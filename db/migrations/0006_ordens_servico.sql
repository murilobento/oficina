-- Ordens de serviço: o carro no pátio, do orçamento aprovado (ou direto) até a entrega, que gera a venda.
create sequence ordem_numero_seq;

create table ordens (
  id            uuid primary key default gen_random_uuid(),
  numero        text not null unique default ('OS-' || lpad(nextval('ordem_numero_seq')::text, 4, '0')),
  cliente_id    uuid not null references pessoas (id) on delete restrict,
  veiculo_id    uuid not null references veiculos (id) on delete restrict,
  km            integer not null default 0,
  problema      text not null default '',
  -- O que o mecânico encontrou e recomenda para a próxima visita.
  laudo         text not null default '',
  status        text not null default 'fila'
                check (status in ('fila', 'execucao', 'aguardando_peca', 'pronto', 'entregue', 'cancelada')),
  orcamento_id  uuid references orcamentos (id) on delete restrict,
  venda_id      uuid references vendas (id) on delete restrict,
  -- Desconto combinado no orçamento (vai para a venda na entrega).
  desconto_tipo text not null default 'percentual' check (desconto_tipo in ('valor', 'percentual')),
  desconto      numeric(12, 2) not null default 0 check (desconto >= 0),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  entregue_em   timestamptz
);
create index ordens_status on ordens (status);
create index ordens_veiculo on ordens (veiculo_id);
-- Um orçamento tem no máximo uma OS ativa (cancelada libera para abrir outra).
create unique index ordens_orcamento_ativa on ordens (orcamento_id) where orcamento_id is not null and status <> 'cancelada';

create table ordem_itens (
  id          uuid primary key default gen_random_uuid(),
  ordem_id    uuid not null references ordens (id) on delete cascade,
  posicao     integer not null,
  tipo        text not null check (tipo in ('produto', 'servico')),
  origem_id   uuid,
  descricao   text not null,
  unidade     text not null default 'UN',
  quantidade  numeric(12, 3) not null check (quantidade > 0),
  valor       integer not null default 0 check (valor >= 0),
  -- Extra apontado no pátio fica "pendente" até a recepção falar com o cliente.
  situacao    text not null default 'aprovado' check (situacao in ('aprovado', 'pendente', 'recusado')),
  criado_por  text not null default ''
);
create index ordem_itens_ordem on ordem_itens (ordem_id);

-- Linha do tempo da OS: quem fez o quê e quando.
create table ordem_eventos (
  id         uuid primary key default gen_random_uuid(),
  ordem_id   uuid not null references ordens (id) on delete cascade,
  texto      text not null,
  quem       text not null default '',
  criado_em  timestamptz not null default now()
);
create index ordem_eventos_ordem on ordem_eventos (ordem_id, criado_em);

-- Permissão nova para o trabalho no pátio. Quem já abria/atualizava OS ganha "executar";
-- o Mecânico passa a só executar (abrir, cancelar e entregar ficam com a recepção/gerência).
insert into perfil_permissoes (perfil_id, permissao)
select perfil_id, 'ordens.executar' from perfil_permissoes where permissao = 'ordens.editar'
on conflict do nothing;
delete from perfil_permissoes where perfil_id = 'mecanico' and permissao = 'ordens.editar';
