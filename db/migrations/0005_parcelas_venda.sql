-- Crédito parcelado no cartão (só informativo) e parcelas do saldo a receber.
alter table venda_pagamentos add column parcelas_cartao smallint check (parcelas_cartao between 1 and 12);

create table venda_parcelas (
  id          uuid primary key default gen_random_uuid(),
  venda_id    uuid not null references vendas (id) on delete cascade,
  numero      smallint not null check (numero >= 1),
  vencimento  date not null,
  valor       integer not null check (valor > 0),
  unique (venda_id, numero)
);
create index venda_parcelas_venda on venda_parcelas (venda_id);
create index venda_parcelas_vencimento on venda_parcelas (vencimento);

-- Saldo que já existe vira 1 parcela vencendo 30 dias depois da venda. Mesmo arredondamento do aplicativo.
insert into venda_parcelas (venda_id, numero, vencimento, valor)
select v.id, 1, (v.criado_em::date + 30), t.total - v.ajuste - coalesce(pg.pago, 0)
from vendas v
join lateral (
  select s.subtotal - least(s.subtotal, greatest(0,
    case when v.desconto_tipo = 'percentual'
         then floor(s.subtotal * least(greatest(v.desconto, 0), 100)::float8 / 100 + 0.5)::integer
         else v.desconto::integer end
  )) as total
  from (select coalesce(sum(floor(i.quantidade::float8 * i.valor + 0.5)), 0)::integer as subtotal from venda_itens i where i.venda_id = v.id) s
) t on true
left join lateral (select sum(valor)::integer as pago from venda_pagamentos p where p.venda_id = v.id and p.estornado_em is null) pg on true
where v.status = 'concluida' and t.total - v.ajuste - coalesce(pg.pago, 0) > 0;
