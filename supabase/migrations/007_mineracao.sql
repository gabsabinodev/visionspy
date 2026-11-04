-- Migração 007: mineração por investimento estimado, momentum real, clones e mesma operação.
-- Pode rodar mais de uma vez sem problema.

-- Posição do anúncio na busca (a Meta devolve os mais vistos primeiro: é um sinal real de entrega)
alter table ads add column if not exists best_rank int;
-- Texto normalizado: o mesmo anúncio em lojas diferentes cai no mesmo hash (mostra quem copiou quem)
alter table ads add column if not exists body_hash text
  generated always as (md5(left(regexp_replace(lower(coalesce(body, '')), '[^[:alnum:]]+', ' ', 'g'), 160))) stored;
create index if not exists ads_body_hash_idx on ads (body_hash);
create index if not exists ads_active_idx on ads (country, last_seen desc);

-- IDs de pixel/GTM da página: duas lojas com o mesmo ID costumam ser da mesma operação
alter table landing_pages add column if not exists tracking_ids text[] not null default '{}';
create index if not exists landing_pages_tracking_idx on landing_pages using gin (tracking_ids);

-- Modelo do investimento estimado. Nenhuma biblioteca mostra o gasto real de anúncio comercial no
-- Brasil, então a conta é: cópias × orçamento diário por cópia × dias no ar nos últimos 30.
-- Ajuste os valores aqui quando tiver referência melhor: o painel recalcula na hora.
create table if not exists spend_model (
  country        text primary key,   -- "*" vale para qualquer país sem linha própria
  currency       text not null,
  fx_to_brl      numeric not null,   -- só para comparar países; ajuste de vez em quando
  budget_test    numeric not null,   -- orçamento diário por cópia, na moeda local
  budget_scale   numeric not null,
  budget_winner  numeric not null
);
alter table spend_model enable row level security;

insert into spend_model (country, currency, fx_to_brl, budget_test, budget_scale, budget_winner) values
  ('*',  'USD', 5.40,   20,   40,   70),
  ('BR', 'BRL', 1,      30,   60,  100),
  ('US', 'USD', 5.40,   20,   40,   70),
  ('CA', 'CAD', 3.90,   25,   50,   90),
  ('AU', 'AUD', 3.55,   25,   50,   90),
  ('GB', 'GBP', 7.20,   15,   30,   50),
  ('PT', 'EUR', 6.25,   10,   20,   35),
  ('ES', 'EUR', 6.25,   10,   20,   35),
  ('FR', 'EUR', 6.25,   15,   30,   50),
  ('DE', 'EUR', 6.25,   15,   30,   50),
  ('IT', 'EUR', 6.25,   12,   25,   40),
  ('NL', 'EUR', 6.25,   15,   30,   50),
  ('BE', 'EUR', 6.25,   15,   30,   50),
  ('IE', 'EUR', 6.25,   15,   30,   50),
  ('AT', 'EUR', 6.25,   15,   30,   50),
  ('MX', 'MXN', 0.30,  150,  300,  500),
  ('JP', 'JPY', 0.036, 2000, 4000, 7000)
on conflict (country) do nothing;

-- Palavras-chave da Europa: resposta direta no idioma de cada país (dá para pausar no painel)
insert into keywords (term, country) values
  ('envío gratis', 'ES'), ('pago contra reembolso', 'ES'), ('compra 2 lleva 3', 'ES'), ('oferta limitada', 'ES'), ('garantía de 30 días', 'ES'), ('últimas unidades', 'ES'),
  ('livraison gratuite', 'FR'), ('paiement à la livraison', 'FR'), ('offre limitée', 'FR'), ('satisfait ou remboursé', 'FR'), ('stock limité', 'FR'), ('1 acheté 1 offert', 'FR'),
  ('kostenloser versand', 'DE'), ('kauf auf rechnung', 'DE'), ('nur heute', 'DE'), ('geld-zurück-garantie', 'DE'), ('begrenzte stückzahl', 'DE'), ('jetzt bestellen', 'DE'),
  ('spedizione gratuita', 'IT'), ('pagamento alla consegna', 'IT'), ('offerta limitata', 'IT'), ('soddisfatti o rimborsati', 'IT'), ('ultimi pezzi', 'IT'), ('solo oggi', 'IT'),
  ('gratis verzending', 'NL'), ('niet goed geld terug', 'NL'), ('beperkte voorraad', 'NL'), ('op is op', 'NL'),
  ('next day delivery', 'GB'), ('30 day guarantee', 'GB')
