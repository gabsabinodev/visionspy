/**
 * Investimento estimado. Nenhuma biblioteca pública mostra o gasto real de anúncio comercial no Brasil:
 * isto é um modelo (a conta de verdade roda no banco, em `ad_est_month`; as funções daqui espelham a
 * mesma regra para o modo demonstração e para explicar a conta na tela).
 */
export type Phase = "teste" | "escalando" | "vencedor";

export const PHASES: Phase[] = ["vencedor", "escalando", "teste"];
export const PHASE_LABEL: Record<Phase, string> = { vencedor: "Vencedor", escalando: "Escalando", teste: "Teste" };
export const PHASE_HINT: Record<Phase, string> = {
  vencedor: "30 dias ou mais no ar e 6 cópias ou mais",
  escalando: "3 cópias ou mais, ou 2 cópias com 14 dias ou mais no ar",
  teste: "Poucas cópias ou pouco tempo no ar",
};

/** Paradas do controle de investimento, em R$ por mês (a última significa "ou mais"). */
export const SPEND_STOPS = [0, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000];

/** Moedas em que dá para minerar. O banco guarda tudo em R$ e a tela converte pela tabela spend_model. */
export const MOEDAS = { BRL: "R$", USD: "US$", EUR: "€", GBP: "£" } as const;
export type Moeda = keyof typeof MOEDAS;
export const isMoeda = (v: string): v is Moeda => v in MOEDAS;

export interface SpendRow { country: string; currency: string; fx_to_brl: number; budget_test: number; budget_scale: number; budget_winner: number }

export const adPhase = (days: number, copies: number): Phase =>
  days >= 30 && copies >= 6 ? "vencedor" : (copies >= 3 && days >= 3) || (copies >= 2 && days >= 14) ? "escalando" : "teste";

export const rankBoost = (rank: number | null | undefined) => (rank == null ? 1 : rank <= 10 ? 1.5 : rank <= 50 ? 1.2 : 1);
export const phaseBudget = (phase: Phase, m: Pick<SpendRow, "budget_test" | "budget_scale" | "budget_winner">) =>
  phase === "vencedor" ? m.budget_winner : phase === "escalando" ? m.budget_scale : m.budget_test;

export function adEstMonth(days: number, copies: number, rank: number | null | undefined, m: Pick<SpendRow, "budget_test" | "budget_scale" | "budget_winner">) {
  return copies * phaseBudget(adPhase(days, copies), m) * Math.min(days + 1, 30) * rankBoost(rank);
}

/** Posição (0 a 1) do valor na escala de luz: segue as paradas, não uma régua linear. */
export function heatOf(value: number | null | undefined): number {
  const v = Number(value ?? 0);
  if (v <= 0) return 0;
  const last = SPEND_STOPS.length - 1;
  for (let i = 1; i <= last; i++) {
    if (v <= SPEND_STOPS[i]) return (i - 1 + (v - SPEND_STOPS[i - 1]) / (SPEND_STOPS[i] - SPEND_STOPS[i - 1])) / last;
  }
  return 1;
}

/** Rampa de luz: quanto mais dinheiro, mais claro. */
const RAMP: [number, number, number][] = [[29, 74, 117], [20, 99, 154], [15, 134, 189], [0, 180, 224], [44, 216, 245], [217, 247, 255]];
export function heatColor(t: number): string {
  const x = Math.min(Math.max(t, 0), 1) * (RAMP.length - 1);
  const i = Math.min(Math.floor(x), RAMP.length - 2);
  const f = x - i;
  const [a, b] = [RAMP[i], RAMP[i + 1]];
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(" ")})`;
}

/** Em qual faixa do controle um valor cai (0 a 7). */
export function binOf(value: number): number {
  for (let i = 1; i < SPEND_STOPS.length; i++) if (value < SPEND_STOPS[i]) return i - 1;
  return SPEND_STOPS.length - 2;
}

/** A mesma rampa em tons claros: é a que dá para ler em texto sobre o fundo escuro. */
const RAMP_TEXT: [number, number, number][] = [[140, 175, 205], [110, 190, 230], [60, 205, 240], [30, 214, 245], [130, 232, 248], [217, 247, 255]];
export function heatText(t: number): string {
  const x = Math.min(Math.max(t, 0), 1) * (RAMP_TEXT.length - 1);
  const i = Math.min(Math.floor(x), RAMP_TEXT.length - 2);
  const f = x - i;
  const [a, b] = [RAMP_TEXT[i], RAMP_TEXT[i + 1]];
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(" ")})`;
}

const compact = (cur: string) => {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur, notation: "compact", maximumSignificantDigits: 2 });
  } catch {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumSignificantDigits: 2 });
  }
};

/** "R$ 38 mil", "US$ 1,2 mi": dois dígitos bastam, é estimativa. */
export const fmtMoney = (v: number | string | null | undefined, currency: string | null = "BRL") =>
  compact(currency || "BRL").format(Number(v ?? 0)).replace(/ /g, " ");

/** Faixa do modelo: metade até o dobro do valor central. */
export function estRange(v: number | string | null | undefined, currency: string | null = "BRL") {
  const n = Number(v ?? 0);
  return `${fmtMoney(n / 2, currency)} a ${fmtMoney(n * 2, currency)}`;
}
