import Link from "next/link";
import { db, defaultMoeda, EUROPE, paisName, rateOf, type OfferRow } from "@/lib/db";
import { parsePais } from "@/lib/query";
import { fmtMoney, heatColor, heatOf, heatText, type SpendRow } from "@/lib/spend";

export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;
type Row = Pick<OfferRow, "niche" | "country" | "est_month_brl" | "launched_7d" | "copies_growth" | "copies_7d" | "first_seen" | "phase" | "momentum" | "advertiser" | "offer_key">;

interface Niche { name: string; offers: number; spend: number; launched: number; hotOffers: number; winners: number; fresh: number; top: Row | null }

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function Nichos({ searchParams }: { searchParams: Search }) {
  const pais = parsePais(one((await searchParams).pais));
  const client = db();
  let query = client.from("offer_ranking")
    .select("niche, country, est_month_brl, launched_7d, copies_growth, copies_7d, first_seen, phase, momentum, advertiser, offer_key")
    .eq("discarded", false).eq("big_brand", false).not("niche", "is", null).order("est_month_brl", { ascending: false }).limit(1000);
  if (pais === "europa") query = query.in("country", EUROPE);
  else if (pais !== "todos") query = query.eq("country", pais);
  const [{ data, error }, { data: spendRows }] = await Promise.all([query, client.from("spend_model").select("*")]);
  const moeda = defaultMoeda(pais);
  const rate = rateOf((spendRows ?? []) as SpendRow[], moeda);
  if (error) return <div className="notice bad"><b>Não consegui ler os nichos.</b><p>{error.message}</p></div>;

  const week = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const map = new Map<string, Niche>();
  for (const r of (data ?? []) as Row[]) {
    const n = map.get(r.niche!) ?? { name: r.niche!, offers: 0, spend: 0, launched: 0, hotOffers: 0, winners: 0, fresh: 0, top: null };
    n.offers++;
    n.spend += (Number(r.est_month_brl) || 0) / rate;
    n.launched += r.launched_7d;
    if (r.momentum > 0) n.hotOffers++;
    if (r.phase === "vencedor") n.winners++;
    if (r.first_seen >= week) n.fresh++;
    if (!n.top || r.momentum > n.top.momentum) n.top = r;
    map.set(n.name, n);
  }
  const list = [...map.values()].sort((a, b) => b.launched - a.launched || b.spend - a.spend);
  const peak = Math.max(...list.map((n) => n.spend), 1);
  const tabs = ["BR", "europa", "GB", "PT", "ES", "FR", "DE", "IT", "US", "todos"];

  return (
    <>
      <header className="page-head compact">
        <h1>Nichos</h1>
        <p>Onde tem mais gente lançando criativo agora.</p>
      </header>
      <nav className="lenses" aria-label="País">
        {tabs.map((c) => (
          <Link key={c} href={c === "BR" ? "/nichos" : `/nichos?pais=${c}`} aria-current={pais === c ? "true" : undefined}>{paisName(c).replace(/^t/, "T")}</Link>
        ))}
      </nav>
      <div className="grid">
        <table className="heat-table">
          <thead>
            <tr>
              <th>Nicho</th>
              <th className="n" title="Criativos que entraram no ar nos últimos 7 dias">Lançados 7d</th>
              <th className="n">Investimento estimado</th>
              <th className="n">Ofertas</th>
              <th className="n" title="Ofertas com momentum acima de zero">Aquecendo</th>
              <th className="n">Vencedoras</th>
              <th className="n">Novas 7d</th>
              <th>Mais quente</th>
            </tr>
          </thead>
          <tbody>
            {list.map((n) => {
              const t = heatOf(n.spend);
              return (
                <tr key={n.name} style={{ ["--heat" as string]: heatColor(t), ["--heat-text" as string]: heatText(t), ["--fill" as string]: `${Math.max((n.spend / peak) * 100, 3)}%` }}>
                  <td><Link className="name" href={`/?nicho=${encodeURIComponent(n.name)}${pais === "BR" ? "" : `&pais=${pais}`}`}>{n.name}</Link></td>
                  <td className="n">{n.launched > 0 ? <span className="up">+{n.launched}</span> : <span className="dim">0</span>}</td>
                  <td className="n" style={{ minWidth: 150 }}><b>{fmtMoney(n.spend, moeda)}</b><span className="bar" style={{ marginLeft: "auto" }} /></td>
                  <td className="n">{n.offers}</td>
                  <td className="n">{n.hotOffers}</td>
                  <td className="n">{n.winners}</td>
                  <td className="n">{n.fresh}</td>
                  <td>{n.top && <Link className="linkish" href={`/oferta/${encodeURIComponent(n.top.offer_key)}`}>{n.top.advertiser}</Link>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length && <div className="empty"><b>Nenhum nicho classificado aqui.</b><p>A IA classifica as ofertas com sinal de escala a cada coleta. Precisa da chave do Gemini configurada.</p></div>}
      </div>
    </>
  );
}
