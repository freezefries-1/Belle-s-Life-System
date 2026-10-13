import { createHighlight, createLog } from "@/lib/daily/day";
import { createId } from "@/lib/id";
import { endSession, pauseSession, runSession } from "@/lib/sessions/session-model";
import { createTask, nextSortOrder } from "@/lib/tasks/task-model";
import type {
  CommitmentInput,
  CommitmentStatus,
  DailyHighlight,
  ISODate,
  ISODateTime,
  KaizenLogInput,
  MicroCommitment,
  PersistedData,
  SprintSession,
  Task,
  TaskInput,
} from "@/types";

/** Focus sessions, Daily Highlights, micro-commitments and the Kaizen Log. */

/* ---------------- sessions ---------------- */

export const addSession = (d: PersistedData, session: SprintSession): PersistedData => ({ ...d, sessions: [session, ...d.sessions] });

export const startSession = (d: PersistedData, id: string, now: ISODateTime): PersistedData => ({
  ...d,
  sessions: d.sessions.map((x) => (x.id === id ? runSession(x, now) : x)),
});

export const pauseSessionById = (d: PersistedData, id: string, now: ISODateTime): PersistedData => ({
  ...d,
  sessions: d.sessions.map((x) => (x.id === id ? pauseSession(x, now) : x)),
});

export const endSessionById = (d: PersistedData, id: string, now: ISODateTime): PersistedData => ({
  ...d,
  sessions: d.sessions.map((x) => (x.id === id ? endSession(x, d.tasks, now) : x)),
});

/* ---------------- Daily Highlight (one per day, always today's) ---------------- */

/** Make an existing task today's highlight, replacing any current one. Earlier days keep their own. */
export function setHighlight(d: PersistedData, taskId: string, today: ISODate, now: ISODateTime): { data: PersistedData; highlight: DailyHighlight } | null {
  const task = d.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  const existing = d.highlights.find((h) => h.dateKey === today);
  if (existing?.taskId === taskId) return { data: d, highlight: existing };
  const highlight: DailyHighlight = existing
    ? { ...existing, taskId, titleSnapshot: task.title, selectedAt: now, updatedAt: now }
    : createHighlight(today, task, now);
  return { highlight, data: { ...d, highlights: [highlight, ...d.highlights.filter((h) => h.dateKey !== today)] } };
}

/** Create a task and make it today's highlight in one step. */
export function createHighlightTask(d: PersistedData, input: TaskInput, today: ISODate, now: ISODateTime): { data: PersistedData; task: Task } {
  const task = createTask(input, now, { sortOrder: nextSortOrder(d.tasks) });
  const existing = d.highlights.find((h) => h.dateKey === today);
  const highlight: DailyHighlight = existing
    ? { ...existing, taskId: task.id, titleSnapshot: task.title, selectedAt: now, updatedAt: now }
    : createHighlight(today, task, now);
  return {
    task,
    data: { ...d, tasks: [task, ...d.tasks], highlights: [highlight, ...d.highlights.filter((h) => h.dateKey !== today)] },
  };
}

export const removeHighlight = (d: PersistedData, today: ISODate): PersistedData =>
  d.highlights.some((h) => h.dateKey === today) ? { ...d, highlights: d.highlights.filter((h) => h.dateKey !== today) } : d;

/* ---------------- micro-commitments ---------------- */

export const addCommitment = (d: PersistedData, commitment: MicroCommitment): PersistedData => ({
  ...d,
  commitments: [...d.commitments, commitment],
});

export const updateCommitment = (d: PersistedData, id: string, changes: Partial<CommitmentInput>, now: ISODateTime): PersistedData => ({
  ...d,
  commitments: d.commitments.map((c) => {
    if (c.id !== id) return c;
    const next = {
      ...c,
      ...changes,
      title: changes.title?.trim() || c.title,
      description: changes.description !== undefined ? changes.description.trim() : c.description,
      updatedAt: now,
    };
    if (next.frequency === "weekdays" && next.selectedWeekdays.length === 0) next.frequency = "daily";
    return next;
  }),
});

/** Pause, resume, archive or restore — keeping a record of paused stretches so past consistency stays honest. */
export const setCommitmentStatus = (d: PersistedData, id: string, status: CommitmentStatus, today: ISODate, now: ISODateTime): PersistedData => ({
  ...d,
  commitments: d.commitments.map((c) => {
    if (c.id !== id || c.status === status) return c;
    const closeOpen = c.pausedPeriods.map((p) => (p.to === null ? { ...p, to: today } : p));
    const pausedPeriods = status === "paused" ? [...closeOpen, { from: today, to: null }] : closeOpen;
    return { ...c, status, pausedPeriods, archivedAt: status === "archived" ? now : null, updatedAt: now };
  }),
});

/** Deletes the commitment and its completion history. */
export const deleteCommitment = (d: PersistedData, id: string): PersistedData => ({
  ...d,
  commitments: d.commitments.filter((c) => c.id !== id),
  commitmentCompletions: d.commitmentCompletions.filter((c) => c.commitmentId !== id),
});

/** Tick or untick one day: at most one record per commitment per day — added or removed, never duplicated. */
export function toggleCommitmentDone(d: PersistedData, id: string, date: ISODate, now: ISODateTime): { data: PersistedData; done: boolean } {
  const existing = d.commitmentCompletions.find((c) => c.commitmentId === id && c.dateKey === date);
  return {
    done: !existing,
    data: {
      ...d,
      commitmentCompletions: existing
        ? d.commitmentCompletions.filter((c) => c !== existing)
        : [...d.commitmentCompletions, { id: createId(), commitmentId: id, dateKey: date, completedAt: now }],
    },
  };
}

/* ---------------- Kaizen Log ---------------- */

/** Create the day's log if it doesn't exist yet (idempotent). */
export const ensureLog = (d: PersistedData, date: ISODate, now: ISODateTime): PersistedData =>
  d.kaizenLogs.some((l) => l.dateKey === date) ? d : { ...d, kaizenLogs: [...d.kaizenLogs, createLog(date, now)] };

export function updateLog(d: PersistedData, date: ISODate, changes: KaizenLogInput, now: ISODateTime): PersistedData {
  const existing = d.kaizenLogs.find((l) => l.dateKey === date);
  const updated = { ...(existing ?? createLog(date, now)), ...changes, updatedAt: now };
  return { ...d, kaizenLogs: existing ? d.kaizenLogs.map((l) => (l === existing ? updated : l)) : [...d.kaizenLogs, updated] };
}
