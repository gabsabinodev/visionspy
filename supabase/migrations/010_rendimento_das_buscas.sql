-- Quantos anúncios a busca trouxe na última vez: busca vazia espera mais para repetir
alter table keyword_runs add column if not exists found int not null default 1;
