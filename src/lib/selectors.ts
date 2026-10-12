import type { ISODate, MicroCommitment, Project, SprintId, Task, Workspace } from "@/types";

/** Tasks that belong on today's plate: planned for today, carried over, or finished today. */
export function getTodayTasks(ws: Workspace) {
  return ws.tasks.filter(
    (t) =>
      t.completedDate === ws.today ||
      (t.status !== "done" && t.plannedDate !== null && t.plannedDate <= ws.today),
  );
}

/** Unfinished work from an earlier day — shown gently, never as "overdue". */
export function isCarriedOver(task: Task, today: ISODate) {
  return task.status !== "done" && task.plannedDate !== null && task.plannedDate < today;
}

export function getHighlightTask(ws: Workspace) {
  return ws.tasks.find((t) => t.id === ws.highlightTaskId) ?? null;
}

export function getProject(ws: Workspace, id: string | null): Project | null {
  return id ? (ws.projects.find((p) => p.id === id) ?? null) : null;
}

export function getProjectStats(ws: Workspace, projectId: string) {
  const tasks = ws.tasks.filter((t) => t.projectId === projectId);
  const done = tasks.filter((t) => t.status === "done").length;
  return {
    total: tasks.length,
    done,
    outstanding: tasks.length - done,
    percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  };
}

export function getSprintTasks(ws: Workspace, sprintId: SprintId) {
  return ws.tasks.filter((t) => t.sprintId === sprintId);
}

/** Sprint card stats focus on what's live: open work plus anything finished today. */
export function getSprintStats(ws: Workspace, sprintId: SprintId) {
  const tasks = getSprintTasks(ws, sprintId);
  const open = tasks.filter((t) => t.status !== "done");
  const doneToday = tasks.filter((t) => t.completedDate === ws.today);
  const total = open.length + doneToday.length;
  return {
    open,
    doneToday,
    total,
    percent: total ? Math.round((doneToday.length / total) * 100) : 0,
  };
}

export function isCommitmentDone(c: MicroCommitment, date: ISODate) {
  return c.completedDates.includes(date);
}

export function sortTasksForDisplay(tasks: Task[]) {
  const rank = { in_progress: 0, todo: 1, done: 2 } as const;
  return [...tasks].sort((a, b) => rank[a.status] - rank[b.status]);
}
