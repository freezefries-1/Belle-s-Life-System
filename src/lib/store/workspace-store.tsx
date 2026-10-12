"use client";

import * as React from "react";
import { toast } from "sonner";

import { createSampleData } from "@/data/sample-data";
import { createCapture } from "@/lib/brain-dump/capture-model";
import { createCommitment } from "@/lib/daily/commitments";
import { createHighlight, createLog } from "@/lib/daily/day";
import { addDays } from "@/lib/date";
import { MAX_PRIORITIES, createWeeklyReview } from "@/lib/review/weekly";
import { createMilestone, createProject, nextProjectSortOrder } from "@/lib/projects/project-model";
import { createTemplate, generateOccurrences, normalizeRule, templateTaskFields } from "@/lib/recurrence/recurrence";
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
  Milestone,
  MilestoneInput,
  PersistedData,
  Project,
  ProjectInput,
  ProjectStatus,
  RecurrenceInput,
  RecurrenceStatus,
  RecurrenceTemplate,
  SessionAllocation,
  SprintId,
  SprintSession,
  Task,
  TaskInput,
  TaskStatus,
  WeeklyPriority,
  WeeklyReview,
  WeeklyReviewInput,
  WeeklyReviewStatus,
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

  // Projects
  createProject: (input: ProjectInput) => Project | null;
  updateProject: (id: string, changes: Partial<ProjectInput>) => void;
  setProjectStatus: (id: string, status: ProjectStatus) => void;
  /** Deletes the project and its milestones. Its tasks are kept and simply unlinked. */
  deleteProject: (id: string) => void;
  /** Link (or unlink with null) an existing task; it goes to the bottom of that project's list. */
  linkTaskToProject: (taskId: string, projectId: string | null) => void;
  reorderProjectTasks: (projectId: string, orderedTaskIds: string[]) => void;

  // Milestones
  createMilestone: (projectId: string, input: MilestoneInput) => Milestone | null;
  updateMilestone: (id: string, changes: Partial<MilestoneInput>) => void;
  /** Tasks linked to it stay, unlinked from the milestone. */
  deleteMilestone: (id: string) => void;
  reorderMilestones: (projectId: string, orderedIds: string[]) => void;

  // Recurring tasks
  createRecurrence: (input: RecurrenceInput) => RecurrenceTemplate | null;
  /**
   * Edit the series. Applies to future unfinished occurrences only; past and
   * completed ones are never rewritten. A schedule change regenerates them.
   */
  updateRecurrence: (id: string, changes: Partial<RecurrenceInput>) => void;
  setRecurrenceStatus: (id: string, status: RecurrenceStatus, options?: { removeFuture?: boolean }) => void;
  /** Completed occurrences are always kept (as ordinary tasks). */
  deleteRecurrence: (id: string, options?: { removeFuture?: boolean }) => void;
  /** Generate any occurrences now due (runs automatically on open and at day change). */
  syncRecurrences: () => void;

  // Data
  // Weekly reviews (keyed by the week's Monday; created on first save)
  updateWeeklyReview: (weekStart: ISODate, changes: WeeklyReviewInput) => void;
  setWeeklyReviewStatus: (weekStart: ISODate, status: WeeklyReviewStatus) => void;
  /** Replaces the week's priorities (max three, in order). */
  setWeeklyPriorities: (weekStart: ISODate, items: Pick<WeeklyPriority, "taskId" | "projectId" | "title">[]) => void;

  // Time
  /** Give a finished session's minutes to its tasks (adds to their actual time). */
  allocateSessionTime: (sessionId: string, allocations: SessionAllocation[]) => boolean;

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
          projectSortOrder: input.projectId ? nextProjectSortOrder(current.tasks, input.projectId) : 0,
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
        const tasks = dataRef.current.tasks;
        const task = createTask(input, nowISO(), {
          sortOrder: nextSortOrder(tasks),
          projectSortOrder: input.projectId ? nextProjectSortOrder(tasks, input.projectId) : 0,
        });
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
        commit((d) => {
          if (!today) return d;
          const now = nowISO();
          return {
            ...d,
            commitments: d.commitments.map((c) => {
              if (c.id !== id || c.status === status) return c;
              // Keep a record of paused stretches so past consistency stays honest.
              const closeOpen = c.pausedPeriods.map((p) => (p.to === null ? { ...p, to: today } : p));
              const pausedPeriods = status === "paused" ? [...closeOpen, { from: today, to: null }] : closeOpen;
              return { ...c, status, pausedPeriods, archivedAt: status === "archived" ? now : null, updatedAt: now };
            }),
          };
        }),

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

      createProject: (input) => {
        if (!input.name.trim()) return null;
        const project = createProject(input, nowISO());
        commit((d) => ({ ...d, projects: [...d.projects, project] }));
        return project;
      },

      updateProject: (id, changes) =>
        commit((d) => ({
          ...d,
          projects: d.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...changes,
                  name: changes.name?.trim() || p.name,
                  description: changes.description !== undefined ? changes.description.trim() : p.description,
                  category: changes.category !== undefined ? changes.category.trim() : p.category,
                  archivedAt: changes.status ? (changes.status === "archived" ? (p.archivedAt ?? nowISO()) : null) : p.archivedAt,
                  updatedAt: nowISO(),
                }
              : p,
          ),
        })),

      setProjectStatus: (id, status) =>
        commit((d) => ({
          ...d,
          projects: d.projects.map((p) =>
            p.id === id && p.status !== status
              ? { ...p, status, archivedAt: status === "archived" ? nowISO() : null, updatedAt: nowISO() }
              : p,
          ),
        })),

      deleteProject: (id) =>
        commit((d) => ({
          ...d,
          projects: d.projects.filter((p) => p.id !== id),
          milestones: d.milestones.filter((m) => m.projectId !== id),
          // Never cascade: tasks stay, just without a project.
          tasks: d.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null, milestoneId: null, updatedAt: nowISO() } : t)),
          recurrences: d.recurrences.map((r) => (r.projectId === id ? { ...r, projectId: null } : r)),
        })),

      linkTaskToProject: (taskId, projectId) =>
        commit((d) => {
          const task = d.tasks.find((t) => t.id === taskId);
          if (!task || task.projectId === projectId) return d;
          const linked = {
            ...task,
            projectId,
            milestoneId: null,
            projectSortOrder: projectId ? nextProjectSortOrder(d.tasks, projectId) : 0,
            updatedAt: nowISO(),
          };
          return { ...d, tasks: d.tasks.map((t) => (t.id === taskId ? linked : t)) };
        }),

      reorderProjectTasks: (projectId, orderedTaskIds) =>
        commit((d) => {
          const position = new Map(orderedTaskIds.map((id, i) => [id, (i + 1) * 1000]));
          let changed = false;
          const tasks = d.tasks.map((t) => {
            const next = position.get(t.id);
            if (t.projectId !== projectId || next === undefined || next === t.projectSortOrder) return t;
            changed = true;
            return { ...t, projectSortOrder: next };
          });
          return changed ? { ...d, tasks } : d;
        }),

      createMilestone: (projectId, input) => {
        const current = dataRef.current;
        if (!current || !input.title.trim() || !current.projects.some((p) => p.id === projectId)) return null;
        const order = current.milestones.filter((m) => m.projectId === projectId).reduce((max, m) => Math.max(max, m.sortOrder), 0) + 1000;
        const milestone = createMilestone(projectId, input, order, nowISO());
        commit((d) => ({ ...d, milestones: [...d.milestones, milestone] }));
        return milestone;
      },

      updateMilestone: (id, changes) =>
        commit((d) => ({
          ...d,
          milestones: d.milestones.map((m) =>
            m.id === id
              ? {
                  ...m,
                  ...changes,
                  title: changes.title?.trim() || m.title,
                  description: changes.description !== undefined ? changes.description.trim() : m.description,
                  updatedAt: nowISO(),
                  completedAt:
                    changes.status === undefined
                      ? m.completedAt
                      : changes.status === "completed"
                        ? (m.completedAt ?? nowISO())
                        : null,
                }
              : m,
          ),
        })),

      deleteMilestone: (id) =>
        commit((d) => ({
          ...d,
          milestones: d.milestones.filter((m) => m.id !== id),
          tasks: d.tasks.map((t) => (t.milestoneId === id ? { ...t, milestoneId: null } : t)),
        })),

      reorderMilestones: (projectId, orderedIds) =>
        commit((d) => {
          const position = new Map(orderedIds.map((id, i) => [id, (i + 1) * 1000]));
          return {
            ...d,
            milestones: d.milestones.map((m) =>
              m.projectId === projectId && position.has(m.id) ? { ...m, sortOrder: position.get(m.id)! } : m,
            ),
          };
        }),

      createRecurrence: (input) => {
        if (!input.title.trim() || !today) return null;
        const template = createTemplate(input, nowISO());
        // Generate straight away so the first occurrence appears immediately.
        commit((d) => generateOccurrences({ ...d, recurrences: [...d.recurrences, template] }, today, nowISO()));
        return template;
      },

      updateRecurrence: (id, changes) =>
        commit((d) => {
          const template = d.recurrences.find((r) => r.id === id);
          if (!template || !today) return d;
          const now = nowISO();
          const merged = { ...template, ...changes, title: changes.title?.trim() || template.title };
          const rule = normalizeRule(merged);
          const updated: RecurrenceTemplate = {
            ...merged,
            ...rule,
            description: merged.description.trim(),
            updatedAt: now,
          };
          const ruleKeys = ["frequency", "interval", "intervalUnit", "selectedWeekdays", "startDate", "endDate"] as const;
          const scheduleChanged = ruleKeys.some((k) => JSON.stringify(template[k]) !== JSON.stringify(updated[k]));
          const isFutureOpen = (t: Task) =>
            t.recurrenceTemplateId === id && t.occurrenceDate !== null && t.occurrenceDate >= today && t.status !== "completed";

          if (scheduleChanged) {
            // Drop upcoming unfinished occurrences and regenerate on the new schedule.
            const yesterday = addDays(today, -1);
            const restart = updated.startDate > yesterday ? addDays(updated.startDate, -1) : yesterday;
            const next = {
              ...d,
              tasks: d.tasks.filter((t) => !isFutureOpen(t)),
              recurrences: d.recurrences.map((r) => (r.id === id ? { ...updated, generatedThrough: restart } : r)),
            };
            return generateOccurrences(next, today, now);
          }
          const fields = templateTaskFields(updated);
          return {
            ...d,
            recurrences: d.recurrences.map((r) => (r.id === id ? updated : r)),
            tasks: d.tasks.map((t) =>
              isFutureOpen(t)
                ? {
                    ...t,
                    ...fields,
                    sprint: fields.sprint,
                    milestoneId: fields.projectId === t.projectId ? t.milestoneId : null,
                    updatedAt: now,
                  }
                : t,
            ),
          };
        }),

      setRecurrenceStatus: (id, status, options) =>
        commit((d) => {
          const template = d.recurrences.find((r) => r.id === id);
          if (!template || !today) return d;
          const now = nowISO();
          const yesterday = addDays(today, -1);
          const updated: RecurrenceTemplate = { ...template, status, updatedAt: now };
          if (status === "active") {
            // Resuming doesn't back-fill the paused stretch.
            updated.generatedThrough =
              template.generatedThrough && template.generatedThrough > yesterday ? template.generatedThrough : yesterday;
          }
          if (status === "ended" && (!template.endDate || template.endDate > today)) updated.endDate = today;
          const tasks = options?.removeFuture
            ? d.tasks.filter(
                (t) =>
                  !(t.recurrenceTemplateId === id && t.occurrenceDate !== null && t.occurrenceDate >= today && t.status !== "completed"),
              )
            : d.tasks;
          const next = { ...d, tasks, recurrences: d.recurrences.map((r) => (r.id === id ? updated : r)) };
          return status === "active" ? generateOccurrences(next, today, now) : next;
        }),

      deleteRecurrence: (id, options) =>
        commit((d) => {
          if (!today) return d;
          const tasks = d.tasks
            .filter(
              (t) =>
                !(
                  options?.removeFuture &&
                  t.recurrenceTemplateId === id &&
                  t.occurrenceDate !== null &&
                  t.occurrenceDate >= today &&
                  t.status !== "completed"
                ),
            )
            // Everything kept becomes an ordinary task (its date is preserved).
            .map((t) => (t.recurrenceTemplateId === id ? { ...t, recurrenceTemplateId: null } : t));
          return { ...d, tasks, recurrences: d.recurrences.filter((r) => r.id !== id) };
        }),

      syncRecurrences: () => {
        if (today) commit((d) => generateOccurrences(d, today, nowISO()));
      },

      updateWeeklyReview: (weekStart, changes) =>
        commit((d) => {
          const now = nowISO();
          const existing = d.weeklyReviews.find((r) => r.weekStartDate === weekStart);
          const base = existing ?? createWeeklyReview(weekStart, now);
          const updated: WeeklyReview = { ...base, ...changes, updatedAt: now };
          return {
            ...d,
            weeklyReviews: existing ? d.weeklyReviews.map((r) => (r.id === existing.id ? updated : r)) : [...d.weeklyReviews, updated],
          };
        }),

      setWeeklyReviewStatus: (weekStart, status) =>
        commit((d) => {
          const now = nowISO();
          const existing = d.weeklyReviews.find((r) => r.weekStartDate === weekStart);
          const base = existing ?? createWeeklyReview(weekStart, now);
          const updated: WeeklyReview = { ...base, status, completedAt: status === "completed" ? now : null, updatedAt: now };
          return {
            ...d,
            weeklyReviews: existing ? d.weeklyReviews.map((r) => (r.id === existing.id ? updated : r)) : [...d.weeklyReviews, updated],
          };
        }),

      setWeeklyPriorities: (weekStart, items) =>
        commit((d) => {
          const now = nowISO();
          let reviews = d.weeklyReviews;
          let review = reviews.find((r) => r.weekStartDate === weekStart);
          if (!review) {
            review = createWeeklyReview(weekStart, now);
            reviews = [...reviews, review];
          } else {
            reviews = reviews.map((r) => (r.id === review!.id ? { ...r, updatedAt: now } : r));
          }
          const id = review.id;
          const priorities: WeeklyPriority[] = items
            .filter((i) => i.title.trim())
            .slice(0, MAX_PRIORITIES)
            .map((i, index) => ({
              id: createId(),
              weeklyReviewId: id,
              taskId: i.taskId,
              projectId: i.projectId,
              title: i.title.trim(),
              sortOrder: index,
              createdAt: now,
            }));
          return { ...d, weeklyReviews: reviews, weeklyPriorities: [...d.weeklyPriorities.filter((p) => p.weeklyReviewId !== id), ...priorities] };
        }),

      allocateSessionTime: (sessionId, allocations) => {
        const current = dataRef.current;
        const session = current?.sessions.find((s) => s.id === sessionId);
        if (!current || !session || session.status !== "ended") return false;
        const clean = allocations
          .map((a) => ({ taskId: a.taskId, minutes: Math.max(0, Math.round(a.minutes)) }))
          .filter((a) => a.minutes > 0 && current.tasks.some((t) => t.id === a.taskId));
        const total = clean.reduce((s, a) => s + a.minutes, 0);
        // Never give away more time than the session actually ran.
        if (total > Math.round(session.accumulatedElapsedSeconds / 60)) return false;
        const before = new Map(session.allocations.map((a) => [a.taskId, a.minutes]));
        const after = new Map(clean.map((a) => [a.taskId, a.minutes]));
        const touched = new Set([...before.keys(), ...after.keys()]);
        commit((d) => {
          const now = nowISO();
          return {
            ...d,
            sessions: d.sessions.map((s) => (s.id === sessionId ? { ...s, allocations: clean } : s)),
            tasks: d.tasks.map((t) => {
              if (!touched.has(t.id)) return t;
              const delta = (after.get(t.id) ?? 0) - (before.get(t.id) ?? 0);
              if (!delta) return t;
              const next = (t.actualMinutes ?? 0) + delta;
              return { ...t, actualMinutes: next > 0 ? next : null, updatedAt: now };
            }),
          };
        });
        return true;
      },

      loadSampleData: () => {
        if (!today) return;
        commit(() => generateOccurrences(createSampleData(today), today, nowISO()));
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

  // Recurring tasks: no background scheduler, so occurrences are generated
  // whenever the app opens or the day changes. Idempotent — it only saves
  // when something new is due.
  React.useEffect(() => {
    if (!today || !data || !data.recurrences.some((r) => r.status === "active")) return;
    if (generateOccurrences(data, today, nowISO()) !== data) actions.syncRecurrences();
  }, [today, data, actions]);

  const value = React.useMemo<WorkspaceContextValue | null>(() => {
    if (!today || !data) return null;
    return {
      workspace: { ...data, today },
      actions,
      storage,
    };
  }, [today, data, actions, storage]);

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
