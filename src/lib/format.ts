/** Formatting helpers matching the prototype's display conventions. */

const TZ = "Asia/Vientiane";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 3200000 → "₭ 3,200,000" */
export function lak(n: number | null | undefined): string {
  return "₭ " + Math.round(n ?? 0).toLocaleString("en-US");
}

/** "2026-08-26" → "26 Aug 2026" (prototype date style). Null → "—" */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "2026-08" → "August 2026" */
export function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** ISO timestamp → "07:58" in Vientiane time. Null → "—" */
export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

/** Today in Vientiane as "YYYY-MM-DD". */
export function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function thisMonth(): string {
  return today().slice(0, 7);
}

/** Whole days from today until the given "YYYY-MM-DD" (negative = past). */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const utc = (s: string) => {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(iso) - utc(today())) / 86400000);
}

/** Hours between two ISO timestamps, one decimal. */
export function hoursBetween(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  return Math.round(((new Date(b).getTime() - new Date(a).getTime()) / 3600000) * 10) / 10;
}

/** Shows numbers like 1.5 / 2 without trailing zeros. */
export function num(n: number): string {
  return String(Math.round(n * 100) / 100);
}
