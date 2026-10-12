import { createId } from "@/lib/id";
import { addDays, daysBetween, formatShortDate, parseISODate, startOfWeek } from "@/lib/date";
import { WEEKDAYS } from "@/lib/daily/commitments";
import { createTask, nextSortOrder } from "@/lib/tasks/task-model";
import type { ISODate, ISODateTime, PersistedData, RecurrenceInput, RecurrenceRule, RecurrenceTemplate, Task } from "@/types";

/**
 * Generation policy (no backend scheduler — runs whenever the app opens):
 * - Upcoming: occurrences are created up to GENERATION_WINDOW_DAYS ahead,
 *   with at most MAX_FUTURE_OCCURRENCES not-yet-due ones per template, so a
 *   daily task never floods the task list.
 * - Missed while away: only the most recent missed date is created (it shows
 *   as overdue, for review). Older missed dates are skipped — never marked
 *   complete and never piled up as a backlog.
 * - Each occurrence's id is derived from template + date, and
 *   `generatedThrough` remembers what has been handled, so nothing is ever
 *   duplicated and deleted occurrences don't come back.
 */
export const GENERATION_WINDOW_DAYS = 14;
export const MAX_FUTURE_OCCURRENCES = 4;

export const occurrenceId = (templateId: string, date: ISODate) => `rec_${templateId}_${date}`;

export const FREQUENCY_OPTIONS: { id: RecurrenceRule["frequency"]; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekdays", label: "Every weekday" },
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Every two weeks" },
  { id: "monthly", label: "Monthly" },
  { id: "custom", label: "Custom" },
];

const weekday = (d: ISODate) => parseISODate(d).getDay();
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** Weekdays a weekly-style rule fires on, defaulting to the start date's weekday. */
const ruleWeekdays = (r: RecurrenceRule) => (r.selectedWeekdays.length ? r.selectedWeekdays : [weekday(r.startDate)]);

/** Does the rule produce an occurrence on this local date? */
export function occursOn(r: RecurrenceRule, date: ISODate) {
  if (date < r.startDate || (r.endDate && date > r.endDate)) return false;
  switch (r.frequency) {
    case "daily":
      return true;
    case "weekdays": {
      const d = weekday(date);
      return d >= 1 && d <= 5;
    }
    case "weekly":
    case "biweekly":
    case "custom": {
      if (r.frequency === "custom" && r.intervalUnit === "days") {
        return daysBetween(r.startDate, date) % Math.max(1, r.interval) === 0;
      }
      const every = r.frequency === "weekly" ? 1 : r.frequency === "biweekly" ? 2 : Math.max(1, r.interval);
      const weeks = Math.round(daysBetween(startOfWeek(r.startDate), startOfWeek(date)) / 7);
      return weeks % every === 0 && ruleWeekdays(r).includes(weekday(date));
    }
    case "monthly": {
      // Same day of the month as the start; months without that day use their last day.
      const start = parseISODate(r.startDate);
      const d = parseISODate(date);
      const target = Math.min(start.getDate(), daysInMonth(d.getFullYear(), d.getMonth()));
      return d.getDate() === target;
    }
  }
}

/** Dates in [from, to] (inclusive) that the rule fires on. */
export function occurrencesBetween(r: RecurrenceRule, from: ISODate, to: ISODate, limit = 400): ISODate[] {
  const out: ISODate[] = [];
  let d = from < r.startDate ? r.startDate : from;
  const end = r.endDate && r.endDate < to ? r.endDate : to;
  for (let i = 0; d <= end && i < 800 && out.length < limit; i++, d = addDays(d, 1)) {
    if (occursOn(r, d)) out.push(d);
  }
  return out;
}

export function nextOccurrence(r: RecurrenceRule, from: ISODate): ISODate | null {
  return occurrencesBetween(r, from, addDays(from, 400), 1)[0] ?? null;
}

export function describeRule(r: RecurrenceRule) {
  const days = ruleWeekdays(r)
    .map((n) => WEEKDAYS.find((w) => w.value === n)?.short)
    .join(", ");
  let text: string;
  switch (r.frequency) {
    case "daily":
      text = "Every day";
      break;
    case "weekdays":
      text = "Every weekday";
      break;
    case "weekly":
      text = `Every week on ${days}`;
      break;
    case "biweekly":
      text = `Every two weeks on ${days}`;
      break;
    case "monthly": {
      const day = parseISODate(r.startDate).getDate();
      text = `Monthly on day ${day}${day > 28 ? " (or the month’s last day)" : ""}`;
      break;
    }
    case "custom":
      text =
        r.intervalUnit === "days"
          ? `Every ${r.interval} days`
          : `Every ${r.interval} week${r.interval === 1 ? "" : "s"} on ${days}`;
      break;
  }
  return r.endDate ? `${text}, until ${formatShortDate(r.endDate)}` : text;
}

