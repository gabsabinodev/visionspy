import Link from "next/link";
import { Suspense } from "react";
import { COUNTRIES, countryName, db, DEFAULT_PAIS, defaultMoeda, groupOptions, paisList, paisName, rateOf } from "@/lib/db";
import { MINE_PAGE, MINE_SORTS, mineFiltered, mineHref, parseMine, queryAds, type MineSort } from "@/lib/mining";
import { binOf, SPEND_STOPS, type Moeda, type Phase, type SpendRow } from "@/lib/spend";
import { AdCard } from "./ad-card";
import { AdDrawer } from "./ad-drawer";
import { deleteView, saveView } from "./actions";
import { Icon } from "./icons";
import { MineBar } from "./mine-bar";

export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;
interface Facet { niche: string | null; phase: Phase; ads: number }
interface Heat { heat_v: number; ads: number }
interface Saved { id: number; name: string; query: string }

export default async function Minerar({ searchParams }: { searchParams: Search }) {
  const f = parseMine(await searchParams);
  const client = db();
  const { data: spendRows } = await client.from("spend_model").select("*");
  const spend = (spendRows ?? []) as SpendRow[];
  const moeda: Moeda = f.moeda || defaultMoeda(f.pais);
  const rate = rateOf(spend, moeda);
  const paises = paisList(f.pais);
  const [{ ads, total, error }, big, { data: countryRows }, { data: facetRows }, { data: heatRows }, { data: saved }] = await Promise.all([
    queryAds(client, f, rate),
    f.marcas ? Promise.resolve({ total: 0 }) : queryAds(client, { ...f, marcas: true, limit: 1 }, rate),
    client.from("ad_paises").select("country, ads"),
    client.rpc("ad_resumo_filtros", { paises }),
    client.rpc("ad_resumo_valor", { paises }),
    client.from("saved_views").select("id, name, query").eq("page", "/").order("created_at", { ascending: false }).limit(12),
  ]);

  if (error) {
    return (
      <div className="notice bad">
        <b>Não consegui ler os anúncios.</b>
        <p>{error.message}</p>
        <p>Confira SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel. Se a instalação for antiga, rode a migração 007 no Supabase.</p>
      </div>
    );
  }

  const facets = (facetRows ?? []) as Facet[];
  const heatAll = (heatRows ?? []) as Heat[];

  const byCountry = new Map(((countryRows ?? []) as { country: string; ads: number }[]).map((r) => [r.country, r.ads]));
  const keys = [...new Set([...Object.keys(COUNTRIES), ...byCountry.keys()])];
  const opt = (c: string) => ({ value: c, label: countryName(c), count: byCountry.get(c) ?? 0 });
  const byRegion = (r: string) => keys.filter((c) => (COUNTRIES[c]?.region ?? "outros") === r).map(opt).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const countries = [
    { label: "Regiões", opts: [{ value: DEFAULT_PAIS, label: "Todos os países", count: 0 }, ...groupOptions()] },
    { label: "Europa", opts: byRegion("europa") },
    { label: "Américas", opts: byRegion("americas") },
    { label: "Outros", opts: byRegion("outros") },
  ].filter((g) => g.opts.length);

  const nicheCount = new Map<string, number>();
  const phases: Record<Phase, number> = { vencedor: 0, escalando: 0, teste: 0 };
  for (const r of facets) {
    if (r.niche) nicheCount.set(r.niche, (nicheCount.get(r.niche) ?? 0) + r.ads);
    phases[r.phase] = (phases[r.phase] ?? 0) + r.ads;
  }
  const niches = [...nicheCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value, count]) => ({ value, label: value, count }));

  const heat = Array.from({ length: SPEND_STOPS.length - 1 }, () => 0);
  // o banco agrupa em reais; aqui cada grupo cai na faixa certa da moeda escolhida
  for (const r of heatAll) heat[binOf(Number(r.heat_v) / rate)] += r.ads;

  const filtered = mineFiltered(f);
  const views = (saved ?? []) as Saved[];
  const here = mineHref({ ...f, limit: MINE_PAGE, ver: "" }).split("?")[1] ?? "";
  const anyCollected = facets.length > 0;
  const hiddenBig = f.marcas ? 0 : Math.max(big.total - total, 0);

  return (
    <>
      <header className="page-head compact">
        <h1>Minerar anúncios</h1>
        <p>Encontre onde tem dinheiro rodando, por país e por faixa de investimento.</p>
      </header>

      <Suspense>
        <MineBar countries={countries} niches={niches} heat={heat} phases={phases} moeda={moeda} autoMoeda={defaultMoeda(f.pais)} />
      </Suspense>

      <div className="results-head">
        <div className="results-count" aria-live="polite">
          <b>{total.toLocaleString("pt-BR")}</b> {total === 1 ? "anúncio ativo" : "anúncios ativos"}
          {f.pais !== "todos" && <> {f.pais === "europa" ? "na" : "em"} {paisName(f.pais)}</>}
          {f.marcas ? <Link className="linkish after" href={mineHref(f, { marcas: false })} scroll={false}>Esconder marcas grandes</Link>
            : hiddenBig > 0 && <Link className="linkish after" href={mineHref(f, { marcas: true })} scroll={false} title="Mais de 1.000 anúncios no Google: costuma ser marca grande, não oferta para modelar">Mostrar {hiddenBig} de marcas grandes</Link>}
        </div>
        <div className="results-tools">
          <div className="saved">
            {views.map((v) => (
              <span key={v.id} className={`saved-chip${v.query === here ? " on" : ""}`}>
                <Link href={v.query ? `/?${v.query}` : "/"}>{v.name}</Link>
                <form action={deleteView}>
                  <input type="hidden" name="id" value={v.id} />
                  <button aria-label={`Apagar busca ${v.name}`} title="Apagar busca salva"><Icon name="x" size={12} /></button>
                </form>
              </span>
            ))}
            {filtered && (
              <details className="pop">
                <summary><Icon name="bookmark" size={15} /> Salvar busca</summary>
                <form action={saveView} className="pop-body">
                  <input type="hidden" name="query" value={here} />
                  <input type="hidden" name="page" value="/" />
                  <input className="field" name="name" placeholder="Nome da busca" required maxLength={60} aria-label="Nome da busca" />
                  <button className="btn">Salvar</button>
                </form>
              </details>
            )}
          </div>
          <div className="sort-links" role="group" aria-label="Ordenar">
            {(Object.keys(MINE_SORTS) as MineSort[]).map((k) => (
              <Link key={k} href={mineHref(f, { ordem: k, limit: MINE_PAGE, ver: "" })} scroll={false} aria-current={f.ordem === k ? "true" : undefined}>{MINE_SORTS[k].label}</Link>
            ))}
          </div>
        </div>
      </div>

      {ads.length > 0 ? (
        <div className="ad-grid">
          {ads.map((a) => <AdCard key={a.library_id} a={a} href={mineHref(f, { ver: a.library_id })} showCountry={paises?.length !== 1} moeda={moeda} rate={rate} />)}
        </div>
      ) : (
        <div className="empty">
          {!anyCollected ? (
            <>
              <b>Nenhum anúncio coletado ainda.</b>
              <p>Rode a primeira coleta em Actions, no GitHub. Os resultados aparecem aqui assim que ela terminar.</p>
            </>
          ) : filtered ? (
            <>
              <b>Nenhum anúncio nessa combinação.</b>
              <p>Abra a faixa de investimento ou tire um filtro. <Link href={f.pais === DEFAULT_PAIS ? "/" : `/?pais=${f.pais}`}>Limpar filtros</Link></p>
            </>
          ) : (
            <>
              <b>Nenhum anúncio {f.pais === "europa" ? "na" : "em"} {paisName(f.pais)}.</b>
              <p>Cadastre palavras-chave deste país para o robô buscar aqui. <Link href="/palavras-chave">Adicionar palavras-chave</Link></p>
            </>
          )}
        </div>
      )}

      {ads.length < total && (
        <div className="more">
          <Link className="btn ghost" href={mineHref(f, { limit: f.limit + MINE_PAGE })} scroll={false}>Mostrar mais {Math.min(MINE_PAGE, total - ads.length)}</Link>
          <span className="dim">{ads.length} de {total.toLocaleString("pt-BR")}</span>
        </div>
      )}

      {f.ver && <AdDrawer id={f.ver} closeHref={mineHref({ ...f, ver: "" })} moeda={moeda} rate={rate} />}
    </>
  );
}
