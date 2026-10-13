import { isInInbox, sortCaptures } from "@/lib/brain-dump/capture-model";
import { isOpenSession } from "@/lib/sessions/session-model";
import type { Project, Workspace } from "@/types";

export function getProject(ws: Workspace, id: string | null): Project | null {
  return id ? (ws.projects.find((p) => p.id === id) ?? null) : null;
}

/** Active Brain Dump entries, newest first. */
export function getInbox(ws: Workspace) {
  return sortCaptures(ws.captures.filter(isInInbox));
}


/** The one session that is planned, running or paused, if any. */
export function getOpenSession(ws: Workspace) {
  return ws.sessions.find(isOpenSession) ?? null;
}

/** Finished sessions, newest first. */
export function getSessionHistory(ws: Workspace) {
  return ws.sessions
    .filter((s) => s.status === "ended")
    .sort((a, b) => (b.endedAt ?? b.createdAt).localeCompare(a.endedAt ?? a.createdAt));
}
