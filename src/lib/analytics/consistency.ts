import { completionDates, fallsOn } from "@/lib/daily/commitments";
import { addDays, localDateOf, startOfWeek } from "@/lib/date";
import type { CommitmentCompletion, ISODate, MicroCommitment } from "@/types";

/**
 * Was the commitment switched on for this date? Uses its recorded history:
 * not before its start date, not inside a paused period, not on or after the
 * day it was archived.
 */
export function wasActiveOn(c: MicroCommitment, date: ISODate) {
  if (date < c.startDate) return false;
  if (c.archivedAt && date >= localDateOf(c.archivedAt)) return false;
  return !c.pausedPeriods.some((p) => date >= p.from && (p.to === null || date < p.to));
}

export interface Consistency {
  /** Scheduled opportunities that have closed (or were completed early). */
  scheduled: number;
  done: number;
  percent: number | null;
}

const pct = (done: number, scheduled: number) => (scheduled ? Math.round((done / scheduled) * 100) : null);

/**
 * Scheduled opportunities between `from` and `to` (inclusive) and how many
 * were completed. Daily/weekday commitments count each scheduled day; weekly
 * ones count each Monday–Sunday week. Unscheduled days never count as missed,
 * and today (or this week) only counts once it's done — it's still open.
 */
export function getConsistency(
  c: MicroCommitment,
  from: ISODate,
  to: ISODate,
  today: ISODate,
  completions: CommitmentCompletion[],
): Consistency {
  const done = completionDates(c.id, completions);
  const end = to < today ? to : today;
  let scheduled = 0;
  let completed = 0;

  if (c.frequency === "weekly") {
    for (let week = startOfWeek(from); week <= end; week = addDays(week, 7)) {
      const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
      if (!days.some((d) => wasActiveOn(c, d))) continue;
      const isDone = days.some((d) => done.has(d));
      const open = days[6] >= today;
      if (open && !isDone) continue;
      scheduled++;
      if (isDone) completed++;
    }
  } else {
    for (let d = from; d <= end; d = addDays(d, 1)) {
      if (!fallsOn(c, d) || !wasActiveOn(c, d)) continue;
      const isDone = done.has(d);
      if (d === today && !isDone) continue;
      scheduled++;
      if (isDone) completed++;
    }
  }
  return { scheduled, done: completed, percent: pct(completed, scheduled) };
}

/** Per-commitment and combined consistency for a date range. */
export function getConsistencyReport(
  commitments: MicroCommitment[],
  from: ISODate,
  to: ISODate,
  today: ISODate,
  completions: CommitmentCompletion[],
) {
  const rows = commitments
    .map((c) => ({ commitment: c, ...getConsistency(c, from, to, today, completions) }))
    .filter((r) => r.scheduled > 0);
  const scheduled = rows.reduce((s, r) => s + r.scheduled, 0);
  const done = rows.reduce((s, r) => s + r.done, 0);
  return { rows, scheduled, done, percent: pct(done, scheduled) };
}
