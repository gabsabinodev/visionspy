import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PAIS, paisList } from "./db";
import { parsePais } from "./query";
import { isMoeda, type Moeda, type Phase } from "./spend";

/** Um criativo ativo na tela principal (view `ad_feed`). */
export interface AdRow {
  library_id: string; offer_key: string; advertiser: string; domain: string | null; body: string | null; start_date: string | null;
  copies: number; keywords: string[]; page_url: string | null; landing_url: string | null; thumb_url: string | null; thumb_path: string | null;
  media_type: string | null; media_path: string | null; video_url: string | null; cta: string | null; dest_type: string | null; country: string; countries: string[];
  first_seen: string; last_seen: string; best_rank: number | null; body_hash: string; days_running: number; phase: Phase;
  est_month: number; est_currency: string; est_month_brl: number; heat_v: number;
  niche: string | null; kind: string | null; promise: string | null; risk: string | null; status: string | null; big_brand: boolean;
}

export const MINE_SORTS = {
  invest: { label: "Maior investimento", col: "est_month_brl", asc: false },
  copias: { label: "Mais cópias", col: "copies", asc: false },
  dias: { label: "Mais tempo no ar", col: "days_running", asc: false },
  novos: { label: "Lançados agora", col: "start_date", asc: false },
} as const;
export type MineSort = keyof typeof MINE_SORTS;

export interface MineFilters {
  q: string; pais: string; min: number | null; max: number | null; fase: string; formato: string; nicho: string;
  dias: number | null; copias: number | null; ordem: MineSort; limit: number; ver: string;
  /** inclui marcas grandes (1000+ anúncios no Google) */
  marcas: boolean;
  /** moeda escolhida; vazio segue o país */
  moeda: Moeda | "";
}

export const MINE_PAGE = 60;
const MAX = 600;

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const clean = (v: string, n = 60) => v.replace(/[,()%*\\]/g, " ").trim().slice(0, n);
const pos = (v: string) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };

export function parseMine(sp: Raw): MineFilters {
  const ordem = one(sp.ordem);
  const fase = one(sp.fase);
  const formato = one(sp.formato);
  const n = Number(one(sp.n));
  return {
    q: clean(one(sp.q), 80),
    pais: parsePais(one(sp.pais)),
    min: pos(one(sp.de)),
    max: pos(one(sp.ate)),
    fase: ["vencedor", "escalando", "teste"].includes(fase) ? fase : "",
    formato: ["video", "image"].includes(formato) ? formato : "",
    nicho: clean(one(sp.nicho)),
    dias: pos(one(sp.dias)),
    copias: pos(one(sp.copias)),
    ordem: ordem in MINE_SORTS ? (ordem as MineSort) : "invest",
    limit: Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), MAX) : MINE_PAGE,
    ver: /^\d{1,30}$/.test(one(sp.ver)) ? one(sp.ver) : "",
    marcas: one(sp.marcas) === "1",
    moeda: isMoeda(one(sp.moeda).toUpperCase()) ? (one(sp.moeda).toUpperCase() as Moeda) : "",
  };
}

/** Monta a URL da mineração mudando só o que for passado (a URL é a fonte da verdade: dá para salvar). */
export function mineHref(f: MineFilters, patch: Partial<MineFilters> = {}, path = "/"): string {
  const m = { ...f, ...patch };
  const p = new URLSearchParams();
  if (m.q) p.set("q", m.q);
  if (m.pais !== DEFAULT_PAIS) p.set("pais", m.pais);
  if (m.min) p.set("de", String(m.min));
  if (m.max) p.set("ate", String(m.max));
  if (m.fase) p.set("fase", m.fase);
  if (m.formato) p.set("formato", m.formato);
  if (m.nicho) p.set("nicho", m.nicho);
  if (m.dias) p.set("dias", String(m.dias));
  if (m.copias) p.set("copias", String(m.copias));
  if (m.ordem !== "invest") p.set("ordem", m.ordem);
  if (m.limit !== MINE_PAGE) p.set("n", String(m.limit));
  if (m.marcas) p.set("marcas", "1");
  if (m.moeda) p.set("moeda", m.moeda);
  if (m.ver) p.set("ver", m.ver);
  const s = p.toString();
  return s ? `${path}?${s}` : path;
}

export const mineFiltered = (f: MineFilters) => !!(f.q || f.min || f.max || f.fase || f.formato || f.nicho || f.dias || f.copias);

/** `rate`: quanto 1 unidade da moeda escolhida vale em reais (os valores do filtro vêm nessa moeda). */
export async function queryAds(client: SupabaseClient, f: MineFilters, rate = 1) {
  const sort = MINE_SORTS[f.ordem];
  let query = client.from("ad_feed").select("*", { count: "exact" })
    .order(sort.col, { ascending: sort.asc, nullsFirst: false })
    .order("copies", { ascending: false })
    .limit(f.limit);
  const paises = paisList(f.pais);
  if (paises) query = query.overlaps("countries", paises);
  if (!f.marcas) query = query.eq("big_brand", false);
  if (f.min) query = query.gte("est_month_brl", f.min * rate);
  if (f.max) query = query.lte("est_month_brl", f.max * rate);
  if (f.fase) query = query.eq("phase", f.fase);
  if (f.formato) query = query.eq("media_type", f.formato);
  if (f.nicho) query = query.eq("niche", f.nicho);
  if (f.dias) query = query.gte("days_running", f.dias);
  if (f.copias) query = query.gte("copies", f.copias);
  if (f.q) query = query.or(`advertiser.ilike.%${f.q}%,domain.ilike.%${f.q}%,body.ilike.%${f.q}%,promise.ilike.%${f.q}%`);
  const { data, error, count } = await query;
  return { ads: (data ?? []) as AdRow[], error, total: count ?? (data ?? []).length };
}
