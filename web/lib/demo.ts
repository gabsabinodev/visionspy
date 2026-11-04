/**
 * Modo demonstração (VISIONSPY_DEMO=1): dados de exemplo no lugar do Supabase, para ver o painel
 * sem banco. Todas as marcas, sites e números abaixo são inventados.
 */
import { adEstMonth, adPhase, type SpendRow } from "./spend";

type Row = Record<string, unknown>;

const DAY = 864e5;
const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
const minsAgo = (m: number) => new Date(Date.now() - m * 60e3).toISOString();

const MODEL: SpendRow[] = [
  { country: "*", currency: "USD", fx_to_brl: 5.4, budget_test: 20, budget_scale: 40, budget_winner: 70 },
  { country: "BR", currency: "BRL", fx_to_brl: 1, budget_test: 30, budget_scale: 60, budget_winner: 100 },
  { country: "US", currency: "USD", fx_to_brl: 5.4, budget_test: 20, budget_scale: 40, budget_winner: 70 },
  { country: "PT", currency: "EUR", fx_to_brl: 6.25, budget_test: 10, budget_scale: 20, budget_winner: 35 },
  { country: "DE", currency: "EUR", fx_to_brl: 6.25, budget_test: 15, budget_scale: 30, budget_winner: 50 },
  { country: "GB", currency: "GBP", fx_to_brl: 7.2, budget_test: 15, budget_scale: 30, budget_winner: 50 },
];

