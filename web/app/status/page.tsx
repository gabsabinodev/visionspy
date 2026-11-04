import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Run { id: number; source: string; ok: boolean | null; items: number | null; message: string | null; finished_at: string | null }

const SOURCES: { key: string; label: string; every: string; maxAgeH: number }[] = [
  { key: "meta", label: "Biblioteca da Meta", every: "3x por dia", maxAgeH: 14 },
  { key: "criativos", label: "Criativos (imagens)", every: "a cada coleta", maxAgeH: 30 },
  { key: "midia", label: "Mídia original", every: "a cada coleta", maxAgeH: 48 },
  { key: "google", label: "Google (transparência)", every: "a cada coleta, só sites novos", maxAgeH: 48 },
  { key: "tiktok", label: "TikTok", every: "a cada coleta", maxAgeH: 30 },
  { key: "reclameaqui", label: "Reclame Aqui", every: "1x por dia", maxAgeH: 30 },
  { key: "paginas", label: "Raio-X das páginas", every: "a cada coleta, só páginas novas", maxAgeH: 48 },
  { key: "ia", label: "IA (Gemini)", every: "a cada coleta, só o que mudou", maxAgeH: 48 },
  { key: "kit", label: "Mapa das páginas", every: "a cada coleta, só o que mudou", maxAgeH: 72 },
  { key: "transcricao", label: "Transcrição de vídeos", every: "a cada coleta, só vídeos novos", maxAgeH: 72 },
  { key: "limpeza", label: "Limpeza de dados antigos", every: "uma vez por dia", maxAgeH: 72 },
  { key: "alertas", label: "Alertas (Telegram)", every: "a cada coleta", maxAgeH: 30 },
];

const ago = (iso: string | null) => {
  if (!iso) return "nunca";
  const h = (Date.now() - Date.parse(iso)) / 36e5;
  if (h < 1) return `há ${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `há ${Math.round(h)} h`;
  return `há ${Math.round(h / 24)} dias`;
};
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export default async function Status() {
  const client = db();
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [{ data: runs }, offers, pages, ai, creatives, alerts] = await Promise.all([
    client.from("runs").select("id, source, ok, items, message, finished_at").gte("finished_at", since).order("id", { ascending: false }).limit(400),
    client.from("offer_ranking").select("offer_key", { count: "exact", head: true }),
    client.from("landing_pages").select("url", { count: "exact", head: true }),
    client.from("offer_insights").select("offer_key", { count: "exact", head: true }),
    client.from("ads").select("library_id", { count: "exact", head: true }).not("thumb_path", "is", null),
    client.from("alerts_sent").select("offer_key", { count: "exact", head: true }),
  ]);
  const list = (runs ?? []) as Run[];

  const health = SOURCES.map((s) => {
    const mine = list.filter((r) => r.source === s.key);
    const last = mine[0] ?? null;
    const lastOk = mine.find((r) => r.ok) ?? null;
    const fails = mine.filter((r) => r.ok === false).length;
    const stale = !lastOk || (Date.now() - Date.parse(lastOk.finished_at!)) / 36e5 > s.maxAgeH;
    const state = !mine.length ? "sem dados" : last?.ok === false ? "falhou" : stale ? "atrasado" : "ok";
    return { ...s, last, lastOk, fails, runs: mine.length, state };
  });
  const bad = health.filter((h) => h.state === "falhou" || (h.state === "atrasado" && h.key === "meta")).length;
  // imagens em webp têm ~15 KB; o plano grátis do Supabase guarda 1 GB
  const storageMb = Math.round(((creatives.count ?? 0) * 15) / 1024);

  return (
    <>
      <header className="page-head">
        <h1>{bad ? "Atenção na coleta" : "Coleta funcionando"}</h1>
        <p>Cada etapa grava o resultado aqui. Se alguma falhar, o aviso também chega no Telegram, quando ele estiver configurado.</p>
      </header>

      <div className="stats">
        <div><b>{(offers.count ?? 0).toLocaleString("pt-BR")}</b><span>Ofertas no ranking</span></div>
        <div><b>{(pages.count ?? 0).toLocaleString("pt-BR")}</b><span>Páginas analisadas</span></div>
        <div><b>{(ai.count ?? 0).toLocaleString("pt-BR")}</b><span>Ofertas lidas pela IA</span></div>
        <div><b>{(creatives.count ?? 0).toLocaleString("pt-BR")}</b><span>Criativos guardados, cerca de {storageMb} MB</span></div>
        <div><b>{(alerts.count ?? 0).toLocaleString("pt-BR")}</b><span>Alertas enviados</span></div>
      </div>

      <div className="grid stack">
        <table>
          <thead>
            <tr><th>Etapa</th><th>Estado</th><th>Último sucesso</th><th className="n">Itens</th><th className="n">Falhas em 7 dias</th><th>Frequência</th></tr>
          </thead>
          <tbody>
            {health.map((h) => (
              <tr key={h.key}>
                <td><b>{h.label}</b></td>
                <td><span className={`health h-${h.state.replace(" ", "-")}`}>{h.state}</span></td>
                <td>{h.lastOk ? <>{when(h.lastOk.finished_at)} <span className="dim">({ago(h.lastOk.finished_at)})</span></> : <span className="dim">Nunca</span>}</td>
                <td className="n">{h.lastOk?.items ?? "—"}</td>
                <td className={`n ${h.fails ? "warn" : "dim"}`}>{h.fails}</td>
                <td className="dim">{h.every}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-head"><h2>Últimas execuções</h2></div>
      <div className="grid">
        <table>
          <thead><tr><th>Quando</th><th>Etapa</th><th>Resultado</th><th className="n">Itens</th><th>Detalhe</th></tr></thead>
          <tbody>
            {list.slice(0, 40).map((r) => (
              <tr key={r.id}>
                <td className="date">{when(r.finished_at)}</td>
                <td>{SOURCES.find((s) => s.key === r.source)?.label ?? r.source}</td>
                <td className={r.ok === false ? "warn" : "up"}>{r.ok === false ? "Falhou" : "Ok"}</td>
                <td className="n">{r.items ?? "—"}</td>
                <td className="dim detail">{(r.message ?? "").split("\n")[0].slice(0, 160)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <div className="empty"><b>Nenhuma execução nos últimos 7 dias.</b><p>Confira se o agendamento está ligado em Actions, no GitHub.</p></div>}
      </div>
    </>
  );
}
