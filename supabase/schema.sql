-- VisionSpy — schema do Supabase
-- Rode este arquivo inteiro no SQL Editor do Supabase (uma vez).

-- Palavras-chave que o robô pesquisa na Biblioteca de Anúncios da Meta
create table if not exists keywords (
  id          bigserial primary key,
  term        text not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into keywords (term) values
  ('frete grátis'), ('pagamento na entrega'), ('acesso imediato'), ('compre 2 leve 3'),
  ('renda extra'), ('emagrecer'), ('pague depois'), ('últimas unidades'),
  ('garantia de 30 dias'), ('comente eu quero'), ('colágeno'), ('receitas'),
  ('menopausa'), ('dores'), ('queda de cabelo')
on conflict do nothing;

-- Anunciantes que não são ofertas modeláveis (marketplaces, grandes marcas)
create table if not exists ignored_advertisers (
  name text primary key
);

insert into ignored_advertisers (name) values
  ('Shopee'), ('Mercado Livre'), ('AliExpress'), ('InfinitePay'), ('O Boticário'),
  ('Natura'), ('Eudora'), ('Amazon.com.br'), ('Magazine Luiza'), ('SHEIN Brasil'),
  ('TikTok - LATAM'), ('TikTok Global'), ('Uber'), ('iFood para Entregadores'),
  ('Lalamove'), ('Vou de 99'), ('Sou Motorista 99'), ('Amazon Flex'), ('Inter'),
  ('Mercado Pago'), ('PicPay'), ('Ton'), ('Petlove'), ('L''Oréal Paris')
on conflict (name) do nothing;

-- Grandes marcas e varejistas vistos nas primeiras coletas (nomes de página ou domínios)
insert into ignored_advertisers (name) values
  ('Buscofem'), ('Neosaldina'), ('Doril'), ('Advil Brasil'), ('Calminex'), ('Spidufen Brasil'),
  ('La Roche-Posay'), ('Nestlé Nutre'), ('Receitas Nestlé'), ('Quaker Brasil'), ('Doritos'),
  ('Britânia Eletrodomésticos'), ('Jeep | Brasil'), ('Polishop'), ('Lojas Torra'), ('Netshoes'),
  ('Airbnb'), ('Decolar'), ('Hotels.com'), ('CNA'), ('UNIP'), ('Alpecin Brasil'), ('HOPE Underwear'),
  ('SEPHORA'), ('AREZZO'), ('Ray-Ban'), ('Hering'), ('Lenovo Brasil'), ('JBL'), ('Beleza na Web'),
  ('Life by Vivara'), ('Integralmedica Sports Nutrition'), ('Gran Cursos Online - Concursos Públicos'),
  ('Profuse'), ('Bigfral'), ('TENA Brasil'), ('SAZÓN Brasil'), ('Qualy'), ('Uber'), ('99Food'),
  ('hypera.com.br'), ('drogaraia.com.br'), ('drogasil.com.br'), ('mercadolivre.com.br'),
  ('shopee.com.br'), ('amazon.com.br'), ('magazineluiza.com.br'), ('paodeacucar.com'), ('loreal-paris.com.br')
on conflict (name) do nothing;

-- Cada anúncio visto (um registro por ID da biblioteca)
create table if not exists ads (
  library_id   text primary key,
  offer_key    text not null,
  advertiser   text not null,
  domain       text,
  body         text,
  start_date   date,
  copies       int  not null default 1,
  keywords     text[] not null default '{}',
  page_url     text,          -- página do anunciante no Facebook
  landing_url  text,          -- página de destino, sem parâmetros de rastreio
  thumb_url    text,          -- imagem do criativo (o link do Facebook expira em alguns dias)
  media_type   text,          -- image | video
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz not null default now()
);
create index if not exists ads_offer_key_idx on ads (offer_key);

-- Foto diária de cada oferta (é daqui que sai o crescimento)
create table if not exists offer_snapshots (
  day           date not null,
  offer_key     text not null,
  advertiser    text not null,
  advertisers   text[] not null default '{}',
  domain        text,
  cards         int  not null,          -- anúncios entre os mais vistos
  copies        int  not null,          -- soma de "X anúncios usam esse criativo"
  pages         int  not null default 1,-- páginas diferentes rodando a oferta
  oldest_start  date,
  keywords      text[] not null default '{}',
  sample_text   text,
  landing_url   text,
  page_url      text,
  thumb_url     text,
  primary key (day, offer_key)
);
create index if not exists offer_snapshots_key_idx on offer_snapshots (offer_key, day desc);

-- Quantidade de anúncios no Centro de Transparência do Google (por domínio)
create table if not exists google_counts (
  domain   text not null,
  day      date not null,
  ads      int  not null,
  primary key (domain, day)
);

-- Ranking "recém-cadastradas com mais reclamações" do Reclame Aqui
create table if not exists ra_new_companies (
  day         date not null,
  position    int  not null,
  name        text not null,
  slug        text,
  reputation  text,
  complaints  int  not null,
  primary key (day, name)
);

-- Registro de cada execução do robô
create table if not exists runs (
  id          bigserial primary key,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  source      text not null,
  ok          boolean,
  items       int,
  message     text
);

-- Atualização de instalações antigas (sem efeito em instalação nova)
alter table ads             add column if not exists page_url    text;
alter table ads             add column if not exists landing_url text;
alter table ads             add column if not exists thumb_url   text;
alter table ads             add column if not exists media_type  text;
alter table offer_snapshots add column if not exists landing_url text;
alter table offer_snapshots add column if not exists page_url    text;
alter table offer_snapshots add column if not exists thumb_url   text;

-- Anúncios: botão, destino e imagem guardada
alter table ads             add column if not exists cta         text;
alter table ads             add column if not exists dest_type   text;  -- site | whatsapp | instagram | formulario | mensagem | app | ligacao
alter table ads             add column if not exists thumb_path  text;  -- caminho no Storage (bucket "criativos")
alter table offer_snapshots add column if not exists dest_type   text;
create index if not exists ads_thumb_pending_idx on ads (offer_key) where thumb_path is null;

-- Item 1: chave antiga (anunciante sem site) que passou a apontar para a oferta com site
create table if not exists offer_aliases (
  alias      text primary key,
  target     text not null,
  created_at timestamptz not null default now()
);

-- Item 4: raio-X da página de vendas
create table if not exists landing_pages (
  url           text primary key,
  final_url     text,
  status        int,
  title         text,
  description   text,
  platform      text,
  checkout      text,
  prices        numeric[] not null default '{}',
  price_min     numeric,
  price_max     numeric,
  installments  text,
  cod           boolean not null default false,  -- pagamento na entrega
  has_vsl       boolean not null default false,
  has_countdown boolean not null default false,
  has_whatsapp  boolean not null default false,
  pixels        text[] not null default '{}',
  excerpt       text,
  error         text,
  checked_at    timestamptz not null default now()
);

-- Item 5: classificação da IA
create table if not exists offer_insights (
  offer_key   text primary key,
  niche       text,
  kind        text,
  audience    text,
  promise     text,
  mechanism   text,
  offer       text,
  risk        text,
  risk_reason text,
  model       text,
  input_hash  text,
  updated_at  timestamptz not null default now()
);

-- Item 8: funil de modelagem
create table if not exists offer_notes (
  offer_key  text primary key,
  status     text check (status in ('favorita', 'analisando', 'modelando', 'testando', 'descartada')),
  note       text,
  updated_at timestamptz not null default now()
);

-- Item 7: alertas já enviados (para não repetir)
create table if not exists alerts_sent (
  offer_key text not null,
  kind      text not null,
  sent_at   timestamptz not null default now(),
  primary key (offer_key, kind)
);

alter table offer_aliases  enable row level security;
alter table landing_pages  enable row level security;
alter table offer_insights enable row level security;
alter table offer_notes    enable row level security;
alter table alerts_sent    enable row level security;

-- Item 6: bucket público de criativos (só imagens pequenas em webp)
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('criativos', 'criativos', true, 1048576, array['image/webp'])
    on conflict (id) do nothing;
  end if;
end $$;

-- Item 2: mais palavras-chave de resposta direta (dá para pausar qualquer uma no painel)
insert into keywords (term) values
  ('compre 3 leve 5'), ('leve 3 pague 2'), ('kit com'), ('garantia de 7 dias'), ('oferta relâmpago'),
  ('estoque limitado'), ('frete grátis para todo o brasil'), ('aprenda a'), ('curso completo'),
  ('método'), ('suplemento'), ('cápsulas'), ('dor nas costas'), ('diabetes'), ('ansiedade'),
  ('cachorro'), ('rugas'), ('manchas')
on conflict do nothing;

-- Fase 1 (migração 005)
-- Países: cada palavra-chave é buscada num país (BR, US, GB, PT, JP...)
alter table keywords        add column if not exists country text not null default 'BR';
alter table keywords        drop constraint if exists keywords_term_key;
create unique index if not exists keywords_term_country_key on keywords (term, country);
alter table ads             add column if not exists country text not null default 'BR';
alter table offer_snapshots add column if not exists country text not null default 'BR';

-- Download em 1 clique: vídeo/imagem original guardados no bucket "midia"
alter table ads add column if not exists video_url   text;    -- link do vídeo no Facebook (expira)
alter table ads add column if not exists media_path  text;    -- arquivo original no Storage
alter table ads add column if not exists media_bytes bigint;
create index if not exists ads_last_seen_idx on ads (offer_key, last_seen desc);

-- Kit de modelagem
alter table landing_pages add column if not exists full_text text;   -- texto completo da página
alter table landing_pages add column if not exists shot_path text;   -- print da página inteira (bucket "paginas")
alter table landing_pages add column if not exists currency  text;   -- BRL, USD, GBP, EUR, JPY

create table if not exists ad_transcripts (
  library_id text primary key,
  transcript text,
  hook       text,
  structure  text,
  cta        text,
  model      text,
  created_at timestamptz not null default now()
);

create table if not exists offer_kits (
  offer_key     text primary key,
  structure     jsonb,          -- mapa da página e do funil (IA)
  model         text,
  source_hash   text,
  updated_at    timestamptz not null default now(),
  my_input      jsonb,          -- dados do produto que você preencheu
  my_version    text,           -- sua versão escrita pela IA (markdown)
  my_model      text,
  my_updated_at timestamptz
);

-- Lista de espionagem: o robô busca esses termos a cada coleta e avisa criativo novo
create table if not exists watchlist (
  id         bigserial primary key,
  offer_key  text,
  label      text not null,
  term       text not null,
  country    text not null default 'BR',
  created_at timestamptz not null default now(),
  unique (term, country)
);

alter table ad_transcripts enable row level security;
alter table offer_kits     enable row level security;
alter table watchlist      enable row level security;

-- Buckets públicos: mídia original (até 50 MB por arquivo) e prints das páginas
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('midia', 'midia', true, 52428800, array['video/mp4', 'image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('paginas', 'paginas', true, 10485760, array['image/webp', 'image/jpeg'])
    on conflict (id) do nothing;
  end if;
end $$;

-- Palavras-chave de outros países (dá para pausar qualquer uma no painel)
insert into keywords (term, country) values
  ('free shipping', 'US'), ('limited time offer', 'US'), ('buy 2 get 1 free', 'US'), ('money back guarantee', 'US'),
  ('weight loss', 'US'), ('joint pain', 'US'), ('anti aging', 'US'), ('shop now', 'US'),
  ('free uk delivery', 'GB'), ('buy one get one free', 'GB'), ('money back guarantee', 'GB'), ('limited stock', 'GB'),
  ('pagamento na entrega', 'PT'), ('portes grátis', 'PT'), ('envio grátis', 'PT'), ('compre 2 leve 3', 'PT'), ('garantia de 30 dias', 'PT'),
  ('送料無料', 'JP'), ('初回限定', 'JP'), ('定期購入', 'JP'), ('今だけ', 'JP'), ('返金保証', 'JP'), ('公式サイト限定', 'JP')
on conflict (term, country) do nothing;

-- Ranking: tudo da 004 + país, longevidade, espionagem, mídia e kit
drop view if exists offer_ranking;
create view offer_ranking with (security_invoker = true) as
with latest as (
  select distinct on (offer_key) *
  from offer_snapshots
  where day >= current_date - 3
    and offer_key not in (select alias from offer_aliases)
  order by offer_key, day desc
),
week_ago as (
  select distinct on (offer_key) offer_key, cards as cards_7d, copies as copies_7d
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
    count(*) filter (where media_path is not null) as media_count,
    (array_agg(thumb_path order by copies desc) filter (where thumb_path is not null))[1] as thumb_path
  from ads
  group by offer_key
)
select
  l.offer_key, l.advertiser, l.advertisers, l.domain, l.day as last_day,
  l.cards, l.copies, l.pages, l.oldest_start, l.keywords, l.sample_text,
  w.cards_7d, w.copies_7d,
  (l.copies - coalesce(w.copies_7d, l.copies)) as copies_growth,
  g.google_ads,
  (select min(day) from offer_snapshots s where s.offer_key = l.offer_key) as first_seen,
  ( l.copies
    + 2 * l.cards
    + 5 * greatest(l.pages - 1, 0)
    + case when coalesce(g.google_ads,0) >= 100 then 10 when coalesce(g.google_ads,0) >= 10 then 5 else 0 end
    + 2 * greatest(l.copies - coalesce(w.copies_7d, l.copies), 0)
  ) as score,
  l.landing_url, l.page_url, l.thumb_url,
  l.dest_type,
  a.thumb_path,
  lp.platform, lp.checkout, lp.price_min, lp.price_max, lp.installments, lp.cod, lp.has_vsl, lp.pixels,
  i.niche, i.kind, i.audience, i.promise, i.mechanism, i.offer, i.risk, i.risk_reason,
  n.status, n.note,
  coalesce(n.status = 'descartada', false) as discarded,
  -- novidades da Fase 1
  l.country,
  (current_date - l.oldest_start) as days_running,
  coalesce(a.ads_active, 0)   as ads_active,
  coalesce(a.long_runners, 0) as long_runners,
  coalesce(a.new_ads_7d, 0)   as new_ads_7d,
  coalesce(a.media_count, 0)  as media_count,
  (w.copies_7d is not null and l.copies - w.copies_7d <= -greatest(3, w.copies_7d * 0.3)) as cooling,
  exists (select 1 from watchlist wl where wl.offer_key = l.offer_key) as watched,
  exists (select 1 from offer_kits k where k.offer_key = l.offer_key and k.structure is not null) as has_kit,
  coalesce(lp.currency, 'BRL') as currency
from latest l
left join week_ago w using (offer_key)
left join g on g.domain = l.domain
left join a on a.offer_key = l.offer_key
left join landing_pages lp on lp.url = l.landing_url
left join offer_insights i on i.offer_key = l.offer_key
left join offer_notes n on n.offer_key = l.offer_key
-- ignorados valem na hora (sem esperar a próxima coleta): nome, parceria "X com Marca" ou domínio
where not exists (
  select 1 from ignored_advertisers ig
  where lower(ig.name) = lower(l.advertiser)
     or lower(l.advertiser) like '% com ' || lower(ig.name)
     or lower(l.advertiser) like lower(ig.name) || ' com %'
     or (position('.' in ig.name) > 0 and position(' ' in ig.name) = 0
         and (lower(l.domain) = lower(ig.name) or lower(l.domain) like '%.' || lower(ig.name)))
);

-- TikTok (migração 006)
-- Anúncios em destaque da Central de Criativos do TikTok (só os que o anunciante autorizou mostrar)
create table if not exists tiktok_top_ads (
  id           text primary key,
  country      text not null,
  ad_title     text,
  brand_name   text,
  industry_key text,
  industry     text,
  objective    text,
  likes        int,
  ctr          numeric,          -- percentil de CTR (0,93 = top 7%)
  duration     numeric,
  cover_url    text,             -- link do TikTok (expira)
  video_url    text,             -- link do TikTok (expira)
  thumb_path   text,             -- capa guardada (bucket "criativos")
  media_path   text,             -- vídeo guardado (bucket "midia")
  media_bytes  bigint,
  best_rank    int,              -- melhor posição já vista na lista
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz not null default now()
);
create index if not exists tiktok_top_ads_country_idx on tiktok_top_ads (country, last_seen desc);

-- Espionagem no TikTok: anúncios da biblioteca europeia (Reino Unido, Portugal e outros países da Europa)
create table if not exists tiktok_library_ads (
  id          text primary key,
  watch_id    bigint,
  country     text not null,
  advertiser  text,
  title       text,
  first_shown date,
  last_shown  date,
  audience    text,              -- "0-1K", "1K-10K"...
  cover_url   text,
  video_url   text,
  thumb_path  text,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);
create index if not exists tiktok_library_ads_watch_idx on tiktok_library_ads (watch_id, last_shown desc);

-- Total de anúncios do concorrente na biblioteca do TikTok, dia a dia
create table if not exists tiktok_watch_counts (
  watch_id bigint not null,
  day      date not null,
  total    int not null,
  primary key (watch_id, day)
);

alter table tiktok_top_ads      enable row level security;
alter table tiktok_library_ads  enable row level security;
alter table tiktok_watch_counts enable row level security;

-- Mineração (migração 007)

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

-- Segurança: só o service role (robô e painel no servidor) acessa as tabelas
alter table keywords            enable row level security;
alter table ignored_advertisers enable row level security;
alter table ads                 enable row level security;
alter table offer_snapshots     enable row level security;
alter table google_counts       enable row level security;
alter table ra_new_companies    enable row level security;
alter table runs                enable row level security;

-- Limpeza automática para caber no plano grátis do Supabase.
-- Oferta no funil ou na espionagem nunca é apagada.
create or replace function limpar_dados(dias_fraco int default 14, dias_total int default 60)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  guardar   text[];
  ids       text[];
  thumbs    text[];
  medias    text[];
  prints    text[];
  tt_thumbs text[];
  tt_medias text[];
  n_fotos   bigint;
  n_ads     bigint;
  n_paginas bigint;
begin
  with chaves as (
    select offer_key as k from offer_notes where status is not null and status <> 'descartada'
    union
    select offer_key from watchlist where offer_key is not null
  )
  select coalesce(array_agg(distinct k), '{}') into guardar
  from (select k from chaves union select alias from offer_aliases where target in (select k from chaves)) x;

  delete from offer_snapshots
  where (day < current_date - dias_total or (day < current_date - dias_fraco and copies < 3))
    and offer_key <> all (guardar);
  get diagnostics n_fotos = row_count;

  with fora as (
    delete from ads
    where (last_seen < now() - make_interval(days => dias_total)
           or (last_seen < now() - make_interval(days => dias_fraco) and copies < 3))
      and offer_key <> all (guardar)
    returning library_id, thumb_path, media_path
  )
  select count(*), coalesce(array_agg(library_id), '{}'),
         coalesce(array_remove(array_agg(thumb_path), null), '{}'),
         coalesce(array_remove(array_agg(media_path), null), '{}')
  into n_ads, ids, thumbs, medias
  from fora;

  delete from ad_transcripts where library_id = any (ids);

  with fora as (
    delete from landing_pages l
    where l.checked_at < now() - make_interval(days => dias_fraco)
      and not exists (select 1 from ads a where a.landing_url = l.url)
    returning shot_path
  )
  select count(*), coalesce(array_remove(array_agg(shot_path), null), '{}')
  into n_paginas, prints
  from fora;

  with fora as (
    delete from tiktok_top_ads
    where last_seen < now() - make_interval(days => dias_total)
    returning thumb_path, media_path
  )
  select coalesce(array_remove(array_agg(thumb_path), null), '{}'),
         coalesce(array_remove(array_agg(media_path), null), '{}')
  into tt_thumbs, tt_medias
  from fora;

  delete from runs where started_at < now() - interval '90 days';

  return jsonb_build_object(
    'fotos', n_fotos,
    'anuncios', n_ads,
    'paginas', n_paginas,
    'arquivos', jsonb_build_object(
      'criativos', to_jsonb(thumbs || tt_thumbs),
      'midia', to_jsonb(medias || tt_medias),
      'paginas', to_jsonb(prints)
    )
  );
end;
$$;

do $$
begin
  revoke execute on function limpar_dados(int, int) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function limpar_dados(int, int) from anon, authenticated;
    grant execute on function limpar_dados(int, int) to service_role;
  end if;
end $$;

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

-- Quantos anúncios a busca trouxe na última vez: busca vazia espera mais para repetir
alter table keyword_runs add column if not exists found int not null default 1;
