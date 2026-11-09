import { addDays } from "@/lib/date";
import type { ISODate, ISODateTime, PersistedData, WhoopDay } from "@/types";

export type Zone = "green" | "yellow" | "red";

/** WHOOP's colours: green 67–100%, yellow 34–66%, red 0–33%. */
export function zoneOf(percent: number): Zone {
  if (percent >= 67) return "green";
  if (percent >= 34) return "yellow";
  return "red";
}

export const ZONE_LABEL: Record<Zone, string> = { green: "Green", yellow: "Yellow", red: "Red" };

/** Tailwind classes per zone; text colours are dark enough to read on white. */
export const ZONE_STYLE: Record<Zone, { text: string; bg: string; dot: string; bar: string }> = {
  green: { text: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  yellow: { text: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-400", bar: "bg-amber-400" },
  red: { text: "text-rose-700", bg: "bg-rose-50", dot: "bg-rose-500", bar: "bg-rose-500" },
};

/** A whole percentage from 0 to 100, from what was typed ("72", "72%"), or null if blank; undefined if it isn't valid. */
export function parsePercent(text: string): number | null | undefined {
  const t = text.trim().replace(/%$/, "").trim();
  if (t === "") return null;
  if (!/^\d{1,3}$/.test(t)) return undefined;
  const n = Number(t);
  return n <= 100 ? n : undefined;
}

export const dayOn = (days: WhoopDay[], date: ISODate) => days.find((d) => d.id === date) ?? null;

/** Days oldest first. */
export const sortedDays = (days: WhoopDay[]) => [...days].sort((a, b) => a.date.localeCompare(b.date));

/** Days within the last `n` days up to and including `today`, oldest first. */
export function lastDays(days: WhoopDay[], today: ISODate, n: number) {
  const from = addDays(today, -(n - 1));
  return sortedDays(days).filter((d) => d.date >= from && d.date <= today);
}

/** Average of the days that have the number, rounded; null when none do. */
export function average(days: WhoopDay[], key: "recovery" | "sleep"): { value: number | null; count: number } {
  const values = days.map((d) => d[key]).filter((v): v is number => v !== null);
  return { value: values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null, count: values.length };
}

/** How many days were green, yellow and red for recovery. */
export function zoneCounts(days: WhoopDay[]): Record<Zone, number> {
  const counts: Record<Zone, number> = { green: 0, yellow: 0, red: 0 };
  for (const d of days) if (d.recovery !== null) counts[zoneOf(d.recovery)] += 1;
  return counts;
}

/* ---------------- changes ---------------- */

/** Save one day's numbers (adds it, or updates the day if it exists). Both blank removes nothing and changes nothing. */
export function setWhoopDay(d: PersistedData, date: ISODate, values: { recovery: number | null; sleep: number | null }, now: ISODateTime): PersistedData {
  if (values.recovery === null && values.sleep === null) return d;
  const existing = dayOn(d.whoopDays, date);
  if (existing)
    return { ...d, whoopDays: d.whoopDays.map((x) => (x.id === date ? { ...x, recovery: values.recovery, sleep: values.sleep, updatedAt: now } : x)) };
  return { ...d, whoopDays: [...d.whoopDays, { id: date, date, recovery: values.recovery, sleep: values.sleep, createdAt: now, updatedAt: now }] };
}

export const deleteWhoopDay = (d: PersistedData, date: ISODate): PersistedData => ({ ...d, whoopDays: d.whoopDays.filter((x) => x.id !== date) });

/** Put a deleted day back, unless that day has been entered again since. */
export const restoreWhoopDay = (d: PersistedData, day: WhoopDay): PersistedData =>
  dayOn(d.whoopDays, day.date) ? d : { ...d, whoopDays: [...d.whoopDays, day] };
