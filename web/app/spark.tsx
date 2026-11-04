/** Linha pequena dos últimos 14 dias de cópias. */
export function Spark({ points, width = 84, height = 26 }: { points: number[]; width?: number; height?: number }) {
  if (points.length < 2) return <span className="spark-none">sem histórico</span>;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(max - min, 1);
  const x = (i: number) => 2 + (i * (width - 6)) / (points.length - 1);
  const y = (v: number) => height - 3 - ((v - min) * (height - 6)) / span;
  const d = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const tone = last > first ? "up" : last < first ? "down" : "flat";
  return (
    <svg className={`spark ${tone}`} viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={`Cópias de ${first} para ${last} em ${points.length} dias`}>
      <path d={d} fill="none" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(last)} r={2.2} />
    </svg>
  );
}
