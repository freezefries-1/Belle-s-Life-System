"use client";

import * as React from "react";
import { toast } from "sonner";

import { createPreviewContent } from "@/data/preview-content";
import { createSampleData } from "@/data/sample-data";
import { createCapture } from "@/lib/brain-dump/capture-model";
import { createCommitment } from "@/lib/daily/commitments";
import { createHighlight, createLog } from "@/lib/daily/day";
import { createId, nowISO } from "@/lib/id";
import { EMPTY_DATA } from "@/lib/storage/schema";
import {
  localStorageRepository,
  type LoadStatus,
  type WorkspaceRepository,
} from "@/lib/storage/workspace-repository";
import {
  createSession,
  endSession,
  isOpenSession,
  pauseSession,
  runSession,
  type NewSession,
} from "@/lib/sessions/session-model";
import type { OrderUpdate } from "@/lib/tasks/sprint-board";
import { applyTaskChanges, createTask, nextSortOrder } from "@/lib/tasks/task-model";
import { useToday } from "@/lib/use-today";
import type {
  Capture,
  CaptureInput,
  CommitmentInput,
  CommitmentStatus,
  DailyHighlight,
  ISODate,
  KaizenLogInput,
  MicroCommitment,
  PersistedData,
  SprintId,
  SprintSession,
  Task,
  TaskInput,
  TaskStatus,
  Workspace,
} from "@/types";

/**
 * The single source of truth for everything saved: tasks, Brain Dump,
 * sessions, daily highlights, micro-commitments and the Kaizen Log.
 *
 * Components read through `useWorkspace()` and change data only through
 * `actions`. Every change is written through the repository, which is
 * localStorage today and can become Supabase later.
 */

export interface WorkspaceActions {
  // Brain Dump
  addCapture: (input: CaptureInput) => Capture | null;
  updateCapture: (id: string, changes: Partial<CaptureInput>) => void;
  deleteCapture: (id: string) => Capture | null;
  restoreCapture: (capture: Capture) => void;
  /** Returns the new task, or null if the entry was already converted. */
  convertCapture: (id: string, input: TaskInput) => Task | null;

  // Tasks
  createTask: (input: TaskInput) => Task | null;
  updateTask: (id: string, changes: Partial<TaskInput>) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  /** Completed ↔ To Do. Returns the updated task. */
  toggleTaskComplete: (id: string) => Task | null;
  deleteTask: (id: string) => Task | null;
  restoreTask: (task: Task) => void;

  // Sprints
  /** Assign (or unassign) a sprint; the task goes to the bottom of that sprint. */
  moveTaskToSprint: (id: string, sprint: SprintId | null) => void;
  /** Save a drag-and-drop arrangement. Only `sprint` and `sortOrder` change. */
  applyBoardOrder: (updates: OrderUpdate[]) => void;

  // Sessions (one open session at a time)
  /** Returns null if another session is still open. */
  createSession: (input: NewSession) => SprintSession | null;
  startSession: (id: string) => void;
  pauseSession: (id: string) => void;
  endSession: (id: string) => SprintSession | null;

  // Daily Highlight (one per local calendar day, always today's)
  /** Make an existing task today's highlight (replaces any current one). */
  setHighlight: (taskId: string) => DailyHighlight | null;
  /** Create a task and make it today's highlight in one step. */
  createHighlightTask: (input: TaskInput) => Task | null;
  removeHighlight: () => void;

  // Micro-commitments
  createCommitment: (input: CommitmentInput) => MicroCommitment | null;
  updateCommitment: (id: string, changes: Partial<CommitmentInput>) => void;
  setCommitmentStatus: (id: string, status: CommitmentStatus) => void;
  /** Deletes the commitment and its completion history. */
  deleteCommitment: (id: string) => void;
  /** Tick or untick one day. Returns true if it's now done. */
  toggleCommitmentDone: (id: string, date: ISODate) => boolean;

  // Kaizen Log
  /** Create the day's log if it doesn't exist yet (idempotent). */
  ensureLog: (date: ISODate) => void;
  updateLog: (date: ISODate, changes: KaizenLogInput) => void;

  // Data
  loadSampleData: () => void;
  clearAllData: () => void;
}

export interface StorageInfo {
  status: LoadStatus;
  isFirstRun: boolean;
}

