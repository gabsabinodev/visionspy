import Link from "next/link";
import { Suspense } from "react";
import { COUNTRIES, countryName, creativeSrc, db, DEFAULT_PAIS, defaultMoeda, DEST_LABEL, fmtDate, groupOptions, inPais, KIND_LABEL, libraryLink, paisList, priceRange, scopeList, shortUrl, type DestType, type OfferRow } from "@/lib/db";
import { countAll, countBig, hrefWith, isFiltered, LENSES, PAGE_SIZE, parseFilters, queryOffers, STRONG_SIGNAL, type Filters, type Lens, type SortKey } from "@/lib/query";
import { fmtMoney, heatColor, heatOf, heatText, PHASE_LABEL } from "@/lib/spend";
import { ignoreAdvertiser, setStatus, toggleFavorite, toggleWatch } from "../actions";
import { CopyButton, Thumb } from "../bits";
import { FilterBar } from "../filter-bar";
import { Icon } from "../icons";
import { Spark } from "../spark";
import { TriageKeys } from "../triage-keys";

export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;
type FacetRow = Pick<OfferRow, "keywords" | "niche" | "kind" | "dest_type" | "checkout" | "platform" | "country">;

/** Cabeçalho que ordena ao clicar (segundo clique inverte). */
function SortTh({ f, k, label, num, title }: { f: Filters; k: SortKey; label: string; num?: boolean; title?: string }) {
  const active = f.sort === k;
  const nextDir = active ? (f.dir === "desc" ? "asc" : "desc") : ["nome", "desde", "preco"].includes(k) ? "asc" : "desc";
  return (
    <th className={num ? "n" : undefined} aria-sort={active ? (f.dir === "asc" ? "ascending" : "descending") : undefined} title={title}>
      <Link className={`sort${active ? " on" : ""}`} href={hrefWith(f, { sort: k, dir: nextDir, limit: PAGE_SIZE })} scroll={false}>{label}</Link>
    </th>
  );
}

/** Conta valores para os seletores de filtro (só mostra opções que existem). */
function facet(rows: FacetRow[], pick: (r: FacetRow) => (string | null)[], label: (v: string) => string = (v) => v) {
  const m = new Map<string, number>();
  for (const r of rows) for (const v of new Set(pick(r))) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value, count]) => ({ value, label: label(value), count }));
}

