-- Ordem dos produtos dentro do acerto (como nos demais documentos).
alter table acerto_itens add column posicao integer not null default 0;
