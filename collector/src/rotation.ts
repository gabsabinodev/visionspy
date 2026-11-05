import { readFileSync } from "node:fs";

export interface SearchPair {
  term: string;
  country: string;
}

/** Grupos de países: o painel e o robô leem o mesmo arquivo. */
export const GROUPS = JSON.parse(readFileSync(new URL("../../web/lib/groups.json", import.meta.url), "utf8")) as Record<string, { label: string; countries: string[] }>;

const ORDER = [...new Set([...GROUPS.BIG20.countries, ...GROUPS.EUROPA.countries])];
const rankOf = (country: string) => {
  const i = ORDER.indexOf(country);
  return i < 0 ? ORDER.length : i;
};

export const pairKey = (p: SearchPair) => `${p.country}|${p.term}`;

/** Busca que não trouxe anúncio espera 7 dias para repetir: libera tempo para as que rendem. */
export const nextRunBase = (lastRun: number, found: number) => lastRun + (found === 0 ? 7 * 864e5 : 0);

/** Palavra com grupo ("EUROPA", "BIG5") vira uma busca por país, sem repetir e sem os países desligados. */
export function expandKeywords(rows: SearchPair[], paused: Set<string> = new Set()): SearchPair[] {
  const seen = new Set<string>();
  const out: SearchPair[] = [];
  for (const r of rows) {
    for (const country of GROUPS[r.country]?.countries ?? [r.country]) {
      const pair = { term: r.term, country };
      if (paused.has(country) || seen.has(pairKey(pair))) continue;
      seen.add(pairKey(pair));
      out.push(pair);
    }
  }
  return out;
}

/** Rodízio: primeiro o que nunca rodou, depois o que ficou mais tempo parado, nos maiores mercados primeiro. */
export function pickSearches(pairs: SearchPair[], lastRun: Map<string, number>, max: number): SearchPair[] {
  return pairs
    .map((pair, i) => ({ pair, i, at: lastRun.get(pairKey(pair)) ?? 0, rank: rankOf(pair.country) }))
    .sort((a, b) => a.at - b.at || a.rank - b.rank || a.i - b.i)
    .slice(0, max)
    .map((x) => x.pair);
}
