import Link from "next/link";
import { db, fmtDate, libraryLink } from "@/lib/db";
import { addWatch } from "../actions";

export const dynamic = "force-dynamic";

interface Row { day: string; position: number; name: string; slug: string | null; reputation: string | null; complaints: number }

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

export default async function ReclameAqui() {
  const client = db();
  const { data: last } = await client.from("ra_new_companies").select("day").order("day", { ascending: false }).limit(1);
  const day = last?.[0]?.day as string | undefined;
  const [{ data }, { data: offerRows }] = await Promise.all([
    day ? client.from("ra_new_companies").select("*").eq("day", day).order("position") : Promise.resolve({ data: [] as Row[] }),
    client.from("offer_ranking").select("offer_key, advertiser, domain").eq("country", "BR").limit(1000),
  ]);
  const rows = (data ?? []) as Row[];
  const bad = rows.filter((r) => r.reputation === "Não Recomendada").length;
  const total = rows.reduce((s, r) => s + r.complaints, 0);
  // liga a empresa à oferta que já está no ranking, pelo nome ou pelo domínio
  const offers = (offerRows ?? []) as { offer_key: string; advertiser: string; domain: string | null }[];
  const match = (name: string) => {
    const n = norm(name);
    return offers.find((o) => norm(o.advertiser) === n || (o.domain && norm(o.domain.split(".")[0]) === n) || (n.length >= 6 && norm(o.advertiser).startsWith(n)));
  };

  return (
    <>
      <header className="page-head">
        <h1>Reclame Aqui</h1>
        <p>
          Lojas novas com mais reclamações. Mostra onde tem muita venda nova acontecendo, mas também é onde aparecem as lojas-golpe: use como
          pista de nicho, não como oferta pronta para modelar.
        </p>
      </header>

      <div className="stats">
        <div><b>{rows.length}</b><span>Empresas em {fmtDate(day ?? null)}</span></div>
        <div><b>{total.toLocaleString("pt-BR")}</b><span>Reclamações</span></div>
        <div><b>{bad}</b><span>Não recomendadas</span></div>
        <div><b>{rows.filter((r) => match(r.name)).length}</b><span>Já estão nas ofertas</span></div>
      </div>

      <div className="grid">
        <table>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Reputação</th>
              <th className="n">Reclamações</th>
              <th>No VisionSpy</th>
              <th><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const hit = match(r.name);
              return (
                <tr key={r.name}>
                  <td><span className="offer-name">{r.name}</span></td>
                  <td className={r.reputation === "Não Recomendada" ? "rep-bad" : "muted"}>{r.reputation ?? "—"}</td>
                  <td className="n">{r.complaints.toLocaleString("pt-BR")}</td>
                  <td>{hit ? <Link className="linkish" href={`/oferta/${encodeURIComponent(hit.offer_key)}`}>Ver oferta</Link> : <span className="dim">Ainda não</span>}</td>
                  <td>
                    <div className="sublinks">
                      <a href={libraryLink(r.name)} target="_blank" rel="noreferrer">Buscar na biblioteca</a>
                      {r.slug && <a href={`https://www.reclameaqui.com.br/empresa/${r.slug}/`} target="_blank" rel="noreferrer">Abrir no Reclame Aqui</a>}
                      {!hit && (
                        <form action={addWatch} style={{ display: "inline" }}>
                          <input type="hidden" name="term" value={r.name} />
                          <input type="hidden" name="country" value="BR" />
                          <button className="linkish">Espionar</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <div className="empty"><b>Ainda sem coleta do Reclame Aqui.</b><p>Ela entra na próxima coleta.</p></div>}
      </div>
    </>
  );
}
