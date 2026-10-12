import { addDays, localDateOf } from "@/lib/date";
import type { ISODate, SprintId, Task, TaskPriority, TaskStatus } from "@/types";

import { isActive, isCompleted, priorityRank } from "./task-model";

/* ---------------- Date buckets (all relative to the local calendar date) ---------------- */

export const isDueToday = (t: Task, today: ISODate) => t.dueDate === today;
/** Incomplete and due before today. */
export const isOverdue = (t: Task, today: ISODate) => isActive(t) && t.dueDate !== null && t.dueDate < today;
/** Incomplete and due after today. */
export const isUpcoming = (t: Task, today: ISODate) => isActive(t) && t.dueDate !== null && t.dueDate > today;
export const isUnscheduled = (t: Task) => t.dueDate === null;
export const wasCompletedOn = (t: Task, date: ISODate) =>
  isCompleted(t) && t.completedAt !== null && localDateOf(t.completedAt) === date;

/* ---------------- Views, filters and sorting ---------------- */

export type TaskView = "all" | "today" | "upcoming" | "completed" | "unscheduled";
export type StatusFilter = "open" | "any" | TaskStatus;
export type DueFilter = "any" | "overdue" | "today" | "next7" | "none";
export type TaskSort = "due" | "created" | "priority" | "estimate";

export interface TaskQuery {
  view: TaskView;
  search: string;
  status: StatusFilter;
  sprint: SprintId | "any" | "none";
  priority: TaskPriority | "any" | "none";
  due: DueFilter;
  sort: TaskSort;
}

export const DEFAULT_TASK_QUERY: TaskQuery = {
  view: "all",
  search: "",
  status: "open",
  sprint: "any",
  priority: "any",
  due: "any",
  sort: "due",
};

export const TASK_VIEWS: { id: TaskView; label: string }[] = [
  { id: "all", label: "All Tasks" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "unscheduled", label: "Unscheduled" },
  { id: "completed", label: "Completed" },
];

/** Views that already decide which statuses they show. */
export const viewControlsStatus = (view: TaskView) => view === "completed" || view === "upcoming";

function matchesView(t: Task, view: TaskView, today: ISODate) {
  switch (view) {
    case "today":
      return isDueToday(t, today);
    case "upcoming":
      return isUpcoming(t, today);
    case "completed":
      return isCompleted(t);
    case "unscheduled":
      return isUnscheduled(t);
    default:
      return true;
  }
}

function matchesStatus(t: Task, status: StatusFilter) {
  if (status === "any") return true;
  if (status === "open") return isActive(t);
  return t.status === status;
}

function matchesDue(t: Task, due: DueFilter, today: ISODate) {
  switch (due) {
    case "overdue":
      return isOverdue(t, today);
    case "today":
      return isDueToday(t, today);
    case "next7":
      return t.dueDate !== null && t.dueDate >= today && t.dueDate <= addDays(today, 7);
    case "none":
      return t.dueDate === null;
    default:
      return true;
  }
}

export function matchesSearch(t: Task, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
}

export function filterTasks(tasks: Task[], query: TaskQuery, today: ISODate) {
  return tasks.filter(
    (t) =>
      matchesView(t, query.view, today) &&
      (viewControlsStatus(query.view) || matchesStatus(t, query.status)) &&
      (query.sprint === "any" || (query.sprint === "none" ? t.sprint === null : t.sprint === query.sprint)) &&
      (query.priority === "any" || (query.priority === "none" ? t.priority === null : t.priority === query.priority)) &&
      matchesDue(t, query.due, today) &&
      matchesSearch(t, query.search),
  );
}

const byDue = (a: Task, b: Task) => (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99");
const byCreatedDesc = (a: Task, b: Task) => b.createdAt.localeCompare(a.createdAt);

/** Sorting keeps open work above finished work, then applies the chosen order. */
export function sortTasks(tasks: Task[], sort: TaskSort) {
  const statusRank: Record<TaskStatus, number> = { in_progress: 0, todo: 0, skipped: 1, completed: 2 };
  const compare: Record<TaskSort, (a: Task, b: Task) => number> = {
    due: (a, b) => byDue(a, b) || priorityRank(b.priority) - priorityRank(a.priority) || byCreatedDesc(a, b),
    created: byCreatedDesc,
    priority: (a, b) => priorityRank(b.priority) - priorityRank(a.priority) || byDue(a, b),
    estimate: (a, b) =>
      (a.estimatedMinutes ?? Infinity) - (b.estimatedMinutes ?? Infinity) || byDue(a, b),
  };
  return [...tasks].sort((a, b) => statusRank[a.status] - statusRank[b.status] || compare[sort](a, b));
}

/** Completed list: most recently finished first. */
export function sortCompleted(tasks: Task[]) {
  return [...tasks].sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
}

/* ---------------- Summaries ---------------- */

export function getTaskSummary(tasks: Task[], today: ISODate) {
  return {
    active: tasks.filter(isActive).length,
    dueToday: tasks.filter((t) => isActive(t) && isDueToday(t, today)).length,
    overdue: tasks.filter((t) => isOverdue(t, today)).length,
    completed: tasks.filter(isCompleted).length,
  };
}

/**
 * Today's progress: everything due today (except skipped) plus anything
 * finished today, so completing an undated task still counts.
 */
export function getDailyProgress(tasks: Task[], today: ISODate) {
  const completedToday = tasks.filter((t) => wasCompletedOn(t, today));
  const activeDueToday = tasks.filter((t) => isActive(t) && isDueToday(t, today));
  const planned = completedToday.length + activeDueToday.length;
  return {
    completedToday: completedToday.length,
    activeDueToday: activeDueToday.length,
    outstanding: tasks.filter(isActive).length,
    planned,
    percent: planned ? Math.round((completedToday.length / planned) * 100) : 0,
  };
}

export function getSprintStats(tasks: Task[], sprint: SprintId, today: ISODate) {
  const inSprint = tasks.filter((t) => t.sprint === sprint);
  const open = sortTasks(inSprint.filter(isActive), "due");
  const doneToday = inSprint.filter((t) => wasCompletedOn(t, today));
  const total = open.length + doneToday.length;
  return { open, doneToday, total, percent: total ? Math.round((doneToday.length / total) * 100) : 0 };
}
