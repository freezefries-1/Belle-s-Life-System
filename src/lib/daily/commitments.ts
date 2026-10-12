import { createId } from "@/lib/id";
import { addDays, parseISODate, startOfWeek } from "@/lib/date";
import type {
  CommitmentCompletion,
  CommitmentInput,
  ISODate,
  ISODateTime,
  MicroCommitment,
} from "@/types";

export const WEEKDAYS = [
  { value: 1, short: "Mon" },
  { value: 2, short: "Tue" },
  { value: 3, short: "Wed" },
  { value: 4, short: "Thu" },
  { value: 5, short: "Fri" },
  { value: 6, short: "Sat" },
  { value: 0, short: "Sun" },
];

/** Gentle starting points for an empty list — one tap to add. */
export const SUGGESTED_COMMITMENTS: CommitmentInput[] = [
  { title: "Read 5 pages", targetMinutes: 10, frequency: "daily" },
  { title: "10-minute home reset", targetMinutes: 10, frequency: "daily" },
  { title: "Review tomorrow’s schedule", targetMinutes: 5, frequency: "daily" },
  { title: "Practise Thai", targetMinutes: 5, frequency: "weekdays", selectedWeekdays: [1, 2, 3, 4, 5] },
  { title: "Midnight shutdown routine", description: "Screens off, tomorrow’s highlight in mind.", frequency: "daily" },
];

export function createCommitment(input: CommitmentInput, today: ISODate, now: ISODateTime): MicroCommitment {
  const frequency = input.frequency ?? "daily";
  const weekdays = [...new Set(input.selectedWeekdays ?? [])].sort();
  return {
    id: createId(),
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    targetMinutes: input.targetMinutes ?? null,
    frequency: frequency === "weekdays" && weekdays.length === 0 ? "daily" : frequency,
    selectedWeekdays: weekdays,
    startDate: input.startDate ?? today,
    status: "active",
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    pausedPeriods: [],
  };
}

export function frequencyLabel(c: Pick<MicroCommitment, "frequency" | "selectedWeekdays">) {
  if (c.frequency === "weekly") return "Once a week";
  if (c.frequency === "daily") return "Every day";
  const days = c.selectedWeekdays;
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return "Weekdays";
  if (days.length === 2 && days.includes(0) && days.includes(6)) return "Weekends";
  return WEEKDAYS.filter((d) => days.includes(d.value))
    .map((d) => d.short)
    .join(", ");
}

const weekdayOf = (date: ISODate) => parseISODate(date).getDay();

/** Completion dates for one commitment, as a Set for quick lookups. */
export function completionDates(commitmentId: string, completions: CommitmentCompletion[]) {
  return new Set(completions.filter((c) => c.commitmentId === commitmentId).map((c) => c.dateKey));
}

export const isDoneOn = (commitmentId: string, date: ISODate, completions: CommitmentCompletion[]) =>
  completions.some((c) => c.commitmentId === commitmentId && c.dateKey === date);

/** Is this commitment's pattern due on `date`, ignoring status? */
export function fallsOn(c: MicroCommitment, date: ISODate) {
  if (date < c.startDate) return false;
  if (c.frequency === "weekdays") return c.selectedWeekdays.includes(weekdayOf(date));
  return true; // daily, and weekly (any day of the week)
}

/** Dates of the Monday–Sunday week containing `date`. */
function weekOf(date: ISODate) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Should this commitment appear on `date`'s list?
 * A weekly commitment appears every day of its week until it's done; on the
 * day it's done it stays (ticked), and on the week's other days it steps aside.
 */
export function isScheduledOn(c: MicroCommitment, date: ISODate, completions: CommitmentCompletion[]) {
  return c.status === "active" && isDueByPattern(c, date, completions);
}

