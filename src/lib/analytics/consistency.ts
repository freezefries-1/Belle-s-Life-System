import { completionDates, fallsOn, wasActiveOn } from "@/lib/daily/commitments";
import { addDays, startOfWeek } from "@/lib/date";
import type { CommitmentCompletion, ISODate, MicroCommitment } from "@/types";

export { wasActiveOn };

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
 * Only ticks inside the range count. A week cut by the range's edge that was
 * ticked on a day outside the range is left out (it's neither done nor
 * missed within the range).
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
      const inRange = days.filter((d) => d >= from && d <= to);
      if (!inRange.some((d) => wasActiveOn(c, d))) continue;
      const isDone = inRange.some((d) => done.has(d));
      if (!isDone) {
        if (days.some((d) => done.has(d))) continue; // ticked just outside the range
        if (days[6] >= today) continue; // still open
      }
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