export default async function Ofertas({ searchParams }: { searchParams: Search }) {
  const f = parseFilters(await searchParams);
  const client = db();

  const [{ offers, error, total }, withWeak, { data: kws }, { data: allRows }] = await Promise.all([
    queryOffers(client, f),
    countAll(client, f),
    client.from("keywords").select("term, country").eq("active", true).order("term"),
    client.from("offer_ranking").select("keywords, niche, kind, dest_type, checkout, platform, country").eq("discarded", false).or(STRONG_SIGNAL).limit(1000),
  ]);

  if (error) {
    return (
      <div className="notice bad">
        <b>Não consegui ler as ofertas.</b>
        <p>{error.message}</p>
        <p>Confira SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel. Se a instalação for antiga, rode a migração 007 no Supabase.</p>
      </div>
    );
  }

  const [hiddenBig, { data: trendRows }] = await Promise.all([
    countBig(client, f, total),
    offers.length ? client.from("offer_trends").select("offer_key, points").in("offer_key", offers.map((o) => o.offer_key)) : Promise.resolve({ data: [] }),
  ]);
  const trends = new Map(((trendRows ?? []) as { offer_key: string; points: number[] }[]).map((t) => [t.offer_key, t.points]));

  const everyRow = (allRows ?? []) as FacetRow[];
  const byCountry = new Map<string, number>();
  for (const r of everyRow) byCountry.set(r.country ?? "BR", (byCountry.get(r.country ?? "BR") ?? 0) + 1);
  const allKws = (kws ?? []) as { term: string; country: string | null }[];
  const countryOpts = [
    { value: DEFAULT_PAIS, label: "Todos os países", count: 0 },
    ...groupOptions(),
    ...[...new Set([...Object.keys(COUNTRIES), ...byCountry.keys()])]
      .sort((a, b) => (byCountry.get(b) ?? 0) - (byCountry.get(a) ?? 0) || countryName(a).localeCompare(countryName(b)))
      .map((c) => ({ value: c, label: countryName(c), count: byCountry.get(c) ?? 0 })),
  ];
  const rows = everyRow.filter((r) => inPais(f.pais, r.country));
  const currencySymbol = new Intl.NumberFormat("en-US", { style: "currency", currency: f.pais === "todos" ? "USD" : defaultMoeda(f.pais) }).formatToParts(0).find((p) => p.type === "currency")?.value ?? "R$";
  const counts = new Map<string, number>();
  for (const r of rows) for (const k of r.keywords ?? []) counts.set(k, (counts.get(k) ?? 0) + 1);
  const terms = [...new Set(allKws.filter((k) => scopeList((k.country || "BR").toUpperCase()).some((c) => inPais(f.pais, c))).map((k) => k.term))];
  const keywordChips = terms.map((term) => ({ term, count: counts.get(term) ?? 0 })).filter((k) => k.count > 0 || k.term === f.kw).sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));
  const facets = {
    nicho: facet(rows, (r) => [r.niche]),
    tipo: facet(rows, (r) => [r.kind], (v) => KIND_LABEL[v] ?? v),
    destino: facet(rows, (r) => [r.dest_type], (v) => DEST_LABEL[v as DestType] ?? v),
    checkout: facet(rows, (r) => [r.checkout, r.platform]),
  };

  const filtered = isFiltered(f);
  const hiddenWeak = withWeak === null ? 0 : Math.max(withWeak - total, 0);
  const exportHref = hrefWith({ ...f, limit: PAGE_SIZE }, {}, "/api/export");

  return (
    <>
      <header className="page-head compact">
        <h1>Ofertas</h1>
        <p>A operação inteira, somando todos os criativos, páginas e canais.</p>
      </header>

      <nav className="lenses" aria-label="Recorte">
        {(Object.keys(LENSES) as Lens[]).map((l) => (
          <Link key={l} href={hrefWith(f, { lente: l, limit: PAGE_SIZE })} scroll={false} aria-current={f.lente === l ? "true" : undefined} title={LENSES[l].hint}>{LENSES[l].label}</Link>
        ))}
      </nav>

      <Suspense>
        <FilterBar countries={countryOpts} currencySymbol={currencySymbol} keywords={keywordChips} facets={facets} exportHref={exportHref} />
      </Suspense>

      <div className="grid">
        <table className="ranking">
          <thead>
            <tr>
              <SortTh f={f} k="nome" label="Oferta" />
              <SortTh f={f} k="invest" label="Investimento" num title="Estimativa mensal somando os criativos ativos. É modelo, não gasto real." />
              <SortTh f={f} k="momentum" label="Tendência" num title="Criativos lançados na semana + cópias ganhas + páginas novas" />
              <SortTh f={f} k="lancados" label="Novos 7d" num title="Criativos que entraram no ar nos últimos 7 dias, pela data da Meta" />
              <SortTh f={f} k="copias" label="Cópias" num title="Soma de 'X anúncios usam esse criativo'" />
              <SortTh f={f} k="desde" label="No ar" title="Anúncio ativo mais antigo" />
              <SortTh f={f} k="preco" label="Página" title="Ordena pelo menor preço encontrado na página" />
              <th><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => {
              const price = priceRange(o.price_min, o.price_max, o.currency);
              const t = heatOf(o.est_month_brl);
              const href = `/oferta/${encodeURIComponent(o.offer_key)}`;
              const inFunnel = !!o.status && o.status !== "favorita";
              return (
                <tr key={o.offer_key} data-row className={o.status ? `st-${o.status}` : undefined}>
                  <td>
                    <div className="offer-cell">
                    <Thumb src={creativeSrc(o.thumb_path, o.thumb_url)} alt={`Criativo de ${o.advertiser}`} />
                    <div className="offer-main">
                      <div className="offer-title">
                        <Link className="offer-name" href={href} data-act="open">{o.advertiser}</Link>
                        {paisList(f.pais)?.length !== 1 && <span className="country-tag" title={countryName(o.country)}>{o.country}</span>}
                        {o.domain && <span className="domain">{o.domain}</span>}
                      </div>
                      <div className="snippet">{o.promise ?? o.sample_text?.slice(0, 110)}</div>
                      <div className="badges">
                        <span className={`phase inline ph-${o.phase}`}>{PHASE_LABEL[o.phase]}</span>
                        {o.niche && <Link className="tag" href={hrefWith(f, { nicho: o.niche, limit: PAGE_SIZE })} scroll={false}>{o.niche}</Link>}
                        {o.clones > 0 && <span className="tag hot" title={`Mesmo texto de anúncio em mais ${o.clones} ${o.clones === 1 ? "oferta" : "ofertas"}: costuma ser produto validado`}>{o.clones} {o.clones === 1 ? "clone" : "clones"}</span>}
                        {o.cooling && <span className="tag cold" title="Cópias caindo forte contra 7 dias atrás">Esfriando</span>}
                        {o.pixels?.includes("TikTok") && <span className="tag" title="A página tem o pixel do TikTok: provavelmente roda TikTok Ads">TikTok</span>}
                        {o.pixels?.includes("Kwai") && <span className="tag" title="A página tem o pixel do Kwai: provavelmente roda Kwai Ads">Kwai</span>}
                        {o.has_kit && <Link className="tag" href={`${href}#kit`} title="A IA já mapeou a página desta oferta">Mapa da página</Link>}
                        {o.risk === "alto" && <span className="tag warn" title={o.risk_reason ?? "Promessa arriscada para as políticas de anúncio"}>Risco alto</span>}
                        {inFunnel && <span className="tag on">{o.status}</span>}
                      </div>
                    </div>
                    </div>
                  </td>
                  <td data-label="Investimento" className="n invest-cell" style={{ ["--heat" as string]: heatColor(t), ["--heat-text" as string]: heatText(t), ["--fill" as string]: `${Math.max(t * 100, 3)}%` }}>
                    <b>{fmtMoney(o.est_month, o.est_currency)}</b>
                    <span className="ad-meter" aria-hidden="true"><i /></span>
                  </td>
                  <td data-label="Cópias em 14 dias" className="n trend-cell">
                    <Spark points={trends.get(o.offer_key) ?? []} />
                    {o.copies_7d === null ? <span className="delta new">nova</span>
                      : o.copies_growth > 0 ? <span className="delta up">+{o.copies_growth}</span>
                      : o.copies_growth < 0 ? <span className="delta down">{o.copies_growth}</span>
                      : <span className="delta">0</span>}
                  </td>
                  <td data-label="Novos 7d" className="n">{o.launched_7d > 0 ? <span className="up">+{o.launched_7d}</span> : <span className="dim">0</span>}</td>
                  <td data-label="Cópias" className="n">{o.copies}</td>
                  <td data-label="No ar" className="date">
                    {o.days_running ?? "?"} dias
                    <div className="sub">{fmtDate(o.oldest_start)}</div>
                  </td>
                  <td className="landing">
                    {o.landing_url ? (
                      <span className="landing-wrap">
                        <a href={o.landing_url} target="_blank" rel="noreferrer noopener" title={o.landing_url}>{shortUrl(o.landing_url, 24)}</a>
                        <CopyButton text={o.landing_url} />
                      </span>
                    ) : (
                      <span className="dim">{o.dest_type && o.dest_type !== "site" ? `Via ${DEST_LABEL[o.dest_type]}` : "Sem link"}</span>
                    )}
                    {(price || o.checkout || o.platform || o.cod || o.has_vsl) && (
                      <div className="xray">
                        {price && <b>{price}</b>}
                        {(o.checkout || o.platform) && <span>{o.checkout ?? o.platform}</span>}
                        {o.cod && <span className="cod" title="Pagamento na entrega">Na entrega</span>}
                        {o.has_vsl && <span title="Página com vídeo de vendas">VSL</span>}
                      </div>
                    )}
                    <div className="sublinks"><a href={libraryLink(o.domain ?? o.advertiser, o.country)} target="_blank" rel="noreferrer">Biblioteca da Meta</a></div>
                  </td>
                  <td className="row-actions">
                    <form action={toggleFavorite}>
                      <input type="hidden" name="key" value={o.offer_key} />
                      <input type="hidden" name="current" value={o.status ?? ""} />
                      <button data-act="star" className={`icon-btn${o.status ? " star-on" : ""}`} title={inFunnel ? `No funil: ${o.status}` : o.status ? "Tirar dos favoritos" : "Favoritar"} aria-label={o.status === "favorita" ? "Tirar dos favoritos" : "Favoritar"} aria-pressed={!!o.status}>
                        <Icon name="star" size={16} fill={!!o.status} />
                      </button>
                    </form>
                    <form action={toggleWatch}>
                      <input type="hidden" name="key" value={o.offer_key} />
                      <button data-act="watch" className={`icon-btn${o.watched ? " watch-on" : ""}`} title={o.watched ? "Parar de espionar" : "Espionar: o robô avisa quando sair criativo novo"} aria-label={o.watched ? "Parar de espionar" : "Espionar"} aria-pressed={o.watched}>
                        <Icon name="eye" size={16} />
                      </button>
                    </form>
                    <form action={setStatus}>
                      <input type="hidden" name="key" value={o.offer_key} />
                      <button data-act="discard" name="status" value={o.status === "descartada" ? "" : "descartada"} className="icon-btn" title={o.status === "descartada" ? "Voltar para o ranking" : "Descartar: sai do ranking"} aria-label="Descartar oferta"><Icon name="x" size={16} /></button>
                    </form>
                    <form action={ignoreAdvertiser}>
                      <input type="hidden" name="name" value={o.domain ?? o.advertiser} />
                      <button className="icon-btn" title="Ignorar anunciante: marca grande ou que não interessa" aria-label="Ignorar anunciante"><Icon name="ban" size={16} /></button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {offers.length === 0 && (
          <div className="empty">
            {withWeak ? <><b>Nenhuma oferta forte nesse recorte.</b><p><Link href={hrefWith(f, { todas: true })}>Mostrar {withWeak} com sinal fraco</Link></p></>
              : filtered || f.lente !== "todas" ? <><b>Nenhuma oferta nesse recorte.</b><p><Link href="/ofertas?lente=todas">Ver todas as ofertas</Link></p></>
              : <><b>Ainda sem ofertas.</b><p>Rode a primeira coleta em Actions, no GitHub.</p></>}
          </div>
        )}
      </div>

      <div className="table-foot">
        <span aria-live="polite">
          {offers.length === total ? `${total} ${total === 1 ? "oferta" : "ofertas"}` : `${offers.length} de ${total} ofertas`}
          {f.todas ? <Link className="linkish" href={hrefWith(f, { todas: false })}>Esconder sinal fraco</Link>
            : hiddenWeak > 0 && <Link className="linkish" href={hrefWith(f, { todas: true })} title="Um anúncio só, sem cópias, sem Google e sem crescimento">Mostrar {hiddenWeak} com sinal fraco</Link>}
          {f.marcas ? <Link className="linkish" href={hrefWith(f, { marcas: false })}>Esconder marcas grandes</Link>
            : hiddenBig > 0 && <Link className="linkish" href={hrefWith(f, { marcas: true })} title="Mais de 1.000 anúncios no Google: costuma ser marca grande, não oferta para modelar">Mostrar {hiddenBig} {hiddenBig === 1 ? "marca grande" : "marcas grandes"}</Link>}
        </span>
        {offers.length < total && <Link className="btn ghost" href={hrefWith(f, { limit: f.limit + PAGE_SIZE })} scroll={false}>Mostrar mais {Math.min(PAGE_SIZE, total - offers.length)}</Link>}
      </div>
      <TriageKeys />
    </>
  );
}
