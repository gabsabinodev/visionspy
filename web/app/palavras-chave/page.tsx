import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { COUNTRIES, countryName, db, GROUPS, isScope, scopeList, scopeName, type OfferRow } from "@/lib/db";
import { parseTerms } from "@/lib/keywords";
import { fmtMoney } from "@/lib/spend";
import { suggestKeywords } from "@/lib/suggest";
import { addKeywordTerm } from "../actions";
import { Icon } from "../icons";

export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;

const REGIONS = [
  { key: "europa", label: "Europa" },
  { key: "americas", label: "Américas" },
  { key: "outros", label: "Ásia e Oceania" },
];

/** Aceita várias de uma vez: a mesma palavra num destino que já existe só volta a ficar ativa. */
async function addKeywords(form: FormData) {
  "use server";
  const terms = parseTerms(String(form.get("terms") ?? ""));
  const scope = String(form.get("scope") ?? "").toUpperCase();
  if (!terms.length || !isScope(scope)) redirect("/palavras-chave");
  const client = db();
  const { data: existing } = await client.from("keywords").select("term").eq("country", scope).limit(5000);
  const known = new Set(((existing ?? []) as { term: string }[]).map((k) => k.term));
  const fresh = terms.filter((t) => !known.has(t)).length;
  await client.from("keywords").upsert(terms.map((term) => ({ term, country: scope, active: true })), { onConflict: "term,country" });
  revalidatePath("/palavras-chave");
  redirect(`/palavras-chave?novas=${fresh}&repetidas=${terms.length - fresh}&destino=${scope}`);
}

async function toggleKeyword(form: FormData) {
  "use server";
  await db().from("keywords").update({ active: form.get("active") === "true" }).eq("id", Number(form.get("id")));
  revalidatePath("/palavras-chave");
}

async function deleteKeyword(form: FormData) {
  "use server";
  await db().from("keywords").delete().eq("id", Number(form.get("id")));
  revalidatePath("/palavras-chave");
}

async function toggleGroup(form: FormData) {
  "use server";
  const scope = String(form.get("scope") ?? "").toUpperCase();
  if (isScope(scope)) await db().from("keywords").update({ active: form.get("active") === "true" }).eq("country", scope);
  revalidatePath("/palavras-chave");
}

