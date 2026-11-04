"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "./icons";

type Opt = { value: string; label: string; count?: number };

interface Props {
  countries: Opt[];
  currencySymbol: string;
  keywords: { term: string; count: number }[];
  facets: { nicho: Opt[]; tipo: Opt[]; destino: Opt[]; checkout: Opt[] };
  exportHref: string;
}

const TOGGLES = [
  { key: "crescendo", label: "Crescendo em cópias" },
  { key: "google", label: "Também no Google" },
  { key: "site", label: "Com página de vendas" },
  { key: "cod", label: "Pagamento na entrega" },
  { key: "vsl", label: "Com VSL" },
  { key: "espionadas", label: "Espionadas" },
  { key: "tiktok", label: "Com pixel do TikTok" },
  { key: "kwai", label: "Com pixel do Kwai" },
] as const;

const PRICES = [50, 100, 200, 500];
const RISKS = [
  { value: "baixo", label: "Risco baixo" },
  { value: "medio", label: "Risco médio" },
  { value: "alto", label: "Risco alto" },
];
const STATUS = [
  { value: "funil", label: "No meu funil" },
  { value: "favorita", label: "Favoritas" },
  { value: "analisando", label: "Analisando" },
  { value: "modelando", label: "Modelando" },
  { value: "testando", label: "Testando" },
  { value: "descartada", label: "Descartadas" },
  { value: "todos", label: "Incluir descartadas" },
];

/** Filtros das ofertas: cada mudança atualiza a URL, sem botão "Filtrar". */
export function FilterBar({ countries, currencySymbol, keywords, facets, exportHref }: Props) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const push = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) (v ? p.set(k, v) : p.delete(k));
    p.delete("n");
    const s = p.toString();
    start(() => router.replace(s ? `${path}?${s}` : path, { scroll: false }));
  };

  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => push({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

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

  const kw = params.get("kw") ?? "";
  const rawPais = (params.get("pais") ?? "todos").trim();
  const pais = /^[a-z]{2}$/i.test(rawPais) ? rawPais.toUpperCase() : rawPais.toLowerCase();
  const MORE = ["destino", "checkout", "preco", "risco", "status", "kw", ...TOGGLES.map((t) => t.key)];
  const active = MORE.filter((k) => params.get(k)).length;
  const anyFilter = !!(params.get("q") || params.get("nicho") || params.get("tipo") || active);

  const Select = ({ name, label, opts }: { name: string; label: string; opts: Opt[] }) => {
    const v = params.get(name) ?? "";
    return (
      <label className={`select-wrap${v ? " on" : ""}`}>
        <span className="sr-only">{label}</span>
        <select value={v} aria-label={label} onChange={(e) => push({ [name]: e.target.value || null })}>
          <option value="">{label}</option>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}{o.count !== undefined ? ` (${o.count})` : ""}</option>)}
        </select>
        <Icon name="chevron" size={15} />
      </label>
    );
  };

  return (
    <section className="offerbar" aria-label="Filtros" data-pending={pending || undefined}>
      <label className="search">
        <Icon name="key" size={18} />
        <input ref={inputRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busque anunciante, site, texto ou promessa" aria-label="Buscar anunciante, site, texto ou promessa" />
        <kbd aria-hidden="true">/</kbd>
      </label>
      <label className={`select-wrap country${pais !== "todos" ? " on" : ""}`}>
        <span className="sr-only">País</span>
        <select value={pais} aria-label="País" onChange={(e) => push({ pais: e.target.value === "todos" ? null : e.target.value, kw: null })}>
          {countries.map((c) => <option key={c.value} value={c.value}>{c.label}{c.count ? ` (${c.count})` : ""}</option>)}
        </select>
        <Icon name="chevron" size={15} />
      </label>
      {facets.nicho.length > 0 && <Select name="nicho" label="Todos os nichos" opts={facets.nicho} />}
      {facets.tipo.length > 0 && <Select name="tipo" label="Todos os tipos" opts={facets.tipo} />}
      <details className="pop more-filters">
        <summary><Icon name="sliders" size={15} /> Mais filtros{active > 0 && <span className="pop-count">{active}</span>}</summary>
        <div className="pop-body wide">
          <div className="pop-selects">
            {facets.destino.length > 0 && <Select name="destino" label="Qualquer destino" opts={facets.destino} />}
            {facets.checkout.length > 0 && <Select name="checkout" label="Qualquer plataforma" opts={facets.checkout} />}
            <Select name="preco" label="Qualquer preço" opts={PRICES.map((v) => ({ value: String(v), label: `Até ${currencySymbol} ${v}` }))} />
            <Select name="risco" label="Qualquer risco" opts={RISKS} />
            <Select name="status" label="Funil" opts={STATUS} />
          </div>
          <div className="toggles" role="group" aria-label="Mostrar só">
            {TOGGLES.map((t) => {
              const on = params.get(t.key) === "1";
              return <button key={t.key} type="button" className="toggle" aria-pressed={on} onClick={() => push({ [t.key]: on ? null : "1" })}>{t.label}</button>;
            })}
          </div>
          {keywords.length > 0 && (
            <>
              <h3>Encontradas pela busca</h3>
              <div className="toggles" role="group" aria-label="Palavra-chave que encontrou a oferta">
                {keywords.map((k) => (
                  <button key={k.term} type="button" className="toggle" aria-pressed={kw === k.term} onClick={() => push({ kw: kw === k.term ? null : k.term })}>
                    {k.term} <span className="count">{k.count}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </details>
      <span className="offerbar-end">
        {anyFilter && <button type="button" className="btn ghost" onClick={() => { setQ(""); start(() => router.replace(path, { scroll: false })); }}>Limpar</button>}
        <a className="btn ghost" href={exportHref}><Icon name="download" size={15} /> CSV</a>
      </span>
    </section>
  );
}
