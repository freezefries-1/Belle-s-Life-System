import { addDays } from "@/lib/date";
import type { ISODate, SprintId, Task, TaskPriority } from "@/types";

import { isActive, isCompleted } from "./task-model";
import { isDueToday, isOverdue, sortTasks } from "./task-queries";

/** A column on the Sprints board: one of the four sprints, or the Unassigned tray. */
export type BoardContainer = SprintId | "unassigned";

export const containerOf = (t: Task): BoardContainer => t.sprint ?? "unassigned";
export const sprintFor = (c: BoardContainer): SprintId | null => (c === "unassigned" ? null : c);

export type BoardSort = "manual" | "due" | "priority" | "estimate";
export type BoardStatusFilter = "active" | "todo" | "in_progress" | "skipped";
export type BoardDueFilter = "any" | "overdue" | "today" | "next7" | "none";

export interface BoardQuery {
  status: BoardStatusFilter;
  priority: TaskPriority | "any" | "none";
  due: BoardDueFilter;
  project: string | "any" | "none";
  sort: BoardSort;
}

export const DEFAULT_BOARD_QUERY: BoardQuery = {
  status: "active",
  priority: "any",
  due: "any",
  project: "any",
  sort: "manual",
};

/** Manual drag-and-drop only makes sense when every open card is visible in manual order. */
export const canReorder = (q: BoardQuery) =>
  q.sort === "manual" && q.status === "active" && q.priority === "any" && q.due === "any" && q.project === "any";

export const isBoardFiltered = (q: BoardQuery) =>
  q.status !== "active" || q.priority !== "any" || q.due !== "any" || q.project !== "any";

export const byManualOrder = (a: Task, b: Task) =>
  a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

function matches(t: Task, q: BoardQuery, today: ISODate) {
  const statusOk = q.status === "active" ? isActive(t) : t.status === q.status;
  const priorityOk = q.priority === "any" || (q.priority === "none" ? t.priority === null : t.priority === q.priority);
  const projectOk = q.project === "any" || (q.project === "none" ? t.projectId === null : t.projectId === q.project);
  const dueOk =
    q.due === "any" ||
    (q.due === "overdue" && isOverdue(t, today)) ||
    (q.due === "today" && isDueToday(t, today)) ||
    (q.due === "next7" && t.dueDate !== null && t.dueDate >= today && t.dueDate <= addDays(today, 7)) ||
    (q.due === "none" && t.dueDate === null);
  return statusOk && priorityOk && projectOk && dueOk;
}

/** The cards shown in one column, filtered and sorted. */
export function getColumnTasks(tasks: Task[], container: BoardContainer, q: BoardQuery, today: ISODate) {
  const inColumn = tasks.filter((t) => containerOf(t) === container && matches(t, q, today));
  return q.sort === "manual" ? [...inColumn].sort(byManualOrder) : sortTasks(inColumn, q.sort);
}

/** Every open task in a column in manual order — the list drag-and-drop works on. */
export function getManualOrder(tasks: Task[], container: BoardContainer) {
  return tasks.filter((t) => containerOf(t) === container && isActive(t)).sort(byManualOrder);
}

/**
 * Sprint progress. Completion % = completed ÷ every task currently in the
 * sprint (any status). Null when the sprint is empty — never a fake 100%.
 */
export function getSprintProgress(tasks: Task[], sprint: SprintId) {
  const inSprint = tasks.filter((t) => t.sprint === sprint);
  const active = inSprint.filter(isActive);
  const completed = inSprint.filter(isCompleted);
  return {
    total: inSprint.length,
    active: active.length,
    completed: completed.length,
    remainingMinutes: active.reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0),
    unestimated: active.filter((t) => t.estimatedMinutes === null).length,
    percent: inSprint.length ? Math.round((completed.length / inSprint.length) * 100) : null,
    nextDeadline:
      active
        .map((t) => t.dueDate)
        .filter((d): d is string => d !== null)
        .sort()[0] ?? null,
  };
}

export interface OrderUpdate {
  id: string;
  sprint: SprintId | null;
  sortOrder: number;
}

/** Positions for a column's new arrangement — evenly spaced so future inserts have room. */
export function orderUpdatesFor(container: BoardContainer, orderedIds: string[]): OrderUpdate[] {
  return orderedIds.map((id, index) => ({ id, sprint: sprintFor(container), sortOrder: (index + 1) * 1000 }));
}

export { sortTasks };
