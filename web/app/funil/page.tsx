import Link from "next/link";
import { creativeSrc, db, priceRange, STATUSES, STATUS_LABEL, type OfferRow, type Status, keyLabel } from "@/lib/db";
import { fmtMoney } from "@/lib/spend";
import { setStatus } from "../actions";
import { Thumb } from "../bits";

export const dynamic = "force-dynamic";

const NEXT: Partial<Record<Status, Status>> = { favorita: "analisando", analisando: "modelando", modelando: "testando" };

export default async function Funil() {
  const client = db();
  const { data, error } = await client
    .from("offer_ranking")
    .select("offer_key, advertiser, domain, score, copies, copies_growth, copies_7d, niche, price_min, price_max, currency, thumb_path, thumb_url, status, note, est_month, est_currency")
    .not("status", "is", null)
    .order("score", { ascending: false })
    .limit(500);
  // ofertas no funil que saíram do ranking (pararam de anunciar) continuam aparecendo
  const { data: notes } = await client.from("offer_notes").select("offer_key, status, note, updated_at").not("status", "is", null);
  if (error) return <p className="warn">Erro ao ler o banco: {error.message}</p>;

  const rows = (data ?? []) as OfferRow[];
  const live = new Set(rows.map((r) => r.offer_key));
  const gone = ((notes ?? []) as { offer_key: string; status: Status; note: string | null }[]).filter((n) => !live.has(n.offer_key));

  return (
    <>
      <header className="page-head">
        <h1>Funil</h1>
        <p>Do achado ao teste. Favorite uma oferta para ela entrar aqui. As descartadas saem do ranking e da mineração.</p>
      </header>

      <div className="board">
        {STATUSES.map((s) => {
          const col = rows.filter((r) => r.status === s);
          const old = gone.filter((g) => g.status === s);
          return (
            <section key={s} className={`col s-${s}`} aria-label={STATUS_LABEL[s]}>
              <h2>{STATUS_LABEL[s]} <span className="dim">{col.length + old.length}</span></h2>
              {col.map((o) => (
                <article key={o.offer_key} className="card">
                  <Thumb src={creativeSrc(o.thumb_path, o.thumb_url)} alt={`Criativo de ${o.advertiser}`} />
                  <div className="card-body">
                    <Link className="offer-name" href={`/oferta/${encodeURIComponent(o.offer_key)}`}>{o.advertiser}</Link>
                    <div className="card-meta">
                      {fmtMoney(o.est_month, o.est_currency)} por mês
                      {o.copies_7d !== null && o.copies_growth > 0 && <span className="up"> +{o.copies_growth} cópias</span>}
                    </div>
                    {o.price_min !== null && <div className="card-meta">{priceRange(o.price_min, o.price_max, o.currency)}</div>}
                    {o.niche && <div className="card-meta">{o.niche}</div>}
                    {o.note && <p className="card-note">{o.note.slice(0, 140)}</p>}
                    {NEXT[s] && (
                      <form action={setStatus}>
                        <input type="hidden" name="key" value={o.offer_key} />
                        <button name="status" value={NEXT[s]} className="linkish">Mover para {NEXT[s]}</button>
                      </form>
                    )}
                  </div>
                </article>
              ))}
              {old.map((g) => (
                <article key={g.offer_key} className="card gone">
                  <div className="card-body">
                    <Link className="offer-name" href={`/oferta/${encodeURIComponent(g.offer_key)}`}>{keyLabel(g.offer_key)}</Link>
                    <div className="card-meta">Parou de aparecer nas coletas</div>
                    {g.note && <p className="card-note">{g.note.slice(0, 140)}</p>}
                  </div>
                </article>
              ))}
              {!col.length && !old.length && <p className="empty-col">Vazio</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
