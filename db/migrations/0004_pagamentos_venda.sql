-- Pagamentos da venda: várias formas por venda, saldo em aberto e estorno.
-- Valores em centavos. `ajuste` é o desconto dado no acerto, quando o cliente pagou menos e a oficina perdoou a diferença.
alter table vendas add column ajuste integer not null default 0 check (ajuste >= 0);
alter table vendas alter column forma_pagamento drop not null;

create table venda_pagamentos (
  id           uuid primary key default gen_random_uuid(),
  venda_id     uuid not null references vendas (id) on delete cascade,
  forma        text not null check (forma in ('dinheiro', 'pix', 'debito', 'credito')),
  valor        integer not null check (valor > 0),
  criado_em    timestamptz not null default now(),
  criado_por   text,
  estornado_em timestamptz
);
create index venda_pagamentos_venda on venda_pagamentos (venda_id);

-- Vendas antigas concluídas: um pagamento com o total da venda. O arredondamento imita o do aplicativo
-- (calcularTotais: Math.round em ponto flutuante, .5 para cima).
-- "A prazo" (fiado) de cliente cadastrado fica sem pagamento = saldo em aberto. Venda sem cliente não pode ficar
-- devendo (ninguém para cobrar): entra como paga em dinheiro.
insert into venda_pagamentos (venda_id, forma, valor, criado_em)
select v.id,
       case when v.forma_pagamento in ('dinheiro', 'pix', 'debito', 'credito') then v.forma_pagamento else 'dinheiro' end,
       t.total, v.criado_em
from vendas v
join lateral (
  select s.subtotal - least(s.subtotal, greatest(0,
    case when v.desconto_tipo = 'percentual'
         then floor(s.subtotal * least(greatest(v.desconto, 0), 100)::float8 / 100 + 0.5)::integer
         else v.desconto::integer end
  )) as total
  from (select coalesce(sum(floor(i.quantidade::float8 * i.valor + 0.5)), 0)::integer as subtotal from venda_itens i where i.venda_id = v.id) s
) t on true
where v.status = 'concluida' and t.total > 0
  and (v.forma_pagamento in ('dinheiro', 'pix', 'debito', 'credito') or v.cliente_id is null);
