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