/** Criativo de mentira: um cartaz com a frase do anúncio, para a grade não ficar vazia. */
function poster(text: string, seed: number, video: boolean): string {
  const hue = 190 + (seed * 47) % 70;
  const words = text.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).slice(0, 9);
  const lines: string[] = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last && (last + " " + w).length <= 15) lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
  }
  const tspans = lines.slice(0, 5).map((l, i) => `<tspan x="28" dy="${i ? 44 : 0}">${l.replace(/&/g, "&amp;")}</tspan>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 48% 30%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360} 42% 16%)"/></linearGradient></defs><rect width="320" height="400" fill="url(#g)"/><circle cx="${250 - seed % 90}" cy="${310 - seed % 120}" r="${70 + seed % 40}" fill="hsl(${(hue + 170) % 360} 60% 62% / .25)"/><text x="28" y="84" fill="#fff" font-family="Arial, sans-serif" font-size="34" font-weight="700">${tspans}</text>${video ? `<circle cx="160" cy="330" r="30" fill="#0008"/><path d="M151 315v30l25-15z" fill="#fff"/>` : ""}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface Seed {
  key: string; name: string; pages: string[]; domain: string | null; country?: string; niche: string; kind: string;
  promise: string; mechanism?: string; offer?: string; audience?: string; risk: string; riskReason?: string;
  platform?: string; checkout?: string; price: [number, number] | null; cod?: boolean; vsl?: boolean; pixels?: string[];
  google: number | null; texts: string[]; ads: [days: number, copies: number, rank: number | null, video?: 1][];
  week: number | null; status?: string; note?: string; watched?: boolean; kit?: boolean; clones?: number;
}

const SEEDS: Seed[] = [
  { key: "d:lumiderm.com.br", name: "Lumiderm Sérum", pages: ["Lumiderm", "Dra. Helena Prado", "Clara Beauty"], domain: "lumiderm.com.br", niche: "Beleza e skincare", kind: "produto fisico", promise: "Clarear manchas do rosto em 28 dias", mechanism: "Ácido tranexâmico estabilizado", offer: "Leve 3 pague 2 com frete grátis", audience: "mulheres de 35 a 55 anos", risk: "medio", riskReason: "promessa de resultado com prazo", platform: "Shopify", checkout: "Yampi", price: [97, 297], vsl: true, pixels: ["Meta", "TikTok", "GTM"], google: 300, texts: ["Manchas no rosto que nada resolvia? Em 28 dias a pele muda de vez", "Leve 3 pague 2: o sérum que esgotou três vezes neste ano"], ads: [[74, 22, 3, 1], [61, 14, 7], [33, 9, 22, 1], [12, 4, 40], [5, 2, 66, 1], [2, 1, null]], week: 28, status: "modelando", note: "Testar o ângulo do antes e depois com dermatologista.", watched: true, kit: true, clones: 2 },
  { key: "d:slimbiotic.com.br", name: "SlimBiotic", pages: ["SlimBiotic", "Rotina Leve", "Camila Fit"], domain: "slimbiotic.com.br", niche: "Emagrecimento", kind: "nutra", promise: "Desinchar a barriga em 21 dias", mechanism: "Fibras e probióticos para o intestino", offer: "Compre 2 leve 3", audience: "mulheres de 30 a 50 anos", risk: "alto", riskReason: "promessa de emagrecimento com prazo", platform: "Shopify", checkout: "Yampi", price: [147, 397], vsl: true, cod: true, pixels: ["Meta", "Kwai"], google: 120, texts: ["Barriga inchada todo dia? O problema pode estar no seu intestino", "Compre 2 leve 3 só até domingo: o desafio de 21 dias voltou"], ads: [[48, 18, 2, 1], [36, 12, 9, 1], [16, 8, 15], [6, 6, 18, 1], [4, 5, 31, 1], [3, 3, 44], [1, 2, null, 1]], week: 22, kit: true },
  { key: "d:pilatesemcasa.com", name: "Pilates em Casa 50+", pages: ["Pilates em Casa"], domain: "pilatesemcasa.com", niche: "Fitness", kind: "infoproduto", promise: "Aliviar dores nas costas com 15 minutos por dia", mechanism: "Desafio de 7 dias com aulas ao vivo", offer: "Desafio por R$ 47 com acesso imediato", audience: "mulheres 50+", risk: "baixo", platform: "WordPress", checkout: "Hotmart", price: [47, 97], vsl: true, pixels: ["Meta"], google: 8, texts: ["Dor nas costas depois dos 50 não é normal. Comece hoje em casa", "Sete dias de pilates ao vivo para quem nunca fez exercício"], ads: [[91, 16, 4, 1], [40, 11, 12, 1], [8, 3, 28, 1]], week: 26, status: "favorita", kit: true },
  { key: "d:cabelonovo.com.br", name: "Cabelo Novo", pages: ["Cabelo Novo", "Dr. Marcos Tricologia"], domain: "cabelonovo.com.br", niche: "Saúde e bem-estar", kind: "nutra", promise: "Reduzir a queda de cabelo em 60 dias", mechanism: "Biotina de alta absorção", offer: "Kit de 3 meses com garantia de 30 dias", risk: "alto", riskReason: "alegações de saúde sem comprovação", platform: "Nuvemshop", checkout: "Appmax", price: [129, 349], pixels: ["Meta", "Google Ads"], google: 45, texts: ["Queda de cabelo não é só genética. Veja o que muda em 60 dias", "O ralo cheio de fios acabou: kit de 3 meses com garantia"], ads: [[66, 12, 6, 1], [22, 7, 19, 1], [10, 5, 35]], week: 14, clones: 1 },
  { key: "d:ingleseminutos.com.br", name: "Inglês em Minutos", pages: ["Inglês em Minutos", "Prof. Daniel"], domain: "ingleseminutos.com.br", niche: "Idiomas", kind: "infoproduto", promise: "Destravar a conversação em 90 dias", mechanism: "Frases prontas em áudio", offer: "Curso com bônus e garantia de 7 dias", risk: "baixo", platform: "Framer", checkout: "Kiwify", price: [197, 497], vsl: true, pixels: ["Meta", "TikTok"], google: 22, texts: ["Você entende inglês mas trava na hora de falar? Isso tem nome", "Quinze minutos por dia e a conversa destrava em 90 dias"], ads: [[120, 10, 8, 1], [55, 8, 14, 1], [19, 4, 33, 1], [6, 2, 70, 1]], week: 16, kit: true },
  { key: "d:artrofit.com.br", name: "ArtroFit", pages: ["ArtroFit"], domain: "artrofit.com.br", niche: "Saúde e bem-estar", kind: "nutra", promise: "Mais mobilidade para joelhos e juntas", mechanism: "Colágeno tipo 2 não desnaturado", offer: "Leve 3 pague 2, paga na entrega", risk: "alto", riskReason: "alegações de saúde", platform: "Yampi", checkout: "Logzz", price: [119, 319], cod: true, pixels: ["Meta", "Kwai", "Utmify"], google: 0, texts: ["Joelho travando na escada? Receba em casa e pague só na entrega", "Pague só quando chegar: o colágeno que virou febre"], ads: [[28, 9, 11, 1], [15, 7, 17], [4, 4, 37, 1]], week: 8, clones: 2 },
  { key: "d:patapura.com.br", name: "Pata Pura", pages: ["Pata Pura", "Mundo Pet Brasil"], domain: "patapura.com.br", niche: "Pets", kind: "produto fisico", promise: "Acabar com a coceira do cachorro sem remédio", offer: "Kit banho e spray com frete grátis", risk: "baixo", platform: "Shopify", checkout: "Cartpanda", price: [79, 189], pixels: ["Meta", "TikTok"], google: 12, texts: ["Seu cachorro se coça o dia inteiro? Pode não ser pulga", "Kit banho e spray: frete grátis para todo o Brasil hoje"], ads: [[17, 6, 13, 1], [9, 5, 24, 1], [3, 3, 52]], week: null, kit: false },
  { key: "d:rendaporcelular.com.br", name: "Renda pelo Celular", pages: ["Renda pelo Celular", "Thiago Vendas"], domain: "rendaporcelular.com.br", niche: "Renda extra", kind: "infoproduto", promise: "Primeira venda como afiliado em 7 dias", offer: "R$ 37 com acesso imediato", risk: "alto", riskReason: "promessa de ganho financeiro", platform: "Elementor", checkout: "Kirvano", price: [37, 97], vsl: true, pixels: ["Meta"], google: null, texts: ["Comece do zero, só com o celular, sem aparecer em vídeo", "Sete dias para a primeira venda: veja como funciona"], ads: [[11, 8, 16, 1], [6, 6, 26, 1], [2, 4, 41, 1]], week: null },
  { key: "d:saboresleves.com.br", name: "Sabores Leves", pages: ["Sabores Leves", "Chef Sandra Lima"], domain: "saboresleves.com.br", niche: "Receitas", kind: "infoproduto", promise: "Mais de 200 receitas sem açúcar para diabéticos", offer: "Receba antes, pague depois", risk: "medio", riskReason: "tema de saúde", platform: "WordPress", checkout: "Kiwify", price: [27, 47], pixels: ["Meta"], google: 3, texts: ["Pão, bolo e sobremesa sem açúcar. Receba antes, pague depois", "Mais de 200 receitas para comer bem com diabetes"], ads: [[45, 9, 10], [27, 6, 21], [13, 3, 47]], week: 15 },
  { key: "d:noitetranquila.com.br", name: "Noite Tranquila", pages: ["Noite Tranquila"], domain: "noitetranquila.com.br", niche: "Saúde e bem-estar", kind: "nutra", promise: "Dormir melhor sem remédio tarja preta", offer: "Compre 3 leve 5", risk: "alto", riskReason: "tema de saúde mental", platform: "Shopify", checkout: "Shopify", price: [89, 289], pixels: ["Meta", "TikTok", "Clarity"], google: 60, texts: ["Acorda às 3 da manhã e não dorme mais? Isso tem explicação", "Compre 3 leve 5 só nesta semana"], ads: [[37, 7, 20, 1], [14, 3, 48, 1]], week: 11, watched: true },
  { key: "d:casaseca.com.br", name: "Casa Seca", pages: ["Casa Seca"], domain: "casaseca.com.br", niche: "Casa e decoração", kind: "produto fisico", promise: "Acabar com mofo e umidade em armários", offer: "Kit com 6 unidades", risk: "baixo", platform: "Shopify", checkout: "Cartpanda", price: [59, 119], pixels: ["Meta"], google: 18, texts: ["O cheiro de mofo no armário some em dois dias", "Kit com 6 unidades para a casa inteira"], ads: [[52, 5, 25], [20, 3, 39]], week: 12, status: "descartada" },
  { key: "d:modalinda.com.br", name: "Moda Linda", pages: ["Moda Linda"], domain: "modalinda.com.br", niche: "Moda e acessórios", kind: "produto fisico", promise: "Calça que modela sem apertar", offer: "Leve 3 pague 2", risk: "baixo", platform: "Nuvemshop", checkout: "Nuvemshop", price: [99, 239], cod: false, pixels: ["Meta", "Google Ads"], google: 150, texts: ["A calça que modela a cintura e não aperta em nada", "Leve 3 pague 2 em toda a coleção"], ads: [[9, 3, 34, 1], [5, 2, 58], [1, 1, null, 1]], week: 2 },
  { key: "d:mentezen.app", name: "MenteZen", pages: ["MenteZen"], domain: "mentezen.app", niche: "Saúde e bem-estar", kind: "app", promise: "Reduzir a ansiedade com 5 minutos por dia", offer: "Sete dias grátis", risk: "medio", riskReason: "tema de saúde mental", platform: "Webflow", checkout: "Stripe", price: [29.9, 29.9], pixels: ["Meta", "Google Analytics"], google: 30, texts: ["Cinco minutos por dia para a cabeça parar de acelerar"], ads: [[3, 4, 29, 1], [2, 2, 62, 1]], week: null },
  { key: "d:gigamagazine.com.br", name: "Giga Magazine", pages: ["Giga Magazine"], domain: "gigamagazine.com.br", niche: "Casa e decoração", kind: "produto fisico", promise: "Ofertas de varejo em toda a loja", risk: "baixo", platform: "VTEX", checkout: "VTEX", price: [19, 4999], pixels: ["Meta", "Google Ads", "TikTok"], google: 20000, texts: ["Semana do cliente com até 70% de desconto"], ads: [[210, 30, 1], [40, 12, 5]], week: 40 },
  { key: "a:clube do bem estar", name: "Clube do Bem-Estar", pages: ["Clube do Bem-Estar"], domain: null, niche: "Saúde e bem-estar", kind: "outro", promise: "Consulta online por R$ 25", risk: "medio", price: null, google: null, texts: ["Atendimento médico sem sair de casa, a partir de R$ 25"], ads: [[1, 1, null]], week: null },
  { key: "us:d:glowpatch.co", name: "GlowPatch", pages: ["GlowPatch", "Glow Daily"], domain: "glowpatch.co", country: "US", niche: "Emagrecimento", kind: "produto fisico", promise: "Patch that curbs cravings in 2 weeks", offer: "Buy 2 get 1 free", risk: "alto", riskReason: "weight loss claim", platform: "Shopify", checkout: "Shopify", price: [39.95, 89.9], pixels: ["Meta", "TikTok"], google: 140, texts: ["The patch everyone is talking about. Buy 2 get 1 free today", "Cravings gone in two weeks or your money back"], ads: [[64, 16, 5, 1], [31, 9, 12, 1], [8, 5, 30, 1]], week: 20, watched: true, kit: false },
  { key: "us:d:pawsafe.co", name: "PawSafe", pages: ["PawSafe"], domain: "pawsafe.co", country: "US", niche: "Pets", kind: "produto fisico", promise: "Joint relief chews for senior dogs", offer: "30-day money back", risk: "medio", platform: "Shopify", checkout: "Shopify", price: [34, 99], pixels: ["Meta"], google: 9, texts: ["Your senior dog deserves joint relief. Vet-formulated chews"], ads: [[42, 7, 18, 1], [16, 3, 42]], week: 7 },
  { key: "gb:d:glowbalm.co.uk", name: "GlowBalm", pages: ["GlowBalm", "Skin by Amy"], domain: "glowbalm.co.uk", country: "GB", niche: "Beleza e skincare", kind: "produto fisico", promise: "Calm redness in 14 days", offer: "Buy 2 get 1 free", risk: "medio", platform: "Shopify", checkout: "Shopify", price: [24, 69], pixels: ["Meta", "TikTok"], google: 35, texts: ["Redness that nothing else could calm. See the 14 day change", "Buy 2 get 1 free, next day delivery across the UK"], ads: [[58, 14, 4, 1], [29, 8, 11, 1], [6, 4, 26]], week: 18, kit: false },
  { key: "gb:d:sleepwell.co.uk", name: "SleepWell", pages: ["SleepWell"], domain: "sleepwell.co.uk", country: "GB", niche: "Saúde e bem-estar", kind: "nutra", promise: "Fall asleep in 15 minutes", offer: "30 day guarantee", risk: "medio", platform: "Shopify", checkout: "Shopify", price: [19, 49], pixels: ["Meta"], google: 12, texts: ["Still awake at 3am? There is a reason for that"], ads: [[33, 7, 15, 1], [9, 3, 40]], week: 7 },
  { key: "de:d:rueckenfrei.de", name: "RückenFrei", pages: ["RückenFrei", "Dr. Weber"], domain: "rueckenfrei.de", country: "DE", niche: "Saúde e bem-estar", kind: "produto fisico", promise: "Rückenschmerzen in 2 Wochen lindern", offer: "Kauf auf Rechnung", risk: "medio", platform: "Shopify", checkout: "Shopify", price: [39, 119], cod: true, pixels: ["Meta", "Google Ads"], google: 80, texts: ["Rückenschmerzen im Büro? So wirst du sie los", "Jetzt bestellen, kostenloser Versand"], ads: [[71, 12, 6, 1], [38, 9, 13], [10, 5, 30, 1]], week: 20 },
  { key: "pt:d:pelelisa.pt", name: "Pele Lisa", pages: ["Pele Lisa"], domain: "pelelisa.pt", country: "PT", niche: "Beleza e skincare", kind: "produto fisico", promise: "Rugas mais suaves em 30 dias", offer: "Pagamento na entrega", risk: "medio", platform: "Shopify", checkout: "Shopify", price: [29, 79], cod: true, pixels: ["Meta"], google: 4, texts: ["Rugas mais suaves em 30 dias. Paga só quando receber", "Envio grátis para todo Portugal"], ads: [[35, 8, 9, 1], [12, 4, 27]], week: 9 },
];

const score = (s: Seed, copies: number, growth: number) => {
  const g = s.google ?? 0;
  return copies + 2 * s.ads.length + 5 * Math.max(s.pages.length - 1, 0) + (g >= 100 ? 10 : g >= 10 ? 5 : 0) + 2 * Math.max(growth, 0);
};
const modelOf = (c: string) => MODEL.find((m) => m.country === c) ?? MODEL[0];
const countryOf = (s: Seed) => s.country ?? "BR";

const ALL_ADS: Row[] = SEEDS.flatMap((s, si) => {
  const country = countryOf(s);
  const m = modelOf(country);
  return s.ads.map(([days, copies, rank, video], i) => {
    const body = s.texts[i % s.texts.length];
    const est = Math.round(adEstMonth(days, copies, rank, m));
    return {
      library_id: String(900000 + si * 100 + i), offer_key: s.key, advertiser: s.pages[i % s.pages.length], domain: s.domain, body,
      start_date: daysAgo(days), copies, keywords: [s.niche.toLowerCase()], page_url: `https://www.facebook.com/${s.key.replace(/\W/g, "")}`,
      landing_url: s.domain ? `https://${s.domain}/oferta` : null, thumb_url: poster(body, si * 13 + i * 7 + 3, !!video), thumb_path: null,
      media_type: video ? "video" : "image", media_path: null, video_url: null, cta: "Saiba mais", dest_type: s.domain ? "site" : "mensagem",
      country, first_seen: minsAgo(60 * 24 * Math.min(days, 9)), last_seen: minsAgo(40), best_rank: rank, body_hash: `h${si}-${i % s.texts.length}`,
      days_running: days, phase: adPhase(days, copies), est_month: est, est_currency: m.currency, est_month_brl: Math.round(est * m.fx_to_brl),
      heat_v: Math.round(est * m.fx_to_brl), niche: s.niche, kind: s.kind, promise: s.promise, risk: s.risk, status: s.status ?? null, big_brand: (s.google ?? 0) >= 1000,
    };
  });
});
// clones: o mesmo texto aparece em outra loja (exemplo para a tela)
const shared = "h0-0";
for (const a of ALL_ADS) if (a.offer_key === "d:cabelonovo.com.br" && a.library_id === String(900300)) a.body_hash = shared;

