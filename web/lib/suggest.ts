/** Sugestão de palavras-chave: frases que se repetem nos anúncios de ofertas diferentes e o robô ainda não busca. */
const STOP = new Set(("a o e é as os um uma uns umas de do da dos das no na nos nas em por para pra com sem que se seu sua seus suas meu minha " +
  "você voce vc mais menos muito muita já ja não nao sim como quando onde ao aos à às ou mas tem têm ter foi ser são sao está esta estão estao " +
  "isso isto esse essa este aquele aquela eu ele ela nós nos eles elas hoje agora aqui lá la só so até ate the and for you your with this that").split(" "));

const words = (t: string) =>
  t.toLowerCase().normalize("NFC").replace(/https?:\S+/g, " ").replace(/[^\p{L}\p{N} ]+/gu, " ").split(/\s+/).filter(Boolean);

export interface Suggestion { term: string; offers: number }

/** `docs`: um item por oferta (texto de todos os anúncios dela). Só vale frase vista em 3 ofertas ou mais. */
export function suggestKeywords(docs: { key: string; text: string }[], existing: string[], limit = 14): Suggestion[] {
  const have = existing.map((k) => k.toLowerCase());
  const seen = new Map<string, Set<string>>();
  for (const d of docs) {
    const w = words(d.text);
    for (let i = 0; i < w.length; i++) {
      for (const n of [2, 3]) {
        const gram = w.slice(i, i + n);
        if (gram.length < n) continue;
        if (STOP.has(gram[0]) || STOP.has(gram[n - 1])) continue; // frase não começa nem termina em palavra vazia
        if (gram.some((g) => /^\d+$/.test(g) && g.length > 3)) continue;
        const term = gram.join(" ");
        if (term.length < 8) continue;
        (seen.get(term) ?? seen.set(term, new Set()).get(term)!).add(d.key);
      }
    }
  }
  const ranked = [...seen.entries()]
    .filter(([term, offers]) => offers.size >= 3 && !have.some((k) => term.includes(k) || k.includes(term)))
    .map(([term, offers]) => ({ term, offers: offers.size }))
    .sort((a, b) => b.offers - a.offers || b.term.length - a.term.length);
  // frase maior engole a menor quando aparecem nas mesmas ofertas
  const out: Suggestion[] = [];
  for (const s of ranked) {
    if (out.some((o) => (o.term.includes(s.term) || s.term.includes(o.term)) && o.offers >= s.offers - 1)) continue;
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}
