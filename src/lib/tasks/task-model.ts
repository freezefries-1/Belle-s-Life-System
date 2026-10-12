import { createId } from "@/lib/id";
import type { ISODateTime, Task, TaskInput, TaskPriority, TaskStatus } from "@/types";

export const TASK_STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "skipped", label: "Skipped" },
];

export const TASK_STATUS_LABEL = Object.fromEntries(TASK_STATUSES.map((s) => [s.id, s.label])) as Record<
  TaskStatus,
  string
>;

export const TASK_PRIORITIES: { id: TaskPriority; label: string; rank: number }[] = [
  { id: "high", label: "High", rank: 3 },
  { id: "medium", label: "Medium", rank: 2 },
  { id: "low", label: "Low", rank: 1 },
];

export const PRIORITY_LABEL: Record<TaskPriority, string> = { high: "High", medium: "Medium", low: "Low" };

export function priorityRank(p: TaskPriority | null) {
  return p ? (TASK_PRIORITIES.find((x) => x.id === p)?.rank ?? 0) : 0;
}

/** Quick picks for the estimate field, in minutes. */
export const ESTIMATE_PRESETS = [5, 10, 15, 30, 45, 60, 90, 120];

export const isCompleted = (t: Task) => t.status === "completed";
export const isSkipped = (t: Task) => t.status === "skipped";
/** Still on the plate: To Do or In Progress. */
export const isActive = (t: Task) => t.status === "todo" || t.status === "in_progress";

function cleanInput(input: TaskInput) {
  return {
    ...input,
    title: input.title.trim(),
    description: input.description?.trim(),
  };
}

export function createTask(input: TaskInput, now: ISODateTime, extra?: Partial<Task>): Task {
  const clean = cleanInput(input);
  const status = clean.status ?? "todo";
  return {
    id: createId(),
    title: clean.title,
    description: clean.description ?? "",
    status,
    priority: clean.priority ?? null,
    sprint: clean.sprint ?? null,
    projectId: clean.projectId ?? null,
    dueDate: clean.dueDate ?? null,
    estimatedMinutes: clean.estimatedMinutes ?? null,
    actualMinutes: clean.actualMinutes ?? null,
    createdAt: now,
    updatedAt: now,
    completedAt: status === "completed" ? now : null,
    sourceCaptureId: null,
    capturedAt: null,
    // Callers normally pass an explicit position (see `nextSortOrder`); the
    // timestamp fallback still places newer tasks after older ones.
    sortOrder: Date.parse(now),
    projectSortOrder: Date.parse(now),
    milestoneId: clean.milestoneId ?? null,
    recurrenceTemplateId: null,
    occurrenceDate: null,
    ...extra,
  };
}

/** A position after every existing task, so new or moved tasks land at the bottom. */
export function nextSortOrder(tasks: Task[]) {
  return tasks.reduce((max, t) => Math.max(max, Number.isFinite(t.sortOrder) ? t.sortOrder : 0), 0) + 1000;
}

/**
 * Apply edits, keeping status and completion timestamp consistent:
 * entering "completed" stamps `completedAt`, leaving it clears it.
 */
export function applyTaskChanges(task: Task, changes: Partial<TaskInput>, now: ISODateTime): Task {
  const clean = changes.title !== undefined ? cleanInput({ ...changes, title: changes.title }) : changes;
  const next: Task = { ...task, ...clean, updatedAt: now } as Task;
  if (next.status === "completed" && task.status !== "completed") next.completedAt = now;
  if (next.status !== "completed") next.completedAt = null;
  if (!next.title) next.title = task.title;
  return next;
}