const FEED = ALL_ADS.filter((a) => a.status !== "descartada");

const OFFERS: Row[] = SEEDS.map((s) => {
  const ads = ALL_ADS.filter((a) => a.offer_key === s.key);
  const copies = ads.reduce((n, a) => n + (a.copies as number), 0);
  const oldest = Math.max(...ads.map((a) => a.days_running as number));
  const growth = s.week === null ? 0 : copies - s.week;
  const launched = ads.filter((a) => (a.days_running as number) <= 7).length;
  const gain = s.week !== null ? Math.max(copies - s.week, 0) : oldest <= 14 ? copies : 0;
  const m = modelOf(countryOf(s));
  const est = ads.reduce((n, a) => n + (a.est_month as number), 0);
  const order = ["vencedor", "escalando", "teste"];
  return {
    offer_key: s.key, advertiser: s.name, advertisers: s.pages, domain: s.domain, last_day: today, cards: ads.length, copies, pages: s.pages.length,
    oldest_start: daysAgo(oldest), keywords: [s.niche.toLowerCase()], sample_text: s.texts[0], cards_7d: s.week === null ? null : Math.max(ads.length - 1, 1),
    copies_7d: s.week, copies_growth: growth, google_ads: s.google, first_seen: s.week === null ? daysAgo(Math.min(oldest, 5)) : daysAgo(30), score: score(s, copies, growth),
    landing_url: ads[0].landing_url, page_url: ads[0].page_url, thumb_url: ads[0].thumb_url, dest_type: ads[0].dest_type, thumb_path: null,
    platform: s.platform ?? null, checkout: s.checkout ?? null, price_min: s.price?.[0] ?? null, price_max: s.price?.[1] ?? null, installments: s.price ? `12x de R$ ${(s.price[1] / 10).toFixed(2).replace(".", ",")}` : null,
    cod: !!s.cod, has_vsl: !!s.vsl, pixels: s.pixels ?? [], niche: s.niche, kind: s.kind, audience: s.audience ?? null, promise: s.promise, mechanism: s.mechanism ?? null,
    offer: s.offer ?? null, risk: s.risk, risk_reason: s.riskReason ?? null, status: s.status ?? null, note: s.note ?? null, discarded: s.status === "descartada",
    country: countryOf(s), days_running: oldest, ads_active: ads.length, long_runners: ads.filter((a) => (a.days_running as number) >= 30).length,
    new_ads_7d: launched, media_count: 0, cooling: s.week !== null && copies - s.week <= -Math.max(3, s.week * 0.3), watched: !!s.watched, has_kit: !!s.kit,
    currency: m.currency === "BRL" ? "BRL" : m.currency, launched_7d: launched, est_month: est, est_month_brl: Math.round(est * m.fx_to_brl), est_currency: m.currency,
    phase: ads.map((a) => a.phase as string).sort((a, b) => order.indexOf(a) - order.indexOf(b))[0], clones: s.clones ?? 0, big_brand: (s.google ?? 0) >= 1000,
    momentum: 3 * launched + 2 * gain,
  };
});