/** The scheduling rule on its own, without looking at active/paused status. */
export function isDueByPattern(c: MicroCommitment, date: ISODate, completions: CommitmentCompletion[]) {
  if (!fallsOn(c, date)) return false;
  if (c.frequency !== "weekly") return true;
  const done = completionDates(c.id, completions);
  if (done.has(date)) return true;
  return !weekOf(date).some((d) => d !== date && done.has(d));
}

/** Today's list: active commitments scheduled for `date`, done ones last. */
export function getScheduledFor(commitments: MicroCommitment[], date: ISODate, completions: CommitmentCompletion[]) {
  return commitments
    .filter((c) => isScheduledOn(c, date, completions))
    .sort(
      (a, b) =>
        Number(isDoneOn(a.id, date, completions)) - Number(isDoneOn(b.id, date, completions)) ||
        a.createdAt.localeCompare(b.createdAt),
    );
}

export function getCommitmentProgress(commitments: MicroCommitment[], date: ISODate, completions: CommitmentCompletion[]) {
  const scheduled = getScheduledFor(commitments, date, completions);
  const done = scheduled.filter((c) => isDoneOn(c.id, date, completions)).length;
  return {
    scheduled: scheduled.length,
    done,
    percent: scheduled.length ? Math.round((done / scheduled.length) * 100) : null,
  };
}

/**
 * Consecutive scheduled periods completed, counted back from today.
 * Days (or weeks) that weren't scheduled are skipped, never counted against
 * it, and today/this week doesn't break the streak while it's still open.
 */
export function getStreak(c: MicroCommitment, today: ISODate, completions: CommitmentCompletion[]) {
  const done = completionDates(c.id, completions);
  let streak = 0;

  if (c.frequency === "weekly") {
    let weekStart = startOfWeek(today);
    for (let i = 0; i < 260; i++) {
      const days = Array.from({ length: 7 }, (_, d) => addDays(weekStart, d));
      if (days[6] < c.startDate) break;
      if (days.some((d) => done.has(d))) streak++;
      else if (i > 0) break;
      weekStart = addDays(weekStart, -7);
    }
    return { count: streak, unit: streak === 1 ? "week" : "weeks" };
  }

  let date = today;
  for (let i = 0; i < 730 && date >= c.startDate; i++, date = addDays(date, -1)) {
    if (!fallsOn(c, date)) continue;
    if (done.has(date)) streak++;
    else if (date !== today) break;
  }
  return { count: streak, unit: streak === 1 ? "day" : "days" };
}

export type HistoryCell = { key: string; label: string; state: "done" | "open" | "off" | "today" };

/** Recent history for the little dot strip: last N days, or last N weeks for weekly commitments. */
export function getRecentHistory(
  c: MicroCommitment,
  today: ISODate,
  completions: CommitmentCompletion[],
  count = 14,
): { cells: HistoryCell[]; scheduled: number; done: number } {
  const done = completionDates(c.id, completions);
  const cells: HistoryCell[] = [];

  if (c.frequency === "weekly") {
    const thisWeek = startOfWeek(today);
    for (let i = count - 1; i >= 0; i--) {
      const start = addDays(thisWeek, -7 * i);
      const days = Array.from({ length: 7 }, (_, d) => addDays(start, d));
      const isDone = days.some((d) => done.has(d));
      const beforeStart = days[6] < c.startDate;
      cells.push({
        key: start,
        label: `Week of ${start}`,
        state: beforeStart ? "off" : isDone ? "done" : i === 0 ? "today" : "open",
      });
    }
  } else {
    for (let i = count - 1; i >= 0; i--) {
      const date = addDays(today, -i);
      const scheduled = fallsOn(c, date);
      cells.push({
        key: date,
        label: date,
        state: done.has(date) ? "done" : !scheduled ? "off" : date === today ? "today" : "open",
      });
    }
  }

  const relevant = cells.filter((cell) => cell.state !== "off");
  return {
    cells,
    scheduled: relevant.filter((cell) => cell.state !== "today" || done.has(cell.key)).length,
    done: relevant.filter((cell) => cell.state === "done").length,
  };
}
