-- Coleta global: palavra-chave por grupo de países e rodízio de buscas.
-- Os grupos ficam em web/lib/groups.json: o painel e o robô leem o mesmo arquivo.

-- Até onde cada busca já foi: quem ficou mais tempo sem rodar vai primeiro
create table if not exists keyword_runs (
  term     text not null,
  country  text not null,
  last_run timestamptz not null default now(),
  primary key (term, country)
);
alter table keyword_runs enable row level security;

-- País desligado: o robô não busca nele, mesmo que esteja num grupo. As palavras ficam salvas
create table if not exists paused_countries (
  country   text primary key,
  paused_at timestamptz not null default now()
);
alter table paused_countries enable row level security;
insert into paused_countries (country) values ('BR') on conflict (country) do nothing;

-- O mesmo anúncio roda em vários países: guarda todos eles
alter table ads add column if not exists countries text[] not null default '{}';
update ads set countries = array[country] where countries = '{}';
create index if not exists ads_countries_idx on ads using gin (countries);

-- Rodadas diferentes somam: o país principal fica, países e palavras acumulam
create or replace function ads_juntar() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.countries := (select coalesce(array_agg(distinct c), '{}') from unnest(old.countries || new.countries) c);
  new.keywords := (select coalesce(array_agg(distinct k), '{}') from unnest(old.keywords || new.keywords) k);
  new.best_rank := least(old.best_rank, new.best_rank);
  if new.country <> old.country then
    new.country := old.country;
    new.offer_key := old.offer_key;
  end if;
  return new;
end;
$$;
drop trigger if exists ads_juntar on ads;
create trigger ads_juntar before update on ads for each row execute function ads_juntar();

-- Várias rodadas no mesmo dia somam na foto da oferta, sem encolher o que já foi visto
create or replace function snapshots_juntar() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.cards := greatest(old.cards, new.cards);
  new.copies := greatest(old.copies, new.copies);
  new.pages := greatest(old.pages, new.pages);
  new.oldest_start := least(old.oldest_start, new.oldest_start);
  new.keywords := (select coalesce(array_agg(distinct k), '{}') from unnest(old.keywords || new.keywords) k);
  return new;
end;
$$;
drop trigger if exists snapshots_juntar on offer_snapshots;
create trigger snapshots_juntar before update on offer_snapshots for each row execute function snapshots_juntar();

-- Países novos dos grupos. Câmbio e orçamento são aproximados: ajuste quando quiser
insert into spend_model (country, currency, fx_to_brl, budget_test, budget_scale, budget_winner) values
  ('SE', 'SEK', 0.55,   150,   300,   500),
  ('NO', 'NOK', 0.52,   150,   300,   500),
  ('DK', 'DKK', 0.84,   100,   200,   350),
  ('CH', 'CHF', 6.70,    15,    30,    50),
  ('PL', 'PLN', 1.47,    40,    80,   140),
  ('NZ', 'NZD', 3.20,    25,    50,    90)
on conflict (country) do nothing;

-- Com rodízio, ativo passa a ser visto nos últimos 7 dias
drop function if exists ad_resumo_valor(text[]);
drop function if exists ad_resumo_filtros(text[]);
drop view if exists ad_paises;
drop view if exists ad_facets;
drop view if exists ad_heat;
drop view if exists ad_feed;
drop view if exists offer_trends;
drop view if exists offer_ranking;
drop view if exists ads_scored;

create view ads_scored with (security_invoker = true) as
select
  a.*,
  s.days_running,
  ad_phase(s.days_running, a.copies) as phase,
  round(ad_est_month(s.days_running, a.copies, a.best_rank, s.b_test, s.b_scale, s.b_win)) as est_month,
  s.currency as est_currency,
  round(ad_est_month(s.days_running, a.copies, a.best_rank, s.b_test, s.b_scale, s.b_win) * s.fx) as est_month_brl
from ads a
left join spend_model m on m.country = a.country
join spend_model d on d.country = '*'
cross join lateral (
  select
    greatest(current_date - coalesce(a.start_date, a.first_seen::date), 0)::int as days_running,
    coalesce(m.currency, d.currency) as currency,
    coalesce(m.fx_to_brl, d.fx_to_brl) as fx,
    coalesce(m.budget_test, d.budget_test) as b_test,
    coalesce(m.budget_scale, d.budget_scale) as b_scale,
    coalesce(m.budget_winner, d.budget_winner) as b_win
) s;

