import type { ISODate } from "@/types";

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return m ? `${hour}:${pad(m)}${suffix}` : `${hour}${suffix}`;
}

/** Relative label for use mid-sentence: "due tomorrow", "due Friday", "due 2 Nov". */
export function relativeDayPhrase(iso: ISODate, today: ISODate) {
  const label = relativeDayLabel(iso, today);
  return ["Today", "Tomorrow", "Yesterday"].includes(label) ? label.toLowerCase() : label;
}