export function normalizeRule(r: RecurrenceRule): RecurrenceRule {
  const weekly = r.frequency === "weekly" || r.frequency === "biweekly" || (r.frequency === "custom" && r.intervalUnit === "weeks");
  return {
    frequency: r.frequency,
    interval: r.frequency === "custom" ? Math.min(365, Math.max(1, Math.round(r.interval || 1))) : 1,
    intervalUnit: r.frequency === "custom" ? r.intervalUnit : "days",
    selectedWeekdays: weekly ? [...new Set(r.selectedWeekdays.length ? r.selectedWeekdays : [weekday(r.startDate)])].sort() : [],
    startDate: r.startDate,
    endDate: r.endDate && r.endDate >= r.startDate ? r.endDate : null,
  };
}

export function createTemplate(input: RecurrenceInput, now: ISODateTime): RecurrenceTemplate {
  return {
    id: createId(),
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    ...normalizeRule(input),
    sprintId: input.sprintId ?? null,
    projectId: input.projectId ?? null,
    priority: input.priority ?? null,
    estimatedMinutes: input.estimatedMinutes ?? null,
    status: "active",
    generatedThrough: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** The template's task fields, as applied to each occurrence. */
export const templateTaskFields = (t: RecurrenceTemplate) => ({
  title: t.title,
  description: t.description,
  sprint: t.sprintId,
  projectId: t.projectId,
  priority: t.priority,
  estimatedMinutes: t.estimatedMinutes,
});

function makeOccurrence(t: RecurrenceTemplate, date: ISODate, now: ISODateTime, sortOrder: number, projectSortOrder: number): Task {
  return createTask({ ...templateTaskFields(t), dueDate: date }, now, {
    id: occurrenceId(t.id, date),
    recurrenceTemplateId: t.id,
    occurrenceDate: date,
    sortOrder,
    projectSortOrder,
  });
}

/**
 * Bring every active template up to date for `today`. Pure and idempotent:
 * returns the same object when there's nothing to do.
 */
export function generateOccurrences(data: PersistedData, today: ISODate, now: ISODateTime): PersistedData {
  const existingIds = new Set(data.tasks.map((t) => t.id));
  const created: Task[] = [];
  let templatesChanged = false;
  let sortOrder = nextSortOrder(data.tasks);
  const projectOrder = new Map<string, number>();

  const templates = data.recurrences.map((t) => {
    if (t.status !== "active") return t;
    const yesterday = addDays(today, -1);
    const windowEnd = addDays(today, GENERATION_WINDOW_DAYS);
    const from = t.generatedThrough ? addDays(t.generatedThrough, 1) : t.startDate;
    if (from > windowEnd || (t.endDate && from > t.endDate)) return t;

    const dates: ISODate[] = [];
    // Missed while away → only the most recent one, surfaced as overdue.
    const missed = from <= yesterday ? occurrencesBetween(t, from, yesterday) : [];
    if (missed.length) dates.push(missed[missed.length - 1]);

    const openFuture = data.tasks.filter(
      (x) => x.recurrenceTemplateId === t.id && x.status !== "completed" && x.occurrenceDate !== null && x.occurrenceDate > today,
    ).length;
    let room = Math.max(0, MAX_FUTURE_OCCURRENCES - openFuture);
    let handledThrough = from > yesterday ? addDays(from, -1) : yesterday;
    let capped = false;
    for (const d of occurrencesBetween(t, from > today ? from : today, windowEnd)) {
      if (d > today) {
        if (room === 0) {
          // Stop here; this and later dates are picked up on a later day.
          capped = true;
          break;
        }
        room--;
      }
      dates.push(d);
      handledThrough = d;
    }
    if (!capped) handledThrough = t.endDate && t.endDate < windowEnd ? t.endDate : windowEnd;

    for (const d of dates) {
      const id = occurrenceId(t.id, d);
      if (existingIds.has(id)) continue;
      existingIds.add(id);
      let pOrder = 0;
      if (t.projectId) {
        pOrder =
          projectOrder.get(t.projectId) ??
          data.tasks.filter((x) => x.projectId === t.projectId).reduce((m, x) => Math.max(m, x.projectSortOrder), 0);
        pOrder += 1000;
        projectOrder.set(t.projectId, pOrder);
      }
      sortOrder += 1000;
      created.push(makeOccurrence(t, d, now, sortOrder, pOrder));
    }

    if (handledThrough === t.generatedThrough) return t;
    templatesChanged = true;
    return { ...t, generatedThrough: handledThrough };
  });

  if (!created.length && !templatesChanged) return data;
  return { ...data, tasks: [...created, ...data.tasks], recurrences: templates };
}

/** Planned future dates not yet generated — for the calendar only (never stored). */
export function projectedOccurrences(t: RecurrenceTemplate, from: ISODate, to: ISODate) {
  if (t.status !== "active") return [];
  const start = t.generatedThrough && t.generatedThrough >= from ? addDays(t.generatedThrough, 1) : from;
  return occurrencesBetween(t, start, to);
}