-- Tela principal: um registro por criativo ativo
create view ad_feed with (security_invoker = true) as
with ig as (
  select
    array_agg(lower(name)) as nomes,
    '(^|\.)(' || string_agg(regexp_replace(lower(name), '([^a-z0-9])', '\\\1', 'g'), '|')
      filter (where position('.' in name) > 0 and position(' ' in name) = 0) || ')$' as dominios
  from ignored_advertisers
)
select
  a.library_id, a.offer_key, a.advertiser, a.domain, a.body, a.start_date, a.copies, a.keywords,
  a.page_url, a.landing_url, a.thumb_url, a.thumb_path, a.media_type, a.media_path, a.video_url, a.cta,
  a.dest_type, a.country, a.countries, a.first_seen, a.last_seen, a.best_rank, a.body_hash,
  a.days_running, a.phase, a.est_month, a.est_currency, a.est_month_brl,
  -- valor arredondado em passos pequenos: a tela encaixa nas faixas da moeda escolhida
  round(exp(round((ln(greatest(a.est_month_brl, 1)::float8) * 6)::numeric) / 6)::numeric) as heat_v,
  i.niche, i.kind, i.promise, i.risk, n.status,
  coalesce(g.ads, 0) >= 1000 as big_brand
from ads_scored a
left join offer_insights i on i.offer_key = a.offer_key
left join offer_notes n on n.offer_key = a.offer_key
left join lateral (
  select gc.ads from google_counts gc
  where gc.domain = regexp_replace(a.offer_key, '^([a-z]{2}:)?d:', '')
  order by gc.day desc limit 1
) g on true
cross join ig
where a.last_seen >= now() - interval '7 days'
  and coalesce(n.status, '') <> 'descartada'
  -- ignorados valem na hora: nome, parceria "X com Marca" ou domínio
  and not (string_to_array(lower(a.advertiser), ' com ') && ig.nomes)
  and not coalesce(lower(a.domain) ~ ig.dominios, false);

create view offer_trends with (security_invoker = true) as
select offer_key, array_agg(copies order by day) as points
from offer_snapshots
where day >= current_date - 13
group by offer_key;

-- Ranking: tudo da 005 + investimento estimado, momentum, clones e marca grande
create view offer_ranking with (security_invoker = true) as
with ig as (
  select
    array_agg(lower(name)) as nomes,
    '(^|\.)(' || string_agg(regexp_replace(lower(name), '([^a-z0-9])', '\\\1', 'g'), '|')
      filter (where position('.' in name) > 0 and position(' ' in name) = 0) || ')$' as dominios
  from ignored_advertisers
),
latest as (
  select distinct on (offer_key) *
  from offer_snapshots
  where day >= current_date - 7
    and offer_key not in (select alias from offer_aliases)
  order by offer_key, day desc
),
week_ago as (
  select distinct on (offer_key) offer_key, cards as cards_7d, copies as copies_7d, pages as pages_7d
  from offer_snapshots
  where day <= current_date - 6
  order by offer_key, day desc
),
g as (
  select distinct on (domain) domain, ads as google_ads
  from google_counts
  order by domain, day desc
),
a as (
  select
    offer_key,
    count(*) filter (where last_seen >= now() - interval '7 days') as ads_active,
    count(*) filter (where last_seen >= now() - interval '7 days' and start_date <= current_date - 30) as long_runners,
    count(*) filter (where first_seen >= now() - interval '7 days') as new_ads_7d,
    -- pela data que a própria Meta mostra: não muda quando você adiciona palavra-chave
    count(*) filter (where last_seen >= now() - interval '7 days' and start_date >= current_date - 7) as launched_7d,
    count(*) filter (where media_path is not null) as media_count,
    coalesce(sum(est_month) filter (where last_seen >= now() - interval '7 days'), 0) as est_month,
    coalesce(sum(est_month_brl) filter (where last_seen >= now() - interval '7 days'), 0) as est_month_brl,
    (array_agg(thumb_path order by copies desc) filter (where thumb_path is not null))[1] as thumb_path,
    (array_agg(phase order by case phase when 'vencedor' then 0 when 'escalando' then 1 else 2 end)
      filter (where last_seen >= now() - interval '7 days'))[1] as phase
  from ads_scored
  group by offer_key
),
c as (
  select x.offer_key, count(distinct y.offer_key) as clones
  from ads x
  join ads y on y.body_hash = x.body_hash and y.offer_key <> x.offer_key
  where length(x.body) >= 60
    and x.last_seen >= now() - interval '14 days'
    and y.last_seen >= now() - interval '14 days'
  group by x.offer_key
)
select
  l.offer_key, l.advertiser, l.advertisers, l.domain, l.day as last_day,
  l.cards, l.copies, l.pages, l.oldest_start, l.keywords, l.sample_text,
  w.cards_7d, w.copies_7d,
  (l.copies - coalesce(w.copies_7d, l.copies)) as copies_growth,
  gc.google_ads,
  (select min(day) from offer_snapshots s where s.offer_key = l.offer_key) as first_seen,
  ( l.copies
    + 2 * l.cards
    + 5 * greatest(l.pages - 1, 0)
    + case when coalesce(gc.google_ads,0) >= 100 then 10 when coalesce(gc.google_ads,0) >= 10 then 5 else 0 end
    + 2 * greatest(l.copies - coalesce(w.copies_7d, l.copies), 0)
  ) as score,
  l.landing_url, l.page_url, l.thumb_url,
  l.dest_type,
  a.thumb_path,
  lp.platform, lp.checkout, lp.price_min, lp.price_max, lp.installments, lp.cod, lp.has_vsl, lp.pixels,
  i.niche, i.kind, i.audience, i.promise, i.mechanism, i.offer, i.risk, i.risk_reason,
  n.status, n.note,
  coalesce(n.status = 'descartada', false) as discarded,
  l.country,
  (current_date - l.oldest_start) as days_running,
  coalesce(a.ads_active, 0)   as ads_active,
  coalesce(a.long_runners, 0) as long_runners,
  coalesce(a.new_ads_7d, 0)   as new_ads_7d,
  coalesce(a.media_count, 0)  as media_count,
  (w.copies_7d is not null and l.copies - w.copies_7d <= -greatest(3, w.copies_7d * 0.3)) as cooling,
  exists (select 1 from watchlist wl where wl.offer_key = l.offer_key) as watched,
  exists (select 1 from offer_kits k where k.offer_key = l.offer_key and k.structure is not null) as has_kit,
  coalesce(lp.currency, 'BRL') as currency,
  -- novidades da 007
  coalesce(a.launched_7d, 0)   as launched_7d,
  coalesce(a.est_month, 0)     as est_month,
  coalesce(a.est_month_brl, 0) as est_month_brl,
  coalesce(m.currency, d.currency) as est_currency,
  coalesce(a.phase, 'teste')   as phase,
  coalesce(c.clones, 0)        as clones,
  coalesce(gc.google_ads, 0) >= 1000 as big_brand,
  -- criativos lançados na semana + cópias ganhas + páginas ganhas. Oferta nova de verdade conta
  -- tudo como ganho; oferta antiga recém-descoberta não, para palavra-chave nova não virar "disparo".
  ( 3 * coalesce(a.launched_7d, 0)
    + 2 * case
        when w.copies_7d is not null then greatest(l.copies - w.copies_7d, 0)
        when l.oldest_start >= current_date - 14 then l.copies
        else 0
      end
    + 5 * greatest(l.pages - coalesce(w.pages_7d, l.pages), 0)
  ) as momentum
