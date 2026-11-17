-- Códigos automáticos de produtos (PRD-0001) e serviços (SRV-001) quando o cadastro não informa um.
create sequence produto_codigo_seq;
create sequence servico_codigo_seq;

-- Numeração com zeros à esquerda que não corta ao passar da largura (lpad cortaria 1000 em 100).
create function numero_com_zeros(prefixo text, n bigint, largura integer) returns text
language sql immutable as $$
  select prefixo || case when length(n::text) >= largura then n::text else lpad(n::text, largura, '0') end
$$;

alter table orcamentos alter column numero set default numero_com_zeros('ORC-', nextval('orcamento_numero_seq'), 4);
alter table vendas     alter column numero set default numero_com_zeros('VND-', nextval('venda_numero_seq'), 4);
alter table compras    alter column numero set default numero_com_zeros('CMP-', nextval('compra_numero_seq'), 4);
alter table acertos    alter column numero set default numero_com_zeros('ACE-', nextval('acerto_numero_seq'), 4);