const trendOf = (s: Seed, copies: number) => {
  const start = s.week ?? Math.max(Math.round(copies * 0.3), 1);
  return Array.from({ length: 14 }, (_, i) => Math.max(Math.round(start + ((copies - start) * i) / 13 + Math.sin(i * 1.7 + copies) * Math.max(copies * 0.04, 1)), 0));
};
const TRENDS: Row[] = OFFERS.map((o, i) => ({ offer_key: o.offer_key, points: trendOf(SEEDS[i], o.copies as number) }));

const SNAPSHOTS: Row[] = OFFERS.flatMap((o, i) => (TRENDS[i].points as number[]).map((copies, d) => ({
  offer_key: o.offer_key, day: daysAgo(13 - d), cards: Math.max(Math.round((o.cards as number) * (0.5 + d / 26)), 1), copies, pages: o.pages,
})));

const KEYWORDS: Row[] = [
  ...["frete grátis", "pagamento na entrega", "acesso imediato", "compre 2 leve 3", "renda extra", "emagrecer", "pague depois", "últimas unidades", "garantia de 30 dias", "colágeno", "receitas", "menopausa", "dores", "queda de cabelo", "cachorro", "rugas"].map((term) => [term, "BR"]),
  ["free shipping", "US"], ["weight loss", "US"], ["pagamento na entrega", "PT"], ["envio grátis", "PT"], ["buy one get one free", "GB"], ["kostenloser versand", "DE"],
].map(([term, country], i) => ({ id: i + 1, term, country, active: i !== 4 }));
for (const o of OFFERS) o.keywords = [...(o.keywords as string[]), KEYWORDS[(o.advertiser as string).length % 16].term as string];

