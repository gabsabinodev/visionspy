import { revalidatePath } from "next/cache";
import { COUNTRIES, countryName, db, type OfferRow } from "@/lib/db";
import { fmtMoney } from "@/lib/spend";
import { suggestKeywords } from "@/lib/suggest";
import { addKeywordTerm } from "../actions";
import { Icon } from "../icons";

export const dynamic = "force-dynamic";

async function addKeyword(form: FormData) {
  "use server";
  const term = String(form.get("term") || "").trim().toLowerCase();
  const country = String(form.get("country") || "BR").toUpperCase();
  if (term && /^[A-Z]{2}$/.test(country)) await db().from("keywords").upsert({ term, country, active: true }, { onConflict: "term,country" });
  revalidatePath("/palavras-chave");
}

async function toggleKeyword(form: FormData) {
  "use server";
  await db().from("keywords").update({ active: form.get("active") === "true" }).eq("id", Number(form.get("id")));
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

export default async function PalavrasChave() {
  const client = db();
  const [{ data: kws }, { data: ign }, { data: offerRows }] = await Promise.all([
    client.from("keywords").select("id, term, active, country").order("term"),
    client.from("ignored_advertisers").select("name").order("name"),
    client.from("offer_ranking").select("offer_key, keywords, country, phase, est_month, est_currency, est_month_brl, sample_text, promise").eq("discarded", false).order("est_month_brl", { ascending: false }).limit(1000),
  ]);
  const list = (kws ?? []) as { id: number; term: string; active: boolean; country: string | null }[];
  const offers = (offerRows ?? []) as Offer[];
  const active = list.filter((k) => k.active).length;
  const groups = new Map<string, typeof list>();
  for (const k of list) {
    const c = (k.country || "BR").toUpperCase();
    groups.set(c, [...(groups.get(c) ?? []), k]);
  }
  const ordered = [...groups.entries()].sort((a, b) => (a[0] === "BR" ? -1 : b[0] === "BR" ? 1 : a[0].localeCompare(b[0])));

  // rendimento: o que cada busca traz de oferta boa
  const yieldOf = (term: string, country: string) => {
    const hits = offers.filter((o) => o.country === country && o.keywords?.includes(term));
    return { offers: hits.length, winners: hits.filter((o) => o.phase === "vencedor").length, spend: hits.reduce((s, o) => s + (Number(o.est_month) || 0), 0), currency: hits[0]?.est_currency ?? "BRL" };
  };

  const suggestions = ordered.map(([c]) => {
    const docs = offers.filter((o) => o.country === c).map((o) => ({ key: o.offer_key, text: `${o.sample_text ?? ""} ${o.promise ?? ""}` }));
    return { country: c, items: suggestKeywords(docs, (groups.get(c) ?? []).map((k) => k.term), 10) };
  }).filter((g) => g.items.length);

  return (
    <>
      <header className="page-head">
        <h1>Palavras-chave</h1>
        <p>
          Cada frase é buscada exatamente assim na Biblioteca da Meta, no país escolhido, começando pelos anúncios mais vistos. {active} de {list.length} estão
          ativas. Quanto melhor a lista, mais oferta boa entra.
        </p>
      </header>

      {suggestions.length > 0 && (
        <section className="panel stack">
          <h2>Sugestões a partir dos seus anúncios</h2>
          <p className="muted">Frases que aparecem em 3 ofertas ou mais e o robô ainda não busca. Clique para adicionar.</p>
          {suggestions.map((g) => (
            <div key={g.country}>
              <h3>{countryName(g.country)}</h3>
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
          <form action={addKeyword} className="inline-form">
            <input className="field" name="term" placeholder="Ex.: dor no joelho" required aria-label="Nova palavra-chave" />
            <label className="select-wrap">
              <span className="sr-only">País da busca</span>
              <select name="country" defaultValue="BR" aria-label="País da busca">
                {Object.entries(COUNTRIES).map(([c, v]) => <option key={c} value={c}>{v.name}</option>)}
              </select>
              <Icon name="chevron" size={15} />
            </label>
            <button className="btn">Adicionar</button>
          </form>
          {ordered.map(([c, items]) => (
            <div key={c} className="kw-group">
              <h3>{countryName(c)} <span className="dim">{items.filter((k) => k.active).length} de {items.length} ativas</span></h3>
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
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
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