interface WorkspaceContextValue {
  workspace: Workspace;
  actions: WorkspaceActions;
  storage: StorageInfo;
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children,
  repository = localStorageRepository,
}: {
  children: React.ReactNode;
  repository?: WorkspaceRepository;
}) {
  const today = useToday();
  const [data, setData] = React.useState<PersistedData | null>(null);
  const [storage, setStorage] = React.useState<StorageInfo>({ status: "ok", isFirstRun: false });
  const dataRef = React.useRef<PersistedData | null>(null);
  const saveErrorShown = React.useRef(false);

  // Load once, in the browser only (avoids hydration mismatches).
  React.useEffect(() => {
    let cancelled = false;
    repository.load().then((result) => {
      if (cancelled) return;
      dataRef.current = result.data;
      setData(result.data);
      setStorage({ status: result.status, isFirstRun: result.isFirstRun });
      if (result.message) toast(result.message, { duration: 8000 });
    });
    const unsubscribe = repository.subscribe((external) => {
      dataRef.current = external;
      setData(external);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [repository]);

  const preview = React.useMemo(() => (today ? createPreviewContent(today) : null), [today]);

  const actions = React.useMemo<WorkspaceActions>(() => {
    /** Apply a change, then persist it. Synchronous so callers get results back. */
    const commit = (change: (current: PersistedData) => PersistedData) => {
      const current = dataRef.current;
      if (!current) return;
      const next = change(current);
      if (next === current) return;
      dataRef.current = next;
      setData(next);
      setStorage((s) => (s.isFirstRun ? { ...s, isFirstRun: false } : s));
      repository.save(next).then((result) => {
        if (!result.ok && !saveErrorShown.current) {
          saveErrorShown.current = true;
          toast.error(result.message);
        }
      });
    };

    const updateTaskWhere = (id: string, fn: (t: Task, now: string) => Task) =>
      commit((d) => {
        if (!d.tasks.some((t) => t.id === id)) return d;
        const now = nowISO();
        return { ...d, tasks: d.tasks.map((t) => (t.id === id ? fn(t, now) : t)) };
      });

    return {
      addCapture: (input) => {
        if (!input.title.trim()) return null;
        const capture = createCapture(input, nowISO());
        commit((d) => ({ ...d, captures: [capture, ...d.captures] }));
        return capture;
      },

      updateCapture: (id, changes) =>
        commit((d) => ({
          ...d,
          captures: d.captures.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...changes,
                  title: changes.title?.trim() || c.title,
                  note: changes.note !== undefined ? changes.note.trim() : c.note,
                  updatedAt: nowISO(),
                }
              : c,
          ),
        })),

      deleteCapture: (id) => {
        const capture = dataRef.current?.captures.find((c) => c.id === id) ?? null;
        if (capture) commit((d) => ({ ...d, captures: d.captures.filter((c) => c.id !== id) }));
        return capture;
      },

      restoreCapture: (capture) =>
        commit((d) =>
          d.captures.some((c) => c.id === capture.id) ? d : { ...d, captures: [capture, ...d.captures] },
        ),

      convertCapture: (id, input) => {
        const current = dataRef.current;
        const capture = current?.captures.find((c) => c.id === id);
        // Guard against double conversion (double clicks, two tabs, stale dialogs).
        if (
          !current ||
          !capture ||
          capture.status !== "inbox" ||
          current.tasks.some((t) => t.sourceCaptureId === id) ||
          !input.title.trim()
        ) {
          return null;
        }
        const now = nowISO();
        const task = createTask(input, now, {
          sourceCaptureId: capture.id,
          capturedAt: capture.createdAt,
          sortOrder: nextSortOrder(current.tasks),
        });
        commit((d) => ({
          ...d,
          tasks: [task, ...d.tasks],
          captures: d.captures.map((c) =>
            c.id === id ? { ...c, status: "converted", convertedTaskId: task.id, updatedAt: now } : c,
          ),
        }));
        return task;
      },

      createTask: (input) => {
        if (!input.title.trim() || !dataRef.current) return null;
        const task = createTask(input, nowISO(), { sortOrder: nextSortOrder(dataRef.current.tasks) });
        commit((d) => ({ ...d, tasks: [task, ...d.tasks] }));
        return task;
      },

      updateTask: (id, changes) =>
        commit((d) => {
          const task = d.tasks.find((t) => t.id === id);
          if (!task) return d;
          const now = nowISO();
          const movedSprint = changes.sprint !== undefined && changes.sprint !== task.sprint;
          const updated = applyTaskChanges(task, changes, now);
          if (movedSprint) updated.sortOrder = nextSortOrder(d.tasks);
          // Keep highlight snapshots readable if the task is later deleted.
          const renamed = updated.title !== task.title;
          return {
            ...d,
            tasks: d.tasks.map((t) => (t.id === id ? updated : t)),
            highlights: renamed
              ? d.highlights.map((h) => (h.taskId === id ? { ...h, titleSnapshot: updated.title } : h))
              : d.highlights,
          };
        }),

      setTaskStatus: (id, status) => updateTaskWhere(id, (t, now) => applyTaskChanges(t, { status }, now)),

      toggleTaskComplete: (id) => {
        updateTaskWhere(id, (t, now) =>
          applyTaskChanges(t, { status: t.status === "completed" ? "todo" : "completed" }, now),
        );
        return dataRef.current?.tasks.find((t) => t.id === id) ?? null;
      },

      deleteTask: (id) => {
        const task = dataRef.current?.tasks.find((t) => t.id === id) ?? null;
        if (task) commit((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));
        return task;
      },

      restoreTask: (task) =>
        commit((d) => (d.tasks.some((t) => t.id === task.id) ? d : { ...d, tasks: [task, ...d.tasks] })),

      moveTaskToSprint: (id, sprint) =>
        commit((d) => {
          const task = d.tasks.find((t) => t.id === id);
          if (!task || task.sprint === sprint) return d;
          const moved = { ...task, sprint, sortOrder: nextSortOrder(d.tasks), updatedAt: nowISO() };
          return { ...d, tasks: d.tasks.map((t) => (t.id === id ? moved : t)) };
        }),

      applyBoardOrder: (updates) =>
        commit((d) => {
          const byId = new Map(updates.map((u) => [u.id, u]));
          let changed = false;
          const now = nowISO();
          const tasks = d.tasks.map((t) => {
            const u = byId.get(t.id);
            if (!u || (u.sprint === t.sprint && u.sortOrder === t.sortOrder)) return t;
            changed = true;
            // Reordering alone isn't an edit; changing sprint is.
            return { ...t, sprint: u.sprint, sortOrder: u.sortOrder, updatedAt: u.sprint !== t.sprint ? now : t.updatedAt };
          });
          return changed ? { ...d, tasks } : d;
        }),

      createSession: (input) => {
        const current = dataRef.current;
        if (!current || current.sessions.some(isOpenSession)) return null;
        const session = createSession(input, nowISO());
        commit((d) => ({ ...d, sessions: [session, ...d.sessions] }));
        return session;
      },

      startSession: (id) =>
        commit((d) => ({ ...d, sessions: d.sessions.map((x) => (x.id === id ? runSession(x, nowISO()) : x)) })),

      pauseSession: (id) =>
        commit((d) => ({ ...d, sessions: d.sessions.map((x) => (x.id === id ? pauseSession(x, nowISO()) : x)) })),

      endSession: (id) => {
        commit((d) => ({
          ...d,
          sessions: d.sessions.map((x) => (x.id === id ? endSession(x, d.tasks, nowISO()) : x)),
        }));
        return dataRef.current?.sessions.find((x) => x.id === id) ?? null;
      },

      setHighlight: (taskId) => {
        const current = dataRef.current;
        const task = current?.tasks.find((t) => t.id === taskId);
        if (!current || !task || !today) return null;
        const now = nowISO();
        const existing = current.highlights.find((h) => h.dateKey === today);
        if (existing?.taskId === taskId) return existing;
        // Only today's record changes; earlier days keep their own highlight.
        const highlight: DailyHighlight = existing
          ? { ...existing, taskId, titleSnapshot: task.title, selectedAt: now, updatedAt: now }
          : createHighlight(today, task, now);
        commit((d) => ({
          ...d,
          highlights: [highlight, ...d.highlights.filter((h) => h.dateKey !== today)],
        }));
        return highlight;
      },

      createHighlightTask: (input) => {
        const current = dataRef.current;
        if (!current || !today || !input.title.trim()) return null;
        const now = nowISO();
        const task = createTask(input, now, { sortOrder: nextSortOrder(current.tasks) });
        const existing = current.highlights.find((h) => h.dateKey === today);
        const highlight: DailyHighlight = existing
          ? { ...existing, taskId: task.id, titleSnapshot: task.title, selectedAt: now, updatedAt: now }
          : createHighlight(today, task, now);
        commit((d) => ({
          ...d,
          tasks: [task, ...d.tasks],
          highlights: [highlight, ...d.highlights.filter((h) => h.dateKey !== today)],
        }));
        return task;
      },

      removeHighlight: () =>
        commit((d) =>
          d.highlights.some((h) => h.dateKey === today)
            ? { ...d, highlights: d.highlights.filter((h) => h.dateKey !== today) }
            : d,
        ),

      createCommitment: (input) => {
        if (!today || !input.title.trim()) return null;
        const commitment = createCommitment(input, today, nowISO());
        commit((d) => ({ ...d, commitments: [...d.commitments, commitment] }));
        return commitment;
      },

      updateCommitment: (id, changes) =>
        commit((d) => ({
          ...d,
          commitments: d.commitments.map((c) => {
            if (c.id !== id) return c;
            const next = {
              ...c,
              ...changes,
              title: changes.title?.trim() || c.title,
              description: changes.description !== undefined ? changes.description.trim() : c.description,
              updatedAt: nowISO(),
            };
            if (next.frequency === "weekdays" && next.selectedWeekdays.length === 0) next.frequency = "daily";
            return next;
          }),
        })),

      setCommitmentStatus: (id, status) =>
        commit((d) => ({
          ...d,
          commitments: d.commitments.map((c) =>
            c.id === id && c.status !== status
              ? { ...c, status, archivedAt: status === "archived" ? nowISO() : null, updatedAt: nowISO() }
              : c,
          ),
        })),

      deleteCommitment: (id) =>
        commit((d) => ({
          ...d,
          commitments: d.commitments.filter((c) => c.id !== id),
          commitmentCompletions: d.commitmentCompletions.filter((c) => c.commitmentId !== id),
        })),

      toggleCommitmentDone: (id, date) => {
        const current = dataRef.current;
        if (!current || (today && date > today)) return false;
        const existing = current.commitmentCompletions.find((c) => c.commitmentId === id && c.dateKey === date);
        commit((d) => ({
          ...d,
          // At most one record per commitment per day — add or remove, never duplicate.
          commitmentCompletions: existing
            ? d.commitmentCompletions.filter((c) => c !== existing)
            : [...d.commitmentCompletions, { id: createId(), commitmentId: id, dateKey: date, completedAt: nowISO() }],
        }));
        return !existing;
      },

      ensureLog: (date) =>
        commit((d) => (d.kaizenLogs.some((l) => l.dateKey === date) ? d : { ...d, kaizenLogs: [...d.kaizenLogs, createLog(date, nowISO())] })),

      updateLog: (date, changes) =>
        commit((d) => {
          if (today && date > today) return d;
          const now = nowISO();
          const existing = d.kaizenLogs.find((l) => l.dateKey === date);
          const base = existing ?? createLog(date, now);
          const updated = { ...base, ...changes, updatedAt: now };
          return {
            ...d,
            kaizenLogs: existing ? d.kaizenLogs.map((l) => (l === existing ? updated : l)) : [...d.kaizenLogs, updated],
          };
        }),

      loadSampleData: () => {
        if (!today) return;
        commit(() => createSampleData(today));
      },

      clearAllData: () => commit(() => EMPTY_DATA),
    };
  }, [repository, today]);

  // A new day gets its (empty) Kaizen Log as soon as the app is open on it —
  // on load, after midnight in an open tab, or when returning to the tab.
  // No background job needed, and earlier days are never touched.
  React.useEffect(() => {
    if (today && data && !data.kaizenLogs.some((l) => l.dateKey === today)) actions.ensureLog(today);
  }, [today, data, actions]);

  const value = React.useMemo<WorkspaceContextValue | null>(() => {
    if (!today || !data || !preview) return null;
    return {
      workspace: { ...preview, ...data, today },
      actions,
      storage,
    };
  }, [today, data, preview, actions, storage]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

/** Returns null until the workspace has loaded in the browser. */
export function useWorkspaceOptional() {
  return React.useContext(WorkspaceContext);
}

/** For components rendered inside <WorkspaceReady>. */
export function useWorkspace() {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceReady>");
  return ctx;
}

/** Renders children only once workspace data is available. */
export function WorkspaceReady({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const ctx = React.useContext(WorkspaceContext);
  return ctx ? children : fallback;
}
