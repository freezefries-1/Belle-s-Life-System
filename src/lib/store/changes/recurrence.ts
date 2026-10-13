import { addDays } from "@/lib/date";
import { generateOccurrences, normalizeRule, templateTaskFields } from "@/lib/recurrence/recurrence";
import type { ISODate, ISODateTime, PersistedData, RecurrenceInput, RecurrenceStatus, RecurrenceTemplate, Task } from "@/types";

/** Recurring task series. Past and completed occurrences are never rewritten. */

/** An unfinished occurrence of this series, dated today or later. */
const isFutureOpen = (id: string, today: ISODate) => (t: Task) =>
  t.recurrenceTemplateId === id && t.occurrenceDate !== null && t.occurrenceDate >= today && t.status !== "completed";

/** Add a series and generate straight away, so the first occurrence appears immediately. */
export const addRecurrence = (d: PersistedData, template: RecurrenceTemplate, today: ISODate, now: ISODateTime) =>
  generateOccurrences({ ...d, recurrences: [...d.recurrences, template] }, today, now);

/**
 * Edit the series. Applies to future unfinished occurrences only. A schedule
 * change drops those and regenerates them on the new schedule.
 */
export function updateRecurrence(d: PersistedData, id: string, changes: Partial<RecurrenceInput>, today: ISODate, now: ISODateTime): PersistedData {
  const template = d.recurrences.find((r) => r.id === id);
  if (!template) return d;
  const merged = { ...template, ...changes, title: changes.title?.trim() || template.title };
  const updated: RecurrenceTemplate = { ...merged, ...normalizeRule(merged), description: merged.description.trim(), updatedAt: now };
  const ruleKeys = ["frequency", "interval", "intervalUnit", "selectedWeekdays", "startDate", "endDate"] as const;
  const scheduleChanged = ruleKeys.some((k) => JSON.stringify(template[k]) !== JSON.stringify(updated[k]));
  const future = isFutureOpen(id, today);

  if (scheduleChanged) {
    const yesterday = addDays(today, -1);
    const restart = updated.startDate > yesterday ? addDays(updated.startDate, -1) : yesterday;
    const next = {
      ...d,
      tasks: d.tasks.filter((t) => !future(t)),
      recurrences: d.recurrences.map((r) => (r.id === id ? { ...updated, generatedThrough: restart } : r)),
    };
    return generateOccurrences(next, today, now);
  }
  const fields = templateTaskFields(updated);
  return {
    ...d,
    recurrences: d.recurrences.map((r) => (r.id === id ? updated : r)),
    tasks: d.tasks.map((t) =>
      future(t) ? { ...t, ...fields, sprint: fields.sprint, milestoneId: fields.projectId === t.projectId ? t.milestoneId : null, updatedAt: now } : t,
    ),
  };
}

/** Pause, resume or end. Resuming doesn't back-fill the paused stretch; ending stops after today. */
export function setRecurrenceStatus(
  d: PersistedData,
  id: string,
  status: RecurrenceStatus,
  options: { removeFuture?: boolean } | undefined,
  today: ISODate,
  now: ISODateTime,
): PersistedData {
  const template = d.recurrences.find((r) => r.id === id);
  if (!template) return d;
  const yesterday = addDays(today, -1);
  const updated: RecurrenceTemplate = { ...template, status, updatedAt: now };
  if (status === "active") {
    updated.generatedThrough = template.generatedThrough && template.generatedThrough > yesterday ? template.generatedThrough : yesterday;
  }
  if (status === "ended" && (!template.endDate || template.endDate > today)) updated.endDate = today;
  const future = isFutureOpen(id, today);
  const tasks = options?.removeFuture ? d.tasks.filter((t) => !future(t)) : d.tasks;
  const next = { ...d, tasks, recurrences: d.recurrences.map((r) => (r.id === id ? updated : r)) };
  return status === "active" ? generateOccurrences(next, today, now) : next;
}

/** Remove the series. Completed occurrences (and, unless asked, upcoming ones) are kept as ordinary tasks. */
export function deleteRecurrence(d: PersistedData, id: string, options: { removeFuture?: boolean } | undefined, today: ISODate): PersistedData {
  const future = isFutureOpen(id, today);
  const tasks = d.tasks
    .filter((t) => !(options?.removeFuture && future(t)))
    .map((t) => (t.recurrenceTemplateId === id ? { ...t, recurrenceTemplateId: null } : t));
  return { ...d, tasks, recurrences: d.recurrences.filter((r) => r.id !== id) };
}