const KITS: Row[] = [{
  offer_key: "d:lumiderm.com.br", model: "gemini-flash-lite-latest", updated_at: new Date().toISOString(),
  structure: {
    resumo: "Sérum para manchas vendido com promessa de 28 dias, três kits e dermatologista como prova.",
    publico: "mulheres de 35 a 55 anos", promessa: "Clarear manchas em 28 dias", mecanismo: "ácido tranexâmico estabilizado", angulo: "autoridade médica e antes e depois",
    secoes: [
      { tipo: "headline", titulo: "Manchas em 28 dias", resumo: "promessa com prazo e foto de antes e depois" },
      { tipo: "vsl", titulo: "Vídeo da dermatologista", resumo: "explica o mecanismo em 4 minutos" },
      { tipo: "prova social", titulo: "Quem já usou", resumo: "depoimentos em vídeo de clientes" },
      { tipo: "oferta", titulo: "Escolha seu kit", resumo: "3 kits, o do meio destacado como mais vendido" },
      { tipo: "garantia", titulo: "30 dias", resumo: "devolução sem perguntas" },
    ],
    oferta: { kits: [{ nome: "1 frasco", preco: "R$ 97" }, { nome: "3 frascos (leve 3 pague 2)", preco: "R$ 197" }, { nome: "5 frascos", preco: "R$ 297" }], bonus: ["guia de rotina"], garantia: "30 dias", frete: "grátis", pagamento: "pix e cartão em 12x", escassez: "cupom do dia" },
    provas: ["dermatologista", "depoimentos em vídeo", "número de clientes"], objecoes: ["preço", "demora para ver resultado"], ctas: ["QUERO MEU KIT"],
    funil: "anúncio → página com VSL → checkout Yampi → order bump", ideias_de_teste: ["ângulo de autoridade", "kit de entrada mais barato", "UGC de rotina matinal"],
  },
  my_input: null, my_version: null, my_model: null, my_updated_at: null,
}];

