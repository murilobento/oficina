-- Agenda: carros marcados por dia e horário. Na chegada, o agendamento vira OS.
create table agendamentos (
  id           uuid primary key default gen_random_uuid(),
  data         date not null,
  hora         time not null,
  cliente_id   uuid not null references pessoas (id) on delete restrict,
  veiculo_id   uuid not null references veiculos (id) on delete restrict,
  -- Serviço previsto, ex.: "Troca de óleo", "Revisão 40 mil km".
  servico      text not null,
  observacoes  text not null default '',
  status       text not null default 'agendado' check (status in ('agendado', 'chegou', 'faltou', 'cancelado')),
  -- OS aberta quando o carro chegou.
  ordem_id     uuid references ordens (id) on delete set null,
  criado_por   text not null default '',
  criado_em    timestamptz not null default now()
);
create index agendamentos_dia on agendamentos (data, hora);

-- Links da TV do pátio: só leitura, sem login. Guarda só o hash do token (o link aparece uma vez).
create table tv_acessos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  token_hash  text not null unique,
  criado_por  text not null default '',
  criado_em   timestamptz not null default now(),
  ultimo_uso  timestamptz,
  revogado_em timestamptz
);
