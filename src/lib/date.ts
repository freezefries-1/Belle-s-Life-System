import type { ISODate } from "@/types";

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A real calendar date in YYYY-MM-DD form (rejects e.g. 2026-02-30). */
export function isValidISODate(v: unknown): v is ISODate {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Parse YYYY-MM-DD as a local date (not UTC) to avoid off-by-one days. */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  const ms = parseISODate(to).getTime() - parseISODate(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** Monday of the week containing `iso`. */
export function startOfWeek(iso: ISODate): ISODate {
  const day = parseISODate(iso).getDay(); // 0 = Sunday
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(iso, offset);
}

export function formatLongDate(iso: ISODate) {
  return parseISODate(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatShortDate(iso: ISODate) {
  return parseISODate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatWeekday(iso: ISODate, style: "short" | "long" = "short") {
  return parseISODate(iso).toLocaleDateString("en-GB", { weekday: style });
}

export function formatMonthYear(iso: ISODate) {
  return parseISODate(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** Friendly, guilt-free label for a date relative to today. */
export function relativeDayLabel(iso: ISODate, today: ISODate) {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return formatWeekday(iso, "long");
  return formatShortDate(iso);
}

/** Relative label for use mid-sentence: "due tomorrow", "due Friday", "due 2 Nov". */
export function relativeDayPhrase(iso: ISODate, today: ISODate) {
  const label = relativeDayLabel(iso, today);
  return ["Today", "Tomorrow", "Yesterday"].includes(label) ? label.toLowerCase() : label;
}

/** The local calendar date on which a timestamp falls. */
export function localDateOf(timestamp: string): ISODate {
  return toISODate(new Date(timestamp));
}

/** "2:45pm" for a timestamp, in local time. */
export function formatClockTime(timestamp: string) {
  return new Date(timestamp)
    .toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(" ", "")
    .toLowerCase();
}