const WATCH: Row[] = [
  { id: 1, offer_key: "d:lumiderm.com.br", label: "Lumiderm Sérum", term: "lumiderm.com.br", country: "BR", created_at: minsAgo(9000) },
  { id: 2, offer_key: "d:noitetranquila.com.br", label: "Noite Tranquila", term: "noitetranquila.com.br", country: "BR", created_at: minsAgo(5000) },
  { id: 3, offer_key: "us:d:glowpatch.co", label: "GlowPatch", term: "glowpatch.co", country: "US", created_at: minsAgo(3000) },
  { id: 4, offer_key: null, label: "concorrente.com.br", term: "concorrente.com.br", country: "BR", created_at: minsAgo(200) },
];

const TT_TOP: Row[] = [
  ["7000000000000000001", "BR", "Caldo de ossos de verdade, pronto em 5 minutos. Conheça!", "Caldo Real", "Alimentos e bebidas", "conversões", 1240, 0.67, 29],
  ["7000000000000000002", "BR", "30 brincadeiras sem tela para imprimir. Kit por R$ 17,90!", "Sem Tela Kids", "Educação", "conversões", 870, 0.74, 21],
  ["7000000000000000003", "BR", "A chuteira que virou febre no society. Leve 2 pague 1.", "Campo Pro", "Esportes", "tráfego", 2310, 0.88, 18],
  ["7000000000000000004", "US", "Score every point. New grip socks, buy 2 get 1 free.", "GripPro", "Esportes", "tráfego", 5320, 0.93, 18],
].map(([id, country, ad_title, brand_name, industry, objective, likes, ctr, duration], i) => ({
  id, country, ad_title, brand_name, industry, objective, likes, ctr, duration, cover_url: poster(String(ad_title), i * 31 + 9, true), video_url: null, thumb_path: null,
  media_path: null, best_rank: i + 1, first_seen: new Date(Date.now() - (i === 1 ? 3600e3 : 5 * DAY)).toISOString(), last_seen: new Date().toISOString(),
}));

