"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { fmtMoney, heatColor, MOEDAS, PHASE_HINT, PHASE_LABEL, PHASES, SPEND_STOPS, type Moeda, type Phase } from "@/lib/spend";
import { Icon } from "./icons";

type Opt = { value: string; label: string; count?: number };

interface Props {
  countries: { label: string; opts: Opt[] }[];
  niches: Opt[];
  moeda: Moeda;
  /** moeda padrão do país: escolher ela limpa o parâmetro da URL */
  autoMoeda: Moeda;
  /** anúncios em cada faixa do controle de investimento */
  heat: number[];
  phases: Record<Phase, number>;
}

const LAST = SPEND_STOPS.length - 1;
const stopIndex = (v: string | null, fallback: number) => {
  const i = SPEND_STOPS.indexOf(Number(v));
  return v && i >= 0 ? i : fallback;
};
const stopLabel = (v: number) => (v >= 1000 ? `${v / 1000} mil` : String(v));

const DAYS = [7, 14, 30, 60, 90];
const COPIES = [2, 3, 6, 10, 20];

export function MineBar({ countries, niches, heat, phases, moeda, autoMoeda }: Props) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [lo, setLo] = useState(stopIndex(params.get("de"), 0));
  const [hi, setHi] = useState(stopIndex(params.get("ate"), LAST));
  const inputRef = useRef<HTMLInputElement>(null);

  const push = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) (v ? p.set(k, v) : p.delete(k));
    p.delete("n");
    p.delete("ver");
    const s = p.toString();
    start(() => router.replace(s ? `${path}?${s}` : path, { scroll: false }));
  };

  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => push({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // o controle só consulta o banco quando a pessoa para de arrastar
  useEffect(() => {
    const de = lo > 0 ? String(SPEND_STOPS[lo]) : null;
    const ate = hi < LAST ? String(SPEND_STOPS[hi]) : null;
    if (de === params.get("de") && ate === params.get("ate")) return;
    const t = setTimeout(() => push({ de, ate }), 260);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lo, hi]);

  // links de busca salva mudam a URL por fora: o controle acompanha
  useEffect(() => {
    setLo(stopIndex(params.get("de"), 0));
    setHi(stopIndex(params.get("ate"), LAST));
    setQ(params.get("q") ?? "");
  }, [params]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rawPais = (params.get("pais") ?? "BR").toUpperCase();
  const pais = rawPais === "TODOS" ? "todos" : rawPais === "EUROPA" ? "europa" : rawPais;
  const fase = params.get("fase") ?? "";
  const formato = params.get("formato") ?? "";
  const peak = Math.max(...heat, 1);
  const rangeLabel =
    lo === 0 && hi === LAST ? "Qualquer valor"
      : hi === LAST ? `${fmtMoney(SPEND_STOPS[lo], moeda)} ou mais`
      : lo === 0 ? `Até ${fmtMoney(SPEND_STOPS[hi], moeda)}`
      : `${fmtMoney(SPEND_STOPS[lo], moeda)} a ${fmtMoney(SPEND_STOPS[hi], moeda)}`;
  const left = (lo / LAST) * 100;
  const right = (hi / LAST) * 100;

  return (
    <section className="minebar" aria-label="Filtros da mineração" data-pending={pending || undefined}>
      <div className="mine-search">
        <label className="search">
          <Icon name="key" size={18} />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busque produto, promessa, anunciante ou site"
            aria-label="Buscar produto, promessa, anunciante ou site"
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
        <label className="select-wrap country">
          <span className="sr-only">País</span>
          <select value={pais} aria-label="País" onChange={(e) => push({ pais: e.target.value === "BR" ? null : e.target.value, moeda: null })}>
            {countries.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.opts.map((c) => <option key={c.value} value={c.value}>{c.label}{c.count ? ` (${c.count})` : ""}</option>)}
              </optgroup>
            ))}
            <option value="todos">Todos os países</option>
          </select>
          <Icon name="chevron" size={15} />
        </label>
      </div>

      <div className="thermal">
        <div className="thermal-head">
          <span className="thermal-title">
            Investimento estimado por mês
            <span className="segmented tiny" role="group" aria-label="Moeda">
              {(Object.keys(MOEDAS) as Moeda[]).map((m) => (
                <button key={m} type="button" aria-pressed={moeda === m} onClick={() => push({ moeda: m === autoMoeda ? null : m })}>{MOEDAS[m]}</button>
              ))}
            </span>
          </span>
          <b>{rangeLabel}</b>
        </div>
        <div className="thermal-chart" aria-hidden="true">
          {heat.map((n, i) => (
            <i
              key={i}
              className={i >= lo && i < hi ? "in" : undefined}
              style={{ height: `${n ? Math.max(Math.sqrt(n / peak) * 100, 7) : 2}%`, background: heatColor((i + 0.6) / heat.length) }}
              title={`${n} anúncios`}
            />
          ))}
        </div>
        <div className="thermal-track">
          <span className="thermal-rail">
            <span className="thermal-mask" style={{ left: 0, width: `${left}%` }} />
            <span className="thermal-mask" style={{ left: `${right}%`, right: 0 }} />
          </span>
          <input type="range" min={0} max={LAST} step={1} value={lo} aria-label="Investimento mínimo por mês" aria-valuetext={stopLabel(SPEND_STOPS[lo])} onChange={(e) => setLo(Math.min(Number(e.target.value), hi - 1))} />
          <input type="range" min={0} max={LAST} step={1} value={hi} aria-label="Investimento máximo por mês" aria-valuetext={hi === LAST ? "sem limite" : stopLabel(SPEND_STOPS[hi])} onChange={(e) => setHi(Math.max(Number(e.target.value), lo + 1))} />
        </div>
        <div className="thermal-scale" aria-hidden="true">
          {SPEND_STOPS.map((v, i) => <span key={v}>{i === 0 ? `${MOEDAS[moeda]} 0` : stopLabel(v)}{i === LAST ? "+" : ""}</span>)}
        </div>
      </div>

      <div className="mine-filters">
        <span className="filter-label">Fase</span>
        <div className="segmented" role="group" aria-label="Fase do anúncio">
          <button type="button" aria-pressed={!fase} onClick={() => push({ fase: null })}>Todas</button>
          {PHASES.map((p) => (
            <button key={p} type="button" className={`seg-${p}`} aria-pressed={fase === p} title={PHASE_HINT[p]} onClick={() => push({ fase: fase === p ? null : p })}>
              {PHASE_LABEL[p]}<span className="count">{phases[p]}</span>
            </button>
          ))}
        </div>
        <span className="filter-label">Formato</span>
        <div className="segmented" role="group" aria-label="Formato">
          <button type="button" aria-pressed={!formato} onClick={() => push({ formato: null })}>Todos</button>
          <button type="button" aria-pressed={formato === "video"} onClick={() => push({ formato: formato === "video" ? null : "video" })}>Vídeo</button>
          <button type="button" aria-pressed={formato === "image"} onClick={() => push({ formato: formato === "image" ? null : "image" })}>Imagem</button>
        </div>
        <label className={`select-wrap${params.get("nicho") ? " on" : ""}`}>
          <span className="sr-only">Nicho</span>
          <select value={params.get("nicho") ?? ""} aria-label="Nicho" onChange={(e) => push({ nicho: e.target.value || null })}>
            <option value="">Nicho</option>
            {niches.map((n) => <option key={n.value} value={n.value}>{n.label} ({n.count})</option>)}
          </select>
          <Icon name="chevron" size={15} />
        </label>
        <label className={`select-wrap${params.get("dias") ? " on" : ""}`}>
          <span className="sr-only">Dias no ar</span>
          <select value={params.get("dias") ?? ""} aria-label="Dias no ar" onChange={(e) => push({ dias: e.target.value || null })}>
            <option value="">Dias no ar</option>
            {DAYS.map((d) => <option key={d} value={d}>{d} dias ou mais</option>)}
          </select>
          <Icon name="chevron" size={15} />
        </label>
        <label className={`select-wrap${params.get("copias") ? " on" : ""}`}>
          <span className="sr-only">Cópias</span>
          <select value={params.get("copias") ?? ""} aria-label="Cópias do criativo" onChange={(e) => push({ copias: e.target.value || null })}>
            <option value="">Cópias</option>
            {COPIES.map((d) => <option key={d} value={d}>{d} cópias ou mais</option>)}
          </select>
          <Icon name="chevron" size={15} />
        </label>
      </div>
    </section>
  );
}