on conflict (term, country) do nothing;

-- Fase do anúncio: mesma lógica de "dias no ar + conjuntos" das ferramentas de mineração
create or replace function ad_phase(days int, copies int) returns text
language sql immutable as $$
  select case
    when days >= 30 and copies >= 6 then 'vencedor'
    when (copies >= 3 and days >= 3) or (copies >= 2 and days >= 14) then 'escalando'
    else 'teste'
  end
$$;

create or replace function ad_est_month(days int, copies int, rank int, b_test numeric, b_scale numeric, b_win numeric) returns numeric
language sql immutable as $$
  select copies
    * case ad_phase(days, copies) when 'vencedor' then b_win when 'escalando' then b_scale else b_test end
    * least(days + 1, 30)
    * case when rank <= 10 then 1.5 when rank <= 50 then 1.2 else 1 end
$$;

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
select
  a.library_id, a.offer_key, a.advertiser, a.domain, a.body, a.start_date, a.copies, a.keywords,
  a.page_url, a.landing_url, a.thumb_url, a.thumb_path, a.media_type, a.media_path, a.video_url, a.cta,
  a.dest_type, a.country, a.first_seen, a.last_seen, a.best_rank, a.body_hash,
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
where a.last_seen >= now() - interval '3 days'
  and coalesce(n.status, '') <> 'descartada'
  and not exists (
    select 1 from ignored_advertisers ig
    where lower(ig.name) = lower(a.advertiser)
       or lower(a.advertiser) like '% com ' || lower(ig.name)
       or lower(a.advertiser) like lower(ig.name) || ' com %'
       or (position('.' in ig.name) > 0 and position(' ' in ig.name) = 0
           and (lower(a.domain) = lower(ig.name) or lower(a.domain) like '%.' || lower(ig.name)))
  );

-- Contagens leves para os filtros (o Supabase corta respostas em 1000 linhas)
create view ad_heat with (security_invoker = true) as
select country, heat_v, count(*)::int as ads from ad_feed where not big_brand group by country, heat_v;

create view ad_facets with (security_invoker = true) as
select country, niche, phase, count(*)::int as ads from ad_feed where not big_brand group by country, niche, phase;

create view offer_trends with (security_invoker = true) as
select offer_key, array_agg(copies order by day) as points
from offer_snapshots
where day >= current_date - 13
group by offer_key;

-- Ranking: tudo da 005 + investimento estimado, momentum, clones e marca grande
create view offer_ranking with (security_invoker = true) as
with latest as (
  select distinct on (offer_key) *
  from offer_snapshots
  where day >= current_date - 3
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
    count(*) filter (where last_seen >= now() - interval '3 days') as ads_active,
    count(*) filter (where last_seen >= now() - interval '3 days' and start_date <= current_date - 30) as long_runners,
    count(*) filter (where first_seen >= now() - interval '7 days') as new_ads_7d,
    -- pela data que a própria Meta mostra: não muda quando você adiciona palavra-chave
    count(*) filter (where last_seen >= now() - interval '3 days' and start_date >= current_date - 7) as launched_7d,
    count(*) filter (where media_path is not null) as media_count,
    coalesce(sum(est_month) filter (where last_seen >= now() - interval '3 days'), 0) as est_month,
    coalesce(sum(est_month_brl) filter (where last_seen >= now() - interval '3 days'), 0) as est_month_brl,
    (array_agg(thumb_path order by copies desc) filter (where thumb_path is not null))[1] as thumb_path,
    (array_agg(phase order by case phase when 'vencedor' then 0 when 'escalando' then 1 else 2 end)
      filter (where last_seen >= now() - interval '3 days'))[1] as phase
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
-- ignorados valem na hora (sem esperar a próxima coleta): nome, parceria "X com Marca" ou domínio
where not exists (
  select 1 from ignored_advertisers ig
  where lower(ig.name) = lower(l.advertiser)
     or lower(l.advertiser) like '% com ' || lower(ig.name)
     or lower(l.advertiser) like lower(ig.name) || ' com %'
     or (position('.' in ig.name) > 0 and position(' ' in ig.name) = 0
         and (lower(l.domain) = lower(ig.name) or lower(l.domain) like '%.' || lower(ig.name)))
);

-- Buscas salvas: guardam só os filtros da URL
create table if not exists saved_views (
  id         bigserial primary key,
  name       text not null,
  page       text not null default '/',
  query      text not null default '',
  created_at timestamptz not null default now()
);
alter table saved_views enable row level security;