/** Liga ou desliga um país inteiro: vale também para os grupos que têm esse país. */
async function toggleCountry(form: FormData) {
  "use server";
  const country = String(form.get("country") ?? "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return;
  const client = db();
  if (form.get("paused") === "true") await client.from("paused_countries").upsert({ country });
  else await client.from("paused_countries").delete().eq("country", country);
  revalidatePath("/palavras-chave");
}

async function addIgnored(form: FormData) {
  "use server";
  const name = String(form.get("name") || "").trim();
  if (name) await db().from("ignored_advertisers").upsert({ name });
  revalidatePath("/palavras-chave");
}

async function removeIgnored(form: FormData) {
  "use server";
  await db().from("ignored_advertisers").delete().eq("name", String(form.get("name") || ""));
  revalidatePath("/palavras-chave");
}

type Offer = Pick<OfferRow, "offer_key" | "keywords" | "country" | "phase" | "est_month" | "est_currency" | "est_month_brl" | "sample_text" | "promise">;

export default async function PalavrasChave({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const client = db();
  const since = new Date(Date.now() - 864e5).toISOString();
  const [{ data: kws }, { data: ign }, { data: offerRows }, { data: pausedRows }, { count: recent }] = await Promise.all([
    client.from("keywords").select("id, term, active, country").order("term").limit(5000),
    client.from("ignored_advertisers").select("name").order("name"),
    client.from("offer_ranking").select("offer_key, keywords, country, phase, est_month, est_currency, est_month_brl, sample_text, promise").eq("discarded", false).order("est_month_brl", { ascending: false }).limit(1000),
    client.from("paused_countries").select("country"),
    client.from("keyword_runs").select("term", { count: "exact", head: true }).gte("last_run", since),
  ]);
  const list = (kws ?? []) as { id: number; term: string; active: boolean; country: string | null }[];
  const offers = (offerRows ?? []) as Offer[];
  const paused = new Set(((pausedRows ?? []) as { country: string }[]).map((r) => r.country));
  const active = list.filter((k) => k.active).length;
  const groups = new Map<string, typeof list>();
  for (const k of list) {
    const c = (k.country || "BR").toUpperCase();
    groups.set(c, [...(groups.get(c) ?? []), k]);
  }
  const live = (c: string) => scopeList(c).some((x) => !paused.has(x));
  const rank = (c: string) => (c in GROUPS ? Object.keys(GROUPS).indexOf(c) : live(c) ? 100 : 200);
  const ordered = [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || scopeName(a[0]).localeCompare(scopeName(b[0])));

  // quantas buscas diferentes o rodízio tem hoje
  const pairs = new Set(list.filter((k) => k.active).flatMap((k) => scopeList((k.country || "BR").toUpperCase()).filter((c) => !paused.has(c)).map((c) => `${c}|${k.term}`))).size;
  const added = Number(sp.novas ?? NaN);
  const repeated = Number(sp.repetidas ?? 0);
  const fmt = (n: number) => n.toLocaleString("pt-BR");

  // rendimento: o que cada busca traz de oferta boa
  const yieldOf = (term: string, country: string) => {
    const where = scopeList(country);
    const hits = offers.filter((o) => where.includes(o.country) && o.keywords?.includes(term));
    return { offers: hits.length, winners: hits.filter((o) => o.phase === "vencedor").length, spend: hits.reduce((s, o) => s + (Number(o.est_month) || 0), 0), currency: hits[0]?.est_currency ?? "BRL" };
  };

  const suggestions = ordered.filter(([c]) => live(c)).map(([c]) => {
    const where = scopeList(c);
    const docs = offers.filter((o) => where.includes(o.country)).map((o) => ({ key: o.offer_key, text: `${o.sample_text ?? ""} ${o.promise ?? ""}` }));
    return { country: c, items: suggestKeywords(docs, (groups.get(c) ?? []).map((k) => k.term), 10) };
  }).filter((g) => g.items.length);

  return (
    <>
      <header className="page-head">
        <h1>Palavras-chave</h1>
        <p>
          Cada frase é buscada exatamente assim na Biblioteca da Meta. {fmt(active)} de {fmt(list.length)} estão ativas e somam {fmt(pairs)} buscas.
          Nas últimas 24 horas o robô fez {fmt(recent ?? 0)}. Busca sem anúncio espera 7 dias para repetir.
        </p>
      </header>

      {Number.isFinite(added) && (
        <div className="notice" role="status">
          <b>{added === 1 ? "1 palavra nova" : `${fmt(added)} palavras novas`} em {scopeName(String(sp.destino ?? ""))}.</b>
          {repeated > 0 && <p>{repeated === 1 ? "1 já existia" : `${fmt(repeated)} já existiam`} e ficou ativa.</p>}
        </div>
      )}

      <section className="panel kw-add">
        <h2>Adicionar palavras</h2>
        <p className="muted">Cole uma por linha ou separe por vírgula. As repetidas são ignoradas.</p>
        <form action={addKeywords}>
          <textarea className="field" name="terms" rows={6} required aria-label="Palavras-chave" placeholder={"retirement sale, closing down sale\nfarewell sale"} />
          <div className="kw-add-row">
            <label className="select-wrap">
              <span className="sr-only">Destino da busca</span>
              <select name="scope" defaultValue="EUROPA" aria-label="Destino da busca">
                <optgroup label="Regiões e maiores mercados">
                  {Object.entries(GROUPS).map(([code, g]) => <option key={code} value={code}>{g.label} ({g.countries.length} países)</option>)}
                </optgroup>
                <optgroup label="Um país">
                  {Object.entries(COUNTRIES).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([c, v]) => <option key={c} value={c}>{v.name}</option>)}
                </optgroup>
              </select>
              <Icon name="chevron" size={15} />
            </label>
            <button className="btn">Adicionar palavras</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Países na coleta</h2>
        <p className="muted">Desligue um país e o robô para de buscar nele, mesmo que ele esteja em Europa ou nos grupos Big. As palavras continuam salvas.</p>
        {REGIONS.map((r) => (
          <div key={r.key} className="country-block">
            <h3>{r.label}</h3>
            <div className="country-toggles">
              {Object.entries(COUNTRIES).filter(([, v]) => v.region === r.key).map(([c, v]) => (
                <form key={c} action={toggleCountry}>
                  <input type="hidden" name="country" value={c} />
                  <input type="hidden" name="paused" value={String(!paused.has(c))} />
                  <button aria-pressed={!paused.has(c)} title={paused.has(c) ? `Ligar ${v.name}` : `Desligar ${v.name}`}>{v.name}</button>
                </form>
              ))}
            </div>
          </div>
        ))}
      </section>

      {suggestions.length > 0 && (
        <section className="panel stack">
          <h2>Sugestões a partir dos seus anúncios</h2>
          <p className="muted">Frases que aparecem em 3 ofertas ou mais e o robô ainda não busca. Clique para adicionar.</p>
          {suggestions.map((g) => (
            <div key={g.country}>
              <h3>{scopeName(g.country)}</h3>
              <div className="suggest">
                {g.items.map((s) => (
                  <form key={s.term} action={addKeywordTerm}>
                    <input type="hidden" name="term" value={s.term} />
                    <input type="hidden" name="country" value={g.country} />
                    <button title={`Em ${s.offers} ofertas`}><Icon name="plus" size={13} /> {s.term} <span className="count">{s.offers}</span></button>
                  </form>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="two-col">
        <section className="panel">
          <h2>Buscas</h2>
          {ordered.map(([c, items]) => {
            const on = items.filter((k) => k.active).length;
            return (
              <details key={c} className="kw-group" open={items.length <= 12 && live(c)}>
                <summary>
                  <b>{scopeName(c)}</b>
                  <span className="dim">{on} de {items.length} ativas{c in GROUPS ? `, ${scopeList(c).length} países` : ""}{live(c) ? "" : ", país desligado"}</span>
                </summary>
                <form action={toggleGroup} className="kw-group-actions">
                  <input type="hidden" name="scope" value={c} />
                  <input type="hidden" name="active" value={String(on === 0)} />
                  <button className="btn ghost">{on === 0 ? "Ativar todas" : "Pausar todas"}</button>
                </form>
                <ul className="kw-list">
                  {items.map((k) => {
                    const y = yieldOf(k.term, c);
                    return (
                      <li key={k.id}>
                        <span className={k.active ? "" : "off"}>{k.term}</span>
                        <span className="sublinks">
                          <span className={y.offers ? "" : "yield-bad"} title="Ofertas encontradas por esta busca">{y.offers} {y.offers === 1 ? "oferta" : "ofertas"}</span>
                          {y.winners > 0 && <span title="Ofertas com anúncio vencedor">{y.winners} {y.winners === 1 ? "vencedora" : "vencedoras"}</span>}
                          {y.spend > 0 && <span title="Investimento estimado somado">{fmtMoney(y.spend, y.currency)}</span>}
                          <form action={toggleKeyword} style={{ display: "inline" }}>
                            <input type="hidden" name="id" value={k.id} />
                            <input type="hidden" name="active" value={String(!k.active)} />
                            <button className={k.active ? "btn ghost" : "btn"}>{k.active ? "Pausar" : "Ativar"}</button>
                          </form>
                          <form action={deleteKeyword} style={{ display: "inline" }}>
                            <input type="hidden" name="id" value={k.id} />
                            <button className="btn ghost danger" aria-label={`Excluir ${k.term}`} title="Excluir"><Icon name="x" size={12} /></button>
                          </form>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </section>

        <section className="panel">
          <h2>Anunciantes ignorados</h2>
          <p className="muted">
            Marketplaces e grandes marcas não são ofertas para modelar. Escreva o nome da página no Facebook ou um domínio. Parcerias do tipo
            &ldquo;Fulana com Marca&rdquo; também saem. Vale na hora.
          </p>
          <form action={addIgnored} className="inline-form">
            <input className="field" name="name" placeholder="Nome da página ou domínio" required aria-label="Anunciante a ignorar" />
            <button className="btn">Ignorar</button>
          </form>
          <div className="chips">
            {(ign ?? []).map((i: { name: string }) => (
              <form key={i.name} action={removeIgnored} className="saved-chip">
                <input type="hidden" name="name" value={i.name} />
                <span>{i.name}</span>
                <button aria-label={`Voltar a mostrar ${i.name}`} title="Voltar a mostrar"><Icon name="x" size={12} /></button>
              </form>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
