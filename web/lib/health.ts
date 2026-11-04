import { db } from "./db";

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", " às");

/** Saúde da última coleta, mostrada no pé da barra lateral. */
export async function lastCollect() {
  try {
    const { data } = await db().from("runs").select("ok, finished_at").eq("source", "meta").order("id", { ascending: false }).limit(1);
    const run = data?.[0] as { ok: boolean | null; finished_at: string } | undefined;
    if (!run) return null;
    return { ok: run.ok !== false, label: run.ok === false ? "Coleta com falha" : `Coleta de ${when(run.finished_at)}` };
  } catch {
    return null;
  }
}
