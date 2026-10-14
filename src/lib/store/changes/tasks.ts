import { nextProjectSortOrder } from "@/lib/projects/project-model";
import type { OrderUpdate } from "@/lib/tasks/sprint-board";
import { applyTaskChanges, createTask, nextSortOrder } from "@/lib/tasks/task-model";
import type { Capture, CaptureInput, ISODateTime, PersistedData, SprintId, Task, TaskInput, TaskStatus } from "@/types";

/**
 * Brain Dump and task changes. Each takes the current data and returns the
 * next version (the same object when nothing changes), so the rules can be
 * tested without the app around them.
 */

export const addCapture = (d: PersistedData, capture: Capture): PersistedData => ({ ...d, captures: [capture, ...d.captures] });

export const updateCapture = (d: PersistedData, id: string, changes: Partial<CaptureInput>, now: ISODateTime): PersistedData => ({
  ...d,
  captures: d.captures.map((c) =>
    c.id === id
      ? {
          ...c,
          ...changes,
          title: changes.title?.trim() || c.title,
          note: changes.note !== undefined ? changes.note.trim() : c.note,
          updatedAt: now,
        }
      : c,
  ),
});

export const deleteCapture = (d: PersistedData, id: string): PersistedData => ({ ...d, captures: d.captures.filter((c) => c.id !== id) });

export const restoreCapture = (d: PersistedData, capture: Capture): PersistedData =>
  d.captures.some((c) => c.id === capture.id) ? d : { ...d, captures: [capture, ...d.captures] };

/** Keep an inbox entry as a note (out of the inbox), or move a kept note back. Converted entries are left alone. */
export function setCaptureKept(d: PersistedData, id: string, kept: boolean, now: ISODateTime): PersistedData {
  const capture = d.captures.find((c) => c.id === id);
  const from = kept ? "inbox" : "kept";
  if (!capture || capture.status !== from) return d;
  return { ...d, captures: d.captures.map((c) => (c.id === id ? { ...c, status: kept ? "kept" : "inbox", updatedAt: now } : c)) };
}

/** The text added to a project's notes: a dated heading, the entry's title and its note. */
export function captureNoteBlock(capture: Capture, dateLabel: string) {
  return [`— ${dateLabel}, from Brain Dump`, capture.title, capture.note].filter(Boolean).join("\n");
}

export interface FiledCapture {
  data: PersistedData;
  capture: Capture;
  projectId: string;
  /** Exactly what was appended, so Undo can take it out again. */
  appended: string;
}

/**
 * Add an entry (inbox or kept) to the end of a project's notes and remove it
 * from the Brain Dump. Existing notes are never changed, only added to.
 */
export function fileCaptureToProject(d: PersistedData, id: string, projectId: string, dateLabel: string, now: ISODateTime): FiledCapture | null {
  const capture = d.captures.find((c) => c.id === id);
  const project = d.projects.find((p) => p.id === projectId);
  if (!capture || capture.status === "converted" || !project) return null;
  const block = captureNoteBlock(capture, dateLabel);
  const appended = project.notes.trim() ? `\n\n${block}` : block;
  return {
    capture,
    projectId,
    appended,
    data: {
      ...d,
      captures: d.captures.filter((c) => c.id !== id),
      projects: d.projects.map((p) => (p.id === projectId ? { ...p, notes: p.notes + appended, updatedAt: now } : p)),
    },
  };
}

/** Undo fileCaptureToProject: the entry comes back, and the added text is taken out of the notes if it's still there. */
export function unfileCapture(d: PersistedData, filed: Pick<FiledCapture, "capture" | "projectId" | "appended">, now: ISODateTime): PersistedData {
  const restored = restoreCapture(d, filed.capture);
  return {
    ...restored,
    projects: restored.projects.map((p) => {
      if (p.id !== filed.projectId) return p;
      const at = p.notes.lastIndexOf(filed.appended);
      if (at < 0) return p;
      return { ...p, notes: p.notes.slice(0, at) + p.notes.slice(at + filed.appended.length), updatedAt: now };
    }),
  };
}

