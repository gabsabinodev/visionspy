import Link from "next/link";
import { creativeSrc, countryName } from "@/lib/db";
import type { AdRow } from "@/lib/mining";
import { fmtMoney, heatColor, heatOf, heatText, PHASE_LABEL, type Moeda } from "@/lib/spend";
import { Thumb } from "./bits";

/** Um criativo na grade: a imagem manda, o calor mostra onde tem dinheiro. */
export function AdCard({ a, href, showCountry, moeda, rate }: { a: AdRow; href: string; showCountry: boolean; moeda: Moeda; rate: number }) {
  const value = Number(a.est_month_brl) / rate;
  const t = heatOf(value);
  return (
    <article className="ad-card" style={{ ["--heat" as string]: heatColor(t), ["--heat-text" as string]: heatText(t), ["--fill" as string]: `${Math.max(t * 100, 3)}%` }}>
      <Link href={href} scroll={false} className="ad-card-media" aria-label={`Ver anúncio de ${a.advertiser}`}>
        <Thumb src={creativeSrc(a.thumb_path, a.thumb_url)} alt={`Criativo de ${a.advertiser}`} video={a.media_type === "video"} />
        <span className={`phase ph-${a.phase}`}>{PHASE_LABEL[a.phase]}</span>
        {showCountry && <span className="ad-country" title={a.countries.map(countryName).join(", ")}>{a.country}{a.countries.length > 1 && ` +${a.countries.length - 1}`}</span>}
      </Link>
      <div className="ad-meter" aria-hidden="true"><i /></div>
      <div className="ad-card-body">
        <div className="ad-spend" title="Estimativa do modelo, não é o gasto real">
          <b>{fmtMoney(value, moeda)}</b><span>por mês</span>
        </div>
        <div className="ad-facts">
          <span>{a.days_running} {a.days_running === 1 ? "dia" : "dias"}</span>
          <span>{a.copies} {a.copies === 1 ? "cópia" : "cópias"}</span>
        </div>
        <Link href={href} scroll={false} className="ad-who">{a.advertiser}</Link>
        {a.domain && <span className="ad-domain">{a.domain}</span>}
      </div>
    </article>
  );
}
