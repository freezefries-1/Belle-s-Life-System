import { createId } from "@/lib/id";
import type { EnergyLevel, ISODateTime, SprintId, SprintSession, Task } from "@/types";

export const SESSION_DURATIONS = [15, 30, 45, 60, 90];

export const ENERGY_OPTIONS: { id: EnergyLevel; label: string; hint: string }[] = [
  { id: "low", label: "Low energy", hint: "Consider smaller admin tasks or a short session." },
  { id: "moderate", label: "Moderate energy", hint: "Consider deadline preparation or routine work." },
  { id: "high", label: "High energy", hint: "Consider deep work, creative tasks or complex projects." },
];

export const isOpenSession = (s: SprintSession) => s.status !== "ended";

export interface NewSession {
  sprintId: SprintId;
  taskIds: string[];
  plannedMinutes: number;
  energyLevel: EnergyLevel | null;
}

export function createSession(input: NewSession, now: ISODateTime): SprintSession {
  return {
    id: createId(),
    sprintId: input.sprintId,
    taskIds: [...new Set(input.taskIds)],
    plannedMinutes: Math.max(1, Math.round(input.plannedMinutes)),
    energyLevel: input.energyLevel,
    status: "ready",
    createdAt: now,
    startedAt: null,
    endedAt: null,
    accumulatedElapsedSeconds: 0,
    lastResumedAt: null,
    completedTaskIds: [],
  };
}

/**
 * Elapsed time from timestamps, not tick counts: survives background tabs,
 * sleep and page refreshes. Negative clock jumps are ignored.
 */
export function elapsedSeconds(session: SprintSession, nowMs: number) {
  if (session.status !== "running" || !session.lastResumedAt) return session.accumulatedElapsedSeconds;
  const running = Math.max(0, (nowMs - Date.parse(session.lastResumedAt)) / 1000);
  return session.accumulatedElapsedSeconds + running;
}

/** Start the first time, or resume after a pause. */
export function runSession(s: SprintSession, now: ISODateTime): SprintSession {
  if (s.status === "running" || s.status === "ended") return s;
  return { ...s, status: "running", startedAt: s.startedAt ?? now, lastResumedAt: now };
}

export function pauseSession(s: SprintSession, now: ISODateTime): SprintSession {
  if (s.status !== "running") return s;
  return {
    ...s,
    status: "paused",
    accumulatedElapsedSeconds: Math.round(elapsedSeconds(s, Date.parse(now))),
    lastResumedAt: null,
  };
}

export function endSession(s: SprintSession, tasks: Task[], now: ISODateTime): SprintSession {
  if (s.status === "ended") return s;
  const completed = tasks.filter((t) => s.taskIds.includes(t.id) && t.status === "completed").map((t) => t.id);
  return {
    ...s,
    status: "ended",
    accumulatedElapsedSeconds: Math.round(elapsedSeconds(s, Date.parse(now))),
    lastResumedAt: null,
    endedAt: now,
    completedTaskIds: completed,
  };
}

/** Numbers for the end-of-session summary. Deleted tasks simply drop out. */
export function summarizeSession(s: SprintSession, tasks: Task[], nowMs: number) {
  const sessionTasks = s.taskIds.map((id) => tasks.find((t) => t.id === id)).filter((t): t is Task => !!t);
  const completed =
    s.status === "ended"
      ? sessionTasks.filter((t) => s.completedTaskIds.includes(t.id))
      : sessionTasks.filter((t) => t.status === "completed");
  return {
    tasks: sessionTasks,
    completed: completed.length,
    remaining: sessionTasks.length - completed.length,
    elapsedSeconds: Math.round(elapsedSeconds(s, nowMs)),
    plannedSeconds: s.plannedMinutes * 60,
    estimatedMinutes: sessionTasks.reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0),
  };
}

export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}