const IGNORED: Row[] = ["Shopee", "Mercado Livre", "AliExpress", "Amazon.com.br", "SHEIN Brasil"].map((name) => ({ name }));

const RA: Row[] = [
  ["Lumiderm", "Não Recomendada", 320, "lumiderm"], ["Loja Exemplo Dois", "Ótima", 223, null], ["Farmácia Modelo", "Não Recomendada", 217, null],
  ["ArtroFit", "Não Recomendada", 186, "artrofit"], ["Comércio Digital XYZ", "Não Recomendada", 170, null], ["SlimBiotic", "Regular", 150, "slimbiotic"],
].map(([name, reputation, complaints, slug], i) => ({ day: today, position: i + 1, name, reputation, complaints, slug }));

const RUNS: Row[] = [
  { id: 9, source: "alertas", ok: true, items: 2, message: "", finished_at: minsAgo(38) },
  { id: 8, source: "ia", ok: true, items: 24, message: "gemini-flash-latest", finished_at: minsAgo(39) },
  { id: 7, source: "paginas", ok: true, items: 31, message: "", finished_at: minsAgo(41) },
  { id: 6, source: "reclameaqui", ok: true, items: 20, message: "", finished_at: minsAgo(43) },
  { id: 5, source: "tiktok", ok: true, items: 40, message: "BR 20, US 20", finished_at: minsAgo(44) },
  { id: 4, source: "google", ok: true, items: 12, message: "", finished_at: minsAgo(45) },
  { id: 3, source: "criativos", ok: true, items: 118, message: "", finished_at: minsAgo(47) },
  { id: 2, source: "meta", ok: true, items: 1240, message: "média 92 anúncios/busca", finished_at: minsAgo(48) },
  { id: 1, source: "meta", ok: false, items: 0, message: "A Meta pediu login para a busca: o IP do robô pode ter sido bloqueado.", finished_at: minsAgo(60 * 9) },
];

const LANDINGS: Row[] = OFFERS.filter((o) => o.landing_url).map((o, i) => ({
  url: o.landing_url, final_url: o.landing_url, shot_path: null, currency: o.currency, title: o.promise, platform: o.platform, checkout: o.checkout,
  prices: o.price_min ? [o.price_min, o.price_max] : [], price_min: o.price_min, price_max: o.price_max, installments: o.installments, cod: o.cod, has_vsl: o.has_vsl,
  has_countdown: i % 2 === 0, has_whatsapp: i % 3 === 0, pixels: o.pixels, error: null, checked_at: minsAgo(41),
  tracking_ids: i < 2 ? ["meta:1200000000000001", "gtm:GTM-ABC123"] : [`meta:12000000000000${i + 10}`],
}));

const TABLES: Record<string, Row[]> = {
  offer_ranking: OFFERS, offer_snapshots: SNAPSHOTS, offer_trends: TRENDS, ads: ALL_ADS, ad_feed: FEED, keywords: KEYWORDS,
  ignored_advertisers: IGNORED, ra_new_companies: RA, runs: RUNS, spend_model: MODEL as unknown as Row[],
  landing_pages: LANDINGS, offer_aliases: [], offer_insights: [], alerts_sent: [], saved_views: [
    { id: 1, name: "Vencedores com investimento alto", page: "/", query: "fase=vencedor&de=25000", created_at: minsAgo(500) },
    { id: 2, name: "Europa em libra", page: "/", query: "pais=europa&moeda=GBP&de=5000", created_at: minsAgo(400) },
  ],
  offer_kits: KITS, ad_transcripts: [{ library_id: "900000", hook: "Mulher olha o espelho: \"isso nunca saía\"", structure: "gancho → problema → autoridade → prova → oferta", cta: "Toque em saiba mais", transcript: "Isso nunca saía da minha pele até eu entender o motivo." }],
  watchlist: WATCH, tiktok_top_ads: TT_TOP, tiktok_library_ads: [], tiktok_watch_counts: [],
  offer_notes: OFFERS.filter((o) => o.status).map((o) => ({ offer_key: o.offer_key, status: o.status, note: o.note, updated_at: today })),
  ad_heat: Object.values(FEED.filter((a) => !a.big_brand).reduce<Record<string, Row>>((acc, a) => {
    const k = `${a.country}|${a.heat_v}`;
    const row = (acc[k] ??= { country: a.country, heat_v: a.heat_v, ads: 0 });
    row.ads = (row.ads as number) + 1;
    return acc;
  }, {})),
  ad_facets: Object.values(FEED.filter((a) => !a.big_brand).reduce<Record<string, Row>>((acc, a) => {
    const k = `${a.country}|${a.niche}|${a.phase}`;
    const row = (acc[k] ??= { country: a.country, niche: a.niche, phase: a.phase, ads: 0 });
    row.ads = (row.ads as number) + 1;
    return acc;
  }, {})),
};