/** Turn an inbox entry (or a kept note) into a task. Returns null if it was already converted (double clicks, two tabs, stale dialogs). */
export function convertCapture(d: PersistedData, id: string, input: TaskInput, now: ISODateTime): { data: PersistedData; task: Task } | null {
  const capture = d.captures.find((c) => c.id === id);
  if (!capture || capture.status === "converted" || d.tasks.some((t) => t.sourceCaptureId === id) || !input.title.trim()) return null;
  const task = createTask(input, now, {
    sourceCaptureId: capture.id,
    capturedAt: capture.createdAt,
    sortOrder: nextSortOrder(d.tasks),
    projectSortOrder: input.projectId ? nextProjectSortOrder(d.tasks, input.projectId) : 0,
  });
  return {
    task,
    data: {
      ...d,
      tasks: [task, ...d.tasks],
      captures: d.captures.map((c) => (c.id === id ? { ...c, status: "converted", convertedTaskId: task.id, updatedAt: now } : c)),
    },
  };
}

/** A new task, placed at the bottom of its sprint and project lists. */
export const newTask = (d: PersistedData, input: TaskInput, now: ISODateTime): Task =>
  createTask(input, now, {
    sortOrder: nextSortOrder(d.tasks),
    projectSortOrder: input.projectId ? nextProjectSortOrder(d.tasks, input.projectId) : 0,
  });

export const addTask = (d: PersistedData, task: Task): PersistedData => ({ ...d, tasks: [task, ...d.tasks] });

export function updateTask(d: PersistedData, id: string, changes: Partial<TaskInput>, now: ISODateTime): PersistedData {
  const task = d.tasks.find((t) => t.id === id);
  if (!task) return d;
  const movedSprint = changes.sprint !== undefined && changes.sprint !== task.sprint;
  const updated = applyTaskChanges(task, changes, now);
  if (movedSprint) updated.sortOrder = nextSortOrder(d.tasks);
  if (updated.projectId !== task.projectId) {
    updated.projectSortOrder = updated.projectId ? nextProjectSortOrder(d.tasks, updated.projectId) : 0;
    const milestone = d.milestones.find((m) => m.id === updated.milestoneId);
    if (milestone?.projectId !== updated.projectId) updated.milestoneId = null;
  }
  if (!updated.projectId) updated.milestoneId = null;
  // Keep highlight snapshots readable if the task is later deleted.
  const renamed = updated.title !== task.title;
  return {
    ...d,
    tasks: d.tasks.map((t) => (t.id === id ? updated : t)),
    highlights: renamed ? d.highlights.map((h) => (h.taskId === id ? { ...h, titleSnapshot: updated.title } : h)) : d.highlights,
  };
}

function updateTaskWhere(d: PersistedData, id: string, fn: (t: Task) => Task): PersistedData {
  if (!d.tasks.some((t) => t.id === id)) return d;
  return { ...d, tasks: d.tasks.map((t) => (t.id === id ? fn(t) : t)) };
}

export const setTaskStatus = (d: PersistedData, id: string, status: TaskStatus, now: ISODateTime) =>
  updateTaskWhere(d, id, (t) => applyTaskChanges(t, { status }, now));

/** Completed ↔ To Do. */
export const toggleTaskComplete = (d: PersistedData, id: string, now: ISODateTime) =>
  updateTaskWhere(d, id, (t) => applyTaskChanges(t, { status: t.status === "completed" ? "todo" : "completed" }, now));

export const deleteTask = (d: PersistedData, id: string): PersistedData => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) });

export const restoreTask = (d: PersistedData, task: Task): PersistedData =>
  d.tasks.some((t) => t.id === task.id) ? d : { ...d, tasks: [task, ...d.tasks] };

/** Assign (or unassign) a sprint; the task goes to the bottom of that sprint. */
export function moveTaskToSprint(d: PersistedData, id: string, sprint: SprintId | null, now: ISODateTime): PersistedData {
  const task = d.tasks.find((t) => t.id === id);
  if (!task || task.sprint === sprint) return d;
  const moved = { ...task, sprint, sortOrder: nextSortOrder(d.tasks), updatedAt: now };
  return { ...d, tasks: d.tasks.map((t) => (t.id === id ? moved : t)) };
}

/** Save a drag-and-drop arrangement. Only `sprint` and `sortOrder` change. */
export function applyBoardOrder(d: PersistedData, updates: OrderUpdate[], now: ISODateTime): PersistedData {
  const byId = new Map(updates.map((u) => [u.id, u]));
  let changed = false;
  const tasks = d.tasks.map((t) => {
    const u = byId.get(t.id);
    if (!u || (u.sprint === t.sprint && u.sortOrder === t.sortOrder)) return t;
    changed = true;
    // Reordering alone isn't an edit; changing sprint is.
    return { ...t, sprint: u.sprint, sortOrder: u.sortOrder, updatedAt: u.sprint !== t.sprint ? now : t.updatedAt };
  });
  return changed ? { ...d, tasks } : d;
}
