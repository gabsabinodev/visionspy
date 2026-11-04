import Link from "next/link";
import { countryName, creativeSrc, DEST_LABEL, db, fmtDate, libraryLink, shortUrl, storageUrl, type DestType } from "@/lib/db";
import type { AdRow } from "@/lib/mining";
import { estRange, fmtMoney, heatColor, heatOf, heatText, PHASE_HINT, PHASE_LABEL, phaseBudget, rankBoost, type Moeda, type SpendRow } from "@/lib/spend";
import { ignoreAdvertiser, setStatus, toggleWatch } from "./actions";
import { CopyButton, Thumb } from "./bits";
import { Drawer } from "./drawer";
import { Icon } from "./icons";

const money = (v: number, cur: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(v).replace(/ /g, " ");

export async function AdDrawer({ id, closeHref, moeda, rate }: { id: string; closeHref: string; moeda: Moeda; rate: number }) {
  const client = db();
  const { data } = await client.from("ad_feed").select("*").eq("library_id", id).maybeSingle();
  const a = data as AdRow | null;
  if (!a) return null;
  const [{ data: spend }, { data: twins }, { data: tr }, { data: watch }] = await Promise.all([
    client.from("spend_model").select("*").in("country", [a.country, "*"]),
    client.from("ad_feed").select("offer_key, advertiser, domain").eq("body_hash", a.body_hash).neq("offer_key", a.offer_key).limit(40),
    client.from("ad_transcripts").select("hook, structure").eq("library_id", a.library_id).maybeSingle(),
    client.from("watchlist").select("id").eq("offer_key", a.offer_key).limit(1),
  ]);
  const rows = (spend ?? []) as SpendRow[];
  const m = rows.find((r) => r.country === a.country) ?? rows.find((r) => r.country === "*") ?? null;
  const boost = rankBoost(a.best_rank);
  const others = [...new Map(((twins ?? []) as { offer_key: string; advertiser: string; domain: string | null }[]).map((t) => [t.offer_key, t])).values()];
  const video = a.media_path && a.media_type === "video" ? storageUrl("midia", a.media_path) : null;
  const value = Number(a.est_month_brl) / rate;
  const t = heatOf(value);
  const transcript = tr as { hook: string | null; structure: string | null } | null;
  const dest = a.dest_type ? DEST_LABEL[a.dest_type as DestType] ?? a.dest_type : null;

  return (
    <Drawer closeHref={closeHref} label={`Anúncio de ${a.advertiser}`}>
      <header className="dr-head">
        <h2>{a.advertiser}</h2>
        {a.domain && <a href={`https://${a.domain}`} target="_blank" rel="noreferrer">{a.domain}</a>}
      </header>

      <div className="dr-media">
        {video ? <video src={video} controls preload="metadata" poster={creativeSrc(a.thumb_path, a.thumb_url) ?? undefined} /> : <Thumb src={creativeSrc(a.thumb_path, a.thumb_url)} alt={`Criativo de ${a.advertiser}`} video={a.media_type === "video"} />}
      </div>

      <div className="dr-spend" style={{ ["--heat" as string]: heatColor(t), ["--heat-text" as string]: heatText(t) }}>
        <span>Investimento estimado por mês</span>
        <b>{fmtMoney(value, moeda)}</b>
        <span>Faixa provável: {estRange(value, moeda)}</span>
        {m && (
          <p>
            {a.copies} {a.copies === 1 ? "cópia" : "cópias"} × {money(phaseBudget(a.phase, m), m.currency)} por dia × {Math.min(a.days_running + 1, 30)} dias
            {boost > 1 ? ` × ${String(boost).replace(".", ",")} (entre os mais vistos da busca)` : ""}{a.est_currency !== moeda ? `, em ${a.est_currency} no país do anúncio` : ""}. É uma conta do modelo, não o gasto real.
          </p>
        )}
      </div>

      <dl className="kvs">
        <div className="kv"><dt>Fase</dt><dd><span className={`phase inline ph-${a.phase}`}>{PHASE_LABEL[a.phase]}</span> <span className="dim">{PHASE_HINT[a.phase]}</span></dd></div>
        <div className="kv"><dt>No ar desde</dt><dd>{fmtDate(a.start_date)} ({a.days_running} dias)</dd></div>
        <div className="kv"><dt>País</dt><dd>{countryName(a.country)}</dd></div>
        {a.best_rank && <div className="kv"><dt>Posição na busca</dt><dd>{a.best_rank}º entre os mais vistos</dd></div>}
        {a.niche && <div className="kv"><dt>Nicho</dt><dd>{a.niche}</dd></div>}
        {a.promise && <div className="kv"><dt>Promessa</dt><dd>{a.promise}</dd></div>}
        {dest && <div className="kv"><dt>Destino</dt><dd>{dest}{a.cta ? `, botão "${a.cta}"` : ""}</dd></div>}
      </dl>

      {a.body && <p className="dr-text">{a.body}</p>}
      {transcript?.hook && <p className="dr-hook"><b>Gancho do vídeo:</b> {transcript.hook}</p>}

      {others.length > 0 && (
        <section className="dr-twins">
          <h3>Mesmo texto em {others.length} {others.length === 1 ? "outra oferta" : "outras ofertas"}</h3>
          <ul>{others.slice(0, 6).map((o) => <li key={o.offer_key}><Link href={`/oferta/${encodeURIComponent(o.offer_key)}`}>{o.advertiser}</Link>{o.domain && <span className="dim"> {o.domain}</span>}</li>)}</ul>
        </section>
      )}

      <div className="dr-actions">
        <Link className="btn" href={`/oferta/${encodeURIComponent(a.offer_key)}`}>Abrir oferta</Link>
        <a className="btn ghost" href={`https://www.facebook.com/ads/library/?id=${a.library_id}`} target="_blank" rel="noreferrer"><Icon name="external" size={15} /> Ver na biblioteca</a>
        {a.landing_url && (
          <span className="landing-wrap">
            <a className="btn ghost" href={a.landing_url} target="_blank" rel="noreferrer noopener" title={a.landing_url}><Icon name="external" size={15} /> {shortUrl(a.landing_url, 26)}</a>
            <CopyButton text={a.landing_url} />
          </span>
        )}
      </div>
      <div className="dr-actions quiet">
        <form action={setStatus}>
          <input type="hidden" name="key" value={a.offer_key} />
          <button className="btn ghost" name="status" value={a.status === "favorita" ? "" : a.status ?? "favorita"}><Icon name="star" size={15} fill={!!a.status} /> {a.status ? "No funil" : "Favoritar oferta"}</button>
        </form>
        <form action={toggleWatch}>
          <input type="hidden" name="key" value={a.offer_key} />
          <button className="btn ghost"><Icon name="eye" size={15} /> {watch?.length ? "Espionando" : "Espionar"}</button>
        </form>
        <form action={ignoreAdvertiser}>
          <input type="hidden" name="name" value={a.domain ?? a.advertiser} />
          <button className="btn ghost danger" title="Marca grande ou anunciante que não interessa: some da mineração e do ranking na hora"><Icon name="ban" size={15} /> Ignorar anunciante</button>
        </form>
        <a className="btn ghost" href={libraryLink(a.domain ?? a.advertiser, a.country)} target="_blank" rel="noreferrer">Todos os anúncios</a>
      </div>
    </Drawer>
  );
}