/** Imita o encadeamento do supabase-js o suficiente para as páginas do painel. */
class Query implements PromiseLike<{ data: Row[] | Row | null; error: null; count: number | null }> {
  private rows: Row[];
  private single = false;
  private head = false;
  private counted = false;
  private ordered = false;
  private limitN = Infinity;
  constructor(table: string) { this.rows = [...(TABLES[table] ?? [])]; }
  select(_cols?: string, opts: { count?: string; head?: boolean } = {}) { this.counted = !!opts.count; this.head = !!opts.head; return this; }
  private cmp(col: string, v: unknown, test: (a: number | string, b: number | string) => boolean) {
    this.rows = this.rows.filter((r) => {
      const x = r[col];
      if (x === null || x === undefined) return false;
      return typeof v === "number" ? test(Number(x), v) : test(String(x), String(v));
    });
    return this;
  }
  gt(col: string, v: number | string) { return this.cmp(col, v, (a, b) => a > b); }
  gte(col: string, v: number | string) { return this.cmp(col, v, (a, b) => a >= b); }
  lte(col: string, v: number | string) { return this.cmp(col, v, (a, b) => a <= b); }
  eq(col: string, v: unknown) { this.rows = this.rows.filter((r) => r[col] === v); return this; }
  neq(col: string, v: unknown) { this.rows = this.rows.filter((r) => r[col] !== v); return this; }
  not(col: string, op: string, v: unknown) { if (op === "is" && v === null) this.rows = this.rows.filter((r) => r[col] !== null && r[col] !== undefined); return this; }
  is(col: string, v: null) { this.rows = this.rows.filter((r) => r[col] === v || r[col] === undefined); return this; }
  in(col: string, vals: unknown[]) { this.rows = this.rows.filter((r) => vals.includes(r[col])); return this; }
  contains(col: string, vals: unknown[]) { this.rows = this.rows.filter((r) => vals.every((v) => (r[col] as unknown[] | undefined)?.includes(v))); return this; }
  overlaps(col: string, vals: unknown[]) { this.rows = this.rows.filter((r) => vals.some((v) => (r[col] as unknown[] | undefined)?.includes(v))); return this; }
  // "checkout.eq.Yampi,platform.eq.Yampi", "copies.gte.3,pages.gte.2" e "advertiser.ilike.%x%,domain.ilike.%x%"
  or(expr: string): this {
    const nested = expr.match(/^and\(or\((.*)\),or\((.*)\)\)$/);
    if (nested) return this.or(nested[1]).or(nested[2]);
    const conds = expr.split(",").map((c) => { const [col, op, ...v] = c.split("."); return { col, op, v: v.join(".") }; });
    this.rows = this.rows.filter((r) => conds.some(({ col, op, v }) => {
      const x = r[col];
      if (op === "ilike") return String(x ?? "").toLowerCase().includes(v.replace(/%/g, "").toLowerCase());
      if (op === "eq") return String(x) === v;
      if (op === "is") return x === null || x === undefined;
      if (typeof x !== "number") return false;
      return op === "gte" ? x >= Number(v) : op === "gt" ? x > Number(v) : op === "lt" ? x < Number(v) : false;
    }));
    return this;
  }
  order(col: string, opts: { ascending?: boolean } = {}) {
    if (this.ordered) return this; // só a primeira ordenação conta (o desempate não muda o exemplo)
    this.ordered = true;
    const asc = opts.ascending ?? true;
    this.rows.sort((a, b) => {
      const x = a[col] as number | string | null, y = b[col] as number | string | null;
      if (x === y) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (x < y ? -1 : 1) * (asc ? 1 : -1);
    });
    return this;
  }
  limit(n: number) { this.limitN = n; return this; } // aplicado no fim, como no banco
  like() { return this; }
  ilike() { return this; }
  delete() { return this; }
  insert() { return this; }
  maybeSingle() { this.single = true; return this; }
  upsert() { return this; }
  update() { return this; }
  then<A, B>(ok?: ((v: { data: Row[] | Row | null; error: null; count: number | null }) => A | PromiseLike<A>) | null, fail?: ((e: unknown) => B | PromiseLike<B>) | null) {
    const rows = this.rows.slice(0, this.limitN);
    const data = this.head ? null : this.single ? rows[0] ?? null : rows;
    const count = this.counted ? this.rows.length : null;
    return Promise.resolve({ data, error: null, count }).then(ok, fail);
  }
}

export const demoClient = { from: (table: string) => new Query(table) };
