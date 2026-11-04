import Link from "next/link";
import { COUNTRIES, countryName, creativeSrc, daysLabel, db, flag, fmtDate, TIKTOK_LIB, type OfferRow } from "@/lib/db";
import { addWatch, removeWatch } from "../actions";
import { Thumb } from "../bits";
import { fmtMoney } from "@/lib/spend";

export const dynamic = "force-dynamic";

interface Watch { id: number; offer_key: string | null; label: string; term: string; country: string; created_at: string }

export default async function Espionagem() {
  const client = db();
  const { data: rows } = await client.from("watchlist").select("id, offer_key, label, term, country, created_at").order("created_at", { ascending: false });
  const list = (rows ?? []) as Watch[];
  const keys = list.map((w) => w.offer_key).filter((k): k is string => !!k);
  const ids = list.map((w) => w.id);
  const [{ data: offers }, { data: lastNew }, { data: ttCounts }, { data: ttLast }] = await Promise.all([
    keys.length ? client.from("offer_ranking").select("*").in("offer_key", keys) : Promise.resolve({ data: [] }),
    keys.length ? client.from("ads").select("offer_key, first_seen").in("offer_key", keys).order("first_seen", { ascending: false }).limit(2000) : Promise.resolve({ data: [] }),
    ids.length ? client.from("tiktok_watch_counts").select("watch_id, day, total").in("watch_id", ids).order("day", { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
    ids.length ? client.from("tiktok_library_ads").select("watch_id, last_shown").in("watch_id", ids).order("last_shown", { ascending: false }).limit(1000) : Promise.resolve({ data: [] }),
  ]);
  const ttTotal = new Map<number, number>();
  for (const r of (ttCounts ?? []) as { watch_id: number; total: number }[]) if (!ttTotal.has(r.watch_id)) ttTotal.set(r.watch_id, r.total);
  const ttRecent = new Map<number, string>();
  for (const r of (ttLast ?? []) as { watch_id: number; last_shown: string | null }[]) if (r.last_shown && !ttRecent.has(r.watch_id)) ttRecent.set(r.watch_id, r.last_shown);
  const byKey = new Map(((offers ?? []) as OfferRow[]).map((o) => [o.offer_key, o]));
  const newest = new Map<string, string>();
  for (const a of (lastNew ?? []) as { offer_key: string; first_seen: string }[]) if (!newest.has(a.offer_key)) newest.set(a.offer_key, a.first_seen);

  return (
    <>
      <header className="page-head">
        <h1>Espionagem</h1>
        <p>
          O robô busca cada alvo na Biblioteca da Meta em toda coleta e avisa no Telegram quando sai criativo novo. Na Europa e no Reino Unido
          ele também olha a biblioteca do TikTok. No Brasil e nos EUA o TikTok não tem biblioteca pública.
        </p>
      </header>

      <section className="panel stack">
        <h2>Adicionar alvo</h2>
        <form action={addWatch} className="inline-form">
          <input className="field" name="term" placeholder="site (loja.com.br) ou nome da página no Facebook" required aria-label="Site ou nome da página" />
          <select className="field country-sel" name="country" defaultValue="BR" aria-label="País">
            {Object.entries(COUNTRIES).map(([c, v]) => <option key={c} value={c}>{v.name}</option>)}
          </select>
          <button className="btn">Espionar</button>
        </form>
      </section>

      <div className="grid">
        <table className="ranking">
          <thead>
            <tr>
              <th>Alvo</th>
              <th className="n">Investimento</th>
              <th className="n">Ativos</th>
              <th className="n">Novos 7d</th>
              <th className="n">Com 30+ dias</th>
              <th>No ar</th>
              <th>Último criativo</th>
              <th title="Anúncios nos últimos 30 dias na biblioteca do TikTok (só Europa e Reino Unido)">TikTok 30d</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((w) => {
              const o = w.offer_key ? byKey.get(w.offer_key) : undefined;
              const last = w.offer_key ? newest.get(w.offer_key) : undefined;
              return (
                <tr key={w.id}>
                  <td>
                    <div className="offer-cell">
                    <Thumb src={o ? creativeSrc(o.thumb_path, o.thumb_url) : null} alt={`Criativo de ${w.label}`} />
                    <div className="offer-main">
                      <div className="offer-title">
                        {w.offer_key ? <Link className="offer-name" href={`/oferta/${encodeURIComponent(w.offer_key)}`}>{o?.advertiser ?? w.label}</Link> : <span className="offer-name">{w.label}</span>}
                        <span className="country-tag" title={countryName(w.country)}>{flag(w.country)}</span>
                      </div>
                      <div className="domain">Busca: {w.term}</div>
                      {!w.offer_key && <div className="domain">Aguardando a próxima coleta encontrar a oferta</div>}
                      {o?.cooling && <div className="badges"><span className="tag cold">Esfriando</span></div>}
                    </div>
                    </div>
                  </td>
                  <td className="n">{o ? fmtMoney(o.est_month, o.est_currency) : "—"}</td>
                  <td className="n">{o?.ads_active ?? "—"}</td>
                  <td className="n">{o ? (o.new_ads_7d > 0 ? <span className="up">+{o.new_ads_7d}</span> : 0) : "—"}</td>
                  <td className="n">{o?.long_runners ?? "—"}</td>
                  <td className="date">{o ? daysLabel(o.days_running) : "—"}</td>
                  <td className="date">{last ? new Date(last).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="date">
                    {TIKTOK_LIB.has(w.country) ? (
                      <>
                        {ttTotal.has(w.id) ? <b>{ttTotal.get(w.id)!.toLocaleString("pt-BR")}</b> : <span className="dim">aguardando</span>}
                        {ttRecent.get(w.id) && <div className="days">Último em {fmtDate(ttRecent.get(w.id)!)}</div>}
                        <div><a className="linkish" href={`https://library.tiktok.com/ads?region=${w.country}&adv_name=${encodeURIComponent(w.term.includes(".") && !w.term.includes(" ") ? w.term.split(".")[0] : w.label)}&query_type=1`} target="_blank" rel="noreferrer">Abrir biblioteca</a></div>
                      </>
                    ) : <span className="dim" title="O TikTok só tem biblioteca pública na Europa e no Reino Unido">—</span>}
                  </td>
                  <td>
                    <form action={removeWatch}>
                      <input type="hidden" name="id" value={w.id} />
                      <button className="btn ghost" title="Parar de espionar">Parar</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length && <div className="empty"><b>Nenhum alvo ainda.</b><p>Adicione um site acima ou clique no olho em qualquer oferta.</p></div>}
      </div>
    </>
  );
}
