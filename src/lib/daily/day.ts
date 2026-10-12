import { createId } from "@/lib/id";
import { addDays, localDateOf } from "@/lib/date";
import { isCompleted } from "@/lib/tasks/task-model";
import type { DailyHighlight, ISODate, ISODateTime, KaizenLog, Task, Workspace } from "@/types";

import { isDoneOn, isDueByPattern } from "./commitments";

/* ---------------- Daily Highlight ---------------- */

export const getHighlightFor = (ws: Pick<Workspace, "highlights">, date: ISODate) =>
  ws.highlights.find((h) => h.dateKey === date) ?? null;

/** The highlight with its live task (if it still exists). Completion is the task's own status. */
export function resolveHighlight(ws: Pick<Workspace, "highlights" | "tasks">, date: ISODate) {
  const highlight = getHighlightFor(ws, date);
  if (!highlight) return null;
  const task = ws.tasks.find((t) => t.id === highlight.taskId) ?? null;
  return {
    highlight,
    task,
    title: task?.title ?? highlight.titleSnapshot,
    completed: task ? isCompleted(task) : false,
    deleted: !task,
  };
}

export function createHighlight(date: ISODate, task: Task, now: ISODateTime): DailyHighlight {
  return { id: createId(), dateKey: date, taskId: task.id, titleSnapshot: task.title, selectedAt: now, updatedAt: now };
}

/**
 * Yesterday's highlight if it's still unfinished — offered as a suggestion,
 * never carried forward automatically.
 */
export function getUnfinishedYesterday(ws: Pick<Workspace, "highlights" | "tasks">, today: ISODate) {
  const y = resolveHighlight(ws, addDays(today, -1));
  if (!y || !y.task || y.completed || y.task.status === "skipped") return null;
  if (getHighlightFor(ws, today)?.taskId === y.task.id) return null;
  return y.task;
}

/* ---------------- Kaizen Log ---------------- */

export const getLogFor = (ws: Pick<Workspace, "kaizenLogs">, date: ISODate) =>
  ws.kaizenLogs.find((l) => l.dateKey === date) ?? null;

export function createLog(date: ISODate, now: ISODateTime): KaizenLog {
  return {
    id: createId(),
    dateKey: date,
    reflectionWentWell: "",
    reflectionImprove: "",
    reflectionLearned: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

export const hasReflection = (log: KaizenLog | null) =>
  !!log && [log.reflectionWentWell, log.reflectionImprove, log.reflectionLearned].some((v) => v.trim());

export const hasNotes = (log: KaizenLog | null) => !!log && log.notes.trim().length > 0;

/** Tasks finished on a given local day. */
export const tasksCompletedOn = (tasks: Task[], date: ISODate) =>
  tasks.filter((t) => isCompleted(t) && t.completedAt !== null && localDateOf(t.completedAt) === date);

/**
 * Commitments to show for a past or present day. We don't keep a history of
 * pausing, so for past days we include every commitment that had started
 * and wasn't archived by then — plus anything actually ticked that day.
 */
export function commitmentsForDay(ws: Pick<Workspace, "commitments" | "commitmentCompletions">, date: ISODate, today: ISODate) {
  return ws.commitments.filter((c) => {
    if (isDoneOn(c.id, date, ws.commitmentCompletions)) return true;
    if (!isDueByPattern(c, date, ws.commitmentCompletions)) return false;
    if (date === today) return c.status === "active";
    return c.status !== "archived" || (c.archivedAt !== null && localDateOf(c.archivedAt) > date);
  });
}

/** One row of the history list. */
export function summarizeDay(ws: Workspace, date: ISODate) {
  const highlight = resolveHighlight(ws, date);
  const log = getLogFor(ws, date);
  const commitmentsDone = ws.commitmentCompletions.filter((c) => c.dateKey === date).length;
  return {
    date,
    highlight,
    tasksCompleted: tasksCompletedOn(ws.tasks, date).length,
    commitmentsDone,
    reflection: hasReflection(log),
    notes: hasNotes(log),
    sessions: ws.sessions.filter((s) => s.status === "ended" && s.endedAt && localDateOf(s.endedAt) === date).length,
  };
}

/** Days with anything recorded, newest first (today always included). */
export function getActiveDays(ws: Workspace, limit = 30) {
  const days = new Set<ISODate>([ws.today]);
  ws.highlights.forEach((h) => days.add(h.dateKey));
  ws.kaizenLogs.forEach((l) => (l.reflectionWentWell || l.reflectionImprove || l.reflectionLearned || l.notes) && days.add(l.dateKey));
  ws.commitmentCompletions.forEach((c) => days.add(c.dateKey));
  ws.tasks.forEach((t) => t.completedAt && isCompleted(t) && days.add(localDateOf(t.completedAt)));
  return [...days]
    .filter((d) => d <= ws.today)
    .sort()
    .reverse()
    .slice(0, limit);
}
