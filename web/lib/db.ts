import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { demoClient } from "./demo";
import groups from "./groups.json";

export function db(): SupabaseClient {
  if (process.env.VISIONSPY_DEMO === "1") return demoClient as unknown as SupabaseClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis da Vercel.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface OfferRow {
  offer_key: string;
  advertiser: string;
  advertisers: string[];
  domain: string | null;
  last_day: string;
  cards: number;
  copies: number;
  pages: number;
  oldest_start: string | null;
  keywords: string[];
  sample_text: string | null;
  cards_7d: number | null;
  copies_7d: number | null;
  copies_growth: number;
  google_ads: number | null;
  first_seen: string;
  score: number;
  landing_url: string | null;
  page_url: string | null;
  thumb_url: string | null;
  dest_type: DestType | null;
  thumb_path: string | null;
  // raio-X da página de vendas
  platform: string | null;
  checkout: string | null;
  price_min: number | string | null;
  price_max: number | string | null;
  installments: string | null;
  cod: boolean | null;
  has_vsl: boolean | null;
  pixels: string[] | null;
  // IA
  niche: string | null;
  kind: string | null;
  audience: string | null;
  promise: string | null;
  mechanism: string | null;
  offer: string | null;
  risk: string | null;
  risk_reason: string | null;
  // funil
  status: Status | null;
  note: string | null;
  discarded: boolean;
  // Fase 1
  country: string;
  days_running: number | null;
  ads_active: number;
  long_runners: number;
  new_ads_7d: number;
  media_count: number;
  cooling: boolean;
  watched: boolean;
  has_kit: boolean;
  currency: string | null;
  // mineração
  launched_7d: number;
  est_month: number;
  est_month_brl: number;
  est_currency: string;
  phase: "teste" | "escalando" | "vencedor";
  clones: number;
  big_brand: boolean;
  momentum: number;
}

/** Países que o robô sabe buscar (dá para adicionar outros nas palavras-chave). */
export const COUNTRIES: Record<string, { name: string; locale: string; currency: string; region: "europa" | "americas" | "outros" }> = {
  GB: { name: "Reino Unido", locale: "en-GB", currency: "GBP", region: "europa" },
  PT: { name: "Portugal", locale: "pt-PT", currency: "EUR", region: "europa" },
  ES: { name: "Espanha", locale: "es-ES", currency: "EUR", region: "europa" },
  FR: { name: "França", locale: "fr-FR", currency: "EUR", region: "europa" },
  DE: { name: "Alemanha", locale: "de-DE", currency: "EUR", region: "europa" },
  IT: { name: "Itália", locale: "it-IT", currency: "EUR", region: "europa" },
  NL: { name: "Holanda", locale: "nl-NL", currency: "EUR", region: "europa" },
  BE: { name: "Bélgica", locale: "fr-BE", currency: "EUR", region: "europa" },
  IE: { name: "Irlanda", locale: "en-IE", currency: "EUR", region: "europa" },
  AT: { name: "Áustria", locale: "de-AT", currency: "EUR", region: "europa" },
  SE: { name: "Suécia", locale: "sv-SE", currency: "SEK", region: "europa" },
  NO: { name: "Noruega", locale: "nb-NO", currency: "NOK", region: "europa" },
  DK: { name: "Dinamarca", locale: "da-DK", currency: "DKK", region: "europa" },
  CH: { name: "Suíça", locale: "de-CH", currency: "CHF", region: "europa" },
  PL: { name: "Polônia", locale: "pl-PL", currency: "PLN", region: "europa" },
  US: { name: "Estados Unidos", locale: "en-US", currency: "USD", region: "americas" },
  CA: { name: "Canadá", locale: "en-CA", currency: "CAD", region: "americas" },
  MX: { name: "México", locale: "es-MX", currency: "MXN", region: "americas" },
  BR: { name: "Brasil", locale: "pt-BR", currency: "BRL", region: "americas" },
  AU: { name: "Austrália", locale: "en-AU", currency: "AUD", region: "outros" },
  NZ: { name: "Nova Zelândia", locale: "en-NZ", currency: "NZD", region: "outros" },
  JP: { name: "Japão", locale: "ja-JP", currency: "JPY", region: "outros" },
};
/** Grupos de países: mesmo arquivo que o robô lê. */
export const GROUPS = groups as Record<string, { label: string; countries: string[] }>;
export const DEFAULT_PAIS = "todos";
/** Destino de uma palavra-chave: um país ou um grupo. */
export const isScope = (c: string) => /^[A-Z]{2}$/.test(c) || c in GROUPS;
export const scopeList = (c: string) => GROUPS[c]?.countries ?? [c];
export const scopeName = (c: string) => GROUPS[c]?.label ?? countryName(c);
/** O filtro aceita um país ("GB"), um grupo ("europa", "big5") ou "todos". Devolve null para todos. */
export const paisList = (pais: string): string[] | null => (pais === "todos" ? null : scopeList(pais.toUpperCase()));
export const inPais = (pais: string, country: string | null | undefined) => {
  const list = paisList(pais);
  return !list || list.includes(country ?? "");
};
export const paisName = (pais: string) => (pais === "todos" ? "todos os países" : scopeName(pais.toUpperCase()));
/** Opções de grupo para os seletores de país. */
export const groupOptions = () => Object.entries(GROUPS).map(([code, g]) => ({ value: code.toLowerCase(), label: g.label, count: 0 }));
/** Moeda que a tela usa quando a pessoa não escolheu outra. */
export function defaultMoeda(pais: string): "BRL" | "USD" | "EUR" | "GBP" {
  if (pais === "europa") return "EUR";
  if (pais.toUpperCase() in GROUPS) return "USD";
  const c = COUNTRIES[pais]?.currency;
  return c === "BRL" || c === "EUR" || c === "GBP" || c === "USD" ? c : "USD";
}
/** Quanto 1 unidade da moeda vale em reais, pela tabela spend_model. */
export const rateOf = (rows: { currency: string; fx_to_brl: number | string }[], moeda: string) =>
  moeda === "BRL" ? 1 : Number(rows.find((r) => r.currency === moeda)?.fx_to_brl ?? 1);
export const countryName = (c: string | null | undefined) => COUNTRIES[(c || "BR").toUpperCase()]?.name ?? (c || "BR");
/** Código do país: bandeira em emoji não aparece no Chrome do Windows. */
export const flag = (c: string | null | undefined) => (c || "BR").toUpperCase();

/** País de uma chave ("us:d:loja.com" -> "US"). */
export const countryOfKey = (key: string) => key.match(/^([a-z]{2}):[ad]:/)?.[1].toUpperCase() ?? "BR";
/** Nome legível de uma chave ("us:d:loja.com" -> "loja.com"). */
export const keyLabel = (key: string) => key.replace(/^[a-z]{2}:(?=[ad]:)/, "").slice(2);
/** Chave válida de oferta (com ou sem país na frente). */
export const validKey = (k: string) => /^(?:[a-z]{2}:)?[ad]:[^\s]{1,200}$/.test(k);

export type DestType = "site" | "whatsapp" | "instagram" | "formulario" | "mensagem" | "app" | "ligacao";
export const DEST_LABEL: Record<DestType, string> = {
  site: "site", whatsapp: "whatsapp", instagram: "instagram", formulario: "formulário", mensagem: "mensagem", app: "app", ligacao: "ligação",
};

export const STATUSES = ["favorita", "analisando", "modelando", "testando", "descartada"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
  favorita: "★ favorita", analisando: "analisando", modelando: "modelando", testando: "testando", descartada: "descartada",
};

export const KIND_LABEL: Record<string, string> = {
  "produto fisico": "produto físico", infoproduto: "infoproduto", nutra: "nutra", servico: "serviço", app: "app", outro: "outro",
};

/** Endereço público de um arquivo no Storage do Supabase (com `download`, o navegador baixa em vez de abrir). */
export function storageUrl(bucket: string, path: string, download?: string): string | null {
  if (!process.env.SUPABASE_URL) return null;
  const base = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${path}`;
  return download ? `${base}?download=${encodeURIComponent(download)}` : base;
}

/** Endereço público da imagem guardada no Storage, ou o link original do Facebook. */
export function creativeSrc(path: string | null | undefined, fallback: string | null | undefined): string | null {
  if (path) return storageUrl("criativos", path) ?? fallback ?? null;
  return fallback ?? null;
}

/** "R$ 97" ou "R$ 97 – 297" (na moeda da página: US$, £, €, ¥...) */
export function priceRange(min: number | string | null, max: number | string | null, currency: string | null = "BRL"): string | null {
  if (min === null || min === undefined) return null;
  const cur = currency || "BRL";
  const a = Number(min), b = Number(max ?? min);
  let fmt: Intl.NumberFormat;
  try {
    fmt = new Intl.NumberFormat(cur === "BRL" ? "pt-BR" : "en-US", { style: "currency", currency: cur, maximumFractionDigits: cur === "JPY" ? 0 : 2 });
  } catch {
    fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
  }
  const f = (n: number) => fmt.format(n).replace(/[,.]00$/, "");
  if (a === b) return f(a);
  const sym = fmt.formatToParts(0).find((p) => p.type === "currency")?.value ?? "";
  return `${f(a)} – ${f(b).replace(sym, "").trim()}`;
}

/** "https://www.loja.com.br/products/kit-3?variant=1" -> "loja.com.br/products/kit-3" */
export function shortUrl(url: string, max = 38): string {
  try {
    const u = new URL(url);
    const s = u.hostname.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname.replace(/\/$/, ""));
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  } catch {
    return url.slice(0, max);
  }
}

export const fmtDate = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");

export const libraryLink = (q: string, country = "BR") =>
  `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&search_type=keyword_unordered&q=${encodeURIComponent(q)}`;

/** "há 45 dias" */
export const daysLabel = (d: number | null | undefined) => (d === null || d === undefined ? "—" : d <= 0 ? "hoje" : d === 1 ? "1 dia" : `${d} dias`);

/** Países com biblioteca pública de anúncios do TikTok (lei europeia). */
export const TIKTOK_LIB = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IE", "IT", "LV", "LI", "LT", "LU", "MT",
  "NL", "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "CH", "TR", "GB",
]);
