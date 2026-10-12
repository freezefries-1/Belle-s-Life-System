import { isInInbox, sortCaptures } from "@/lib/brain-dump/capture-model";
import { isCompleted, isSkipped } from "@/lib/tasks/task-model";
import type { ISODate, MicroCommitment, Project, Workspace } from "@/types";

export function getProject(ws: Workspace, id: string | null): Project | null {
  return id ? (ws.projects.find((p) => p.id === id) ?? null) : null;
}

/** Progress counts every task except skipped ones. */
export function getProjectStats(ws: Workspace, projectId: string) {
  const tasks = ws.tasks.filter((t) => t.projectId === projectId && !isSkipped(t));
  const done = tasks.filter(isCompleted).length;
  return {
    total: tasks.length,
    done,
    outstanding: tasks.length - done,
    percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  };
}

/** Active Brain Dump entries, newest first. */
export function getInbox(ws: Workspace) {
  return sortCaptures(ws.captures.filter(isInInbox));
}

export function isCommitmentDone(c: MicroCommitment, date: ISODate) {
  return c.completedDates.includes(date);
}
