-- Auditoria: registro das ações sensíveis (dinheiro, estoque, preços, exclusões, acessos e login).
-- Só recebe inserções: a API não tem rota para alterar nem apagar registros.
create table auditoria (
  id          uuid primary key default gen_random_uuid(),
  criado_em   timestamptz not null default now(),
  -- Nulo quando não há sessão (ex.: senha errada).
  usuario_id  text,
  -- Nome na hora da ação: continua legível se o funcionário for renomeado ou excluído.
  usuario     text not null default '',
  categoria   text not null check (categoria in ('dinheiro', 'estoque', 'precos', 'documentos', 'cadastros', 'acesso', 'login')),
  -- Chave estável da ação, ex.: 'venda.cancelada'.
  acao        text not null,
  -- Frase pronta para a tela, ex.: 'Cancelou a venda VND-0012 (R$ 450,00).'
  descricao   text not null,
  alvo_tipo   text,
  alvo_id     text,
  -- { antes, depois } campo a campo, ou extras (motivo, valor, e-mail tentado).
  detalhes    jsonb,
  ip          text
);
create index auditoria_data on auditoria (criado_em desc, id desc);
create index auditoria_categoria on auditoria (categoria, criado_em desc);
create index auditoria_usuario on auditoria (usuario_id, criado_em desc);