from latest l
left join week_ago w using (offer_key)
left join g gc on gc.domain = l.domain
left join a on a.offer_key = l.offer_key
left join c on c.offer_key = l.offer_key
left join landing_pages lp on lp.url = l.landing_url
left join offer_insights i on i.offer_key = l.offer_key
left join offer_notes n on n.offer_key = l.offer_key
left join spend_model m on m.country = l.country
join spend_model d on d.country = '*'
cross join ig
-- ignorados valem na hora (sem esperar a próxima coleta): nome, parceria "X com Marca" ou domínio
where not (string_to_array(lower(l.advertiser), ' com ') && ig.nomes)
  and not coalesce(lower(l.domain) ~ ig.dominios, false)
-- o anúncio fica na oferta do primeiro país: a foto repetida em outro país não vira oferta vazia
and coalesce(a.ads_active, 0) > 0;

-- Contagens da tela de mineração, sem repetir anúncio que roda em vários países
create view ad_paises with (security_invoker = true) as
select c as country, count(*)::int as ads
from ad_feed f
cross join lateral unnest(f.countries) c
where not f.big_brand
group by c;

create or replace function ad_resumo_valor(paises text[] default null)
returns table (heat_v numeric, ads int)
language sql stable
set search_path = public
as $$
  select f.heat_v, count(*)::int
  from ad_feed f
  where not f.big_brand and (paises is null or f.countries && paises)
  group by f.heat_v
$$;

create or replace function ad_resumo_filtros(paises text[] default null)
returns table (niche text, phase text, ads int)
language sql stable
set search_path = public
as $$
  select f.niche, f.phase, count(*)::int
  from ad_feed f
  where not f.big_brand and (paises is null or f.countries && paises)
  group by f.niche, f.phase
$$;

do $$
begin
  revoke execute on function ad_resumo_valor(text[]) from public;
  revoke execute on function ad_resumo_filtros(text[]) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function ad_resumo_valor(text[]) from anon, authenticated;
    revoke execute on function ad_resumo_filtros(text[]) from anon, authenticated;
    grant execute on function ad_resumo_valor(text[]) to service_role;
    grant execute on function ad_resumo_filtros(text[]) to service_role;
  end if;
end $$;
