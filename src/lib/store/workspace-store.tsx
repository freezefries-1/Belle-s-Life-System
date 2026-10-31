"use client";

import * as React from "react";
import { toast } from "sonner";

import { createSampleData } from "@/data/sample-data";
import { createCapture } from "@/lib/brain-dump/capture-model";
import { createCommitment } from "@/lib/daily/commitments";
import { createLesson, createStudent } from "@/lib/students/student-model";
import { formatShortDate } from "@/lib/date";
import { nowISO } from "@/lib/id";
import { createProject } from "@/lib/projects/project-model";
import { createTemplate, generateOccurrences } from "@/lib/recurrence/recurrence";
import { createSession, isOpenSession, type NewSession } from "@/lib/sessions/session-model";
import { EMPTY_DATA } from "@/lib/storage/schema";
import { localStorageRepository, type LoadStatus, type WorkspaceRepository } from "@/lib/storage/workspace-repository";
import type { OrderUpdate } from "@/lib/tasks/sprint-board";
import { useToday } from "@/lib/use-today";
import { hasAnyData } from "@/lib/workspace-data";

import * as daily from "./changes/daily";
import * as projects from "./changes/projects";
import * as recurrence from "./changes/recurrence";
import * as reviews from "./changes/reviews";
import * as ladder from "./changes/ladder";
import * as students from "./changes/students";
import * as tasks from "./changes/tasks";
import type {
  Capture,
  CaptureInput,
  CommitmentInput,
  CommitmentStatus,
  DailyHighlight,
  ISODate,
  KaizenLogInput,
  LadderStage,
  LadderStageInput,
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
  Student,
  StudentInput,
  StudentLesson,
  StudentLessonInput,
  StudentStage,
  Task,
  TaskInput,
  TaskStatus,
  TrackId,
  WeeklyPriority,
  WeeklyReviewInput,
  WeeklyReviewStatus,
  Workspace,
} from "@/types";

/**
 * The single source of truth for everything saved. Components read through
 * `useWorkspace()` and change data only through `actions` (or
 * `useWorkspaceActions()` when they don't need to read anything, so they
 * don't redraw on every change). The rules for each change live in
 * ./changes as plain functions; this file applies them and writes the result
 * through the repository: this browser's storage, or the cloud account.
 */

export interface WorkspaceActions {
  // Brain Dump
  addCapture: (input: CaptureInput) => Capture | null;
  updateCapture: (id: string, changes: Partial<CaptureInput>) => void;
  deleteCapture: (id: string) => Capture | null;
  restoreCapture: (capture: Capture) => void;
  /** Returns the new task, or null if the entry was already converted. */
  convertCapture: (id: string, input: TaskInput) => Task | null;
  /** Keep an inbox entry as a note (out of the inbox), or move a kept note back to the inbox. */
  setCaptureKept: (id: string, kept: boolean) => void;
  /** Append an entry to a project's notes and remove it from the Brain Dump. Returns what's needed to undo it. */
  fileCaptureToProject: (id: string, projectId: string) => tasks.FiledCapture | null;
  undoFileCapture: (filed: tasks.FiledCapture) => void;

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

  // Students (tennis coaching)
  createStudent: (input: StudentInput) => Student | null;
  updateStudent: (id: string, changes: Partial<StudentInput>) => void;
  /** Deletes the student with their stages and lesson notes. Returns them, for Undo. */
  deleteStudent: (id: string) => students.RemovedStudent | null;
  restoreStudent: (removed: students.RemovedStudent) => void;
  /**
   * Record that a student reached a stage on a track (one entry per stage; repeating it updates the date).
   * Returns the entry, and whether it's new (so Undo can remove it).
   */
  setStudentStage: (studentId: string, track: TrackId, stage: string, reachedOn: ISODate, note?: string) => { entry: StudentStage; created: boolean } | null;
  removeStudentStage: (id: string) => StudentStage | null;
  restoreStudentStage: (stage: StudentStage) => void;
  addLesson: (studentId: string, input: StudentLessonInput) => StudentLesson | null;
  updateLesson: (id: string, changes: Partial<StudentLessonInput>) => void;
  deleteLesson: (id: string) => StudentLesson | null;
  restoreLesson: (lesson: StudentLesson) => void;
  /** Tick a milestone for a student on a date, or untick it (null). */
  setStudentCheck: (studentId: string, track: TrackId, stage: string, checkId: string, done: ISODate | null) => void;

  // Coaching ladder
  /** Save your wording for a stage: name, focus and milestones. */
  saveLadderStage: (track: TrackId, stage: string, input: LadderStageInput) => void;
  /** Add a stage at the end of a track; returns its id (e.g. R10). */
  addLadderStage: (track: TrackId, input: LadderStageInput) => string | null;
  /** Reset a built-in stage to its original wording, or delete a stage you added (if no student has reached it). Returns it, for Undo. */
  removeLadderStage: (track: TrackId, stage: string) => LadderStage | null;
  restoreLadderStage: (entry: LadderStage) => void;

  /** Fill an empty workspace with sample data. Refuses to replace existing data unless `replace` is set (browser-only mode, after confirmation). */
  loadSampleData: (options?: { replace?: boolean }) => void;
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
/** Actions never change identity for a given day, so components using only these don't redraw on every edit. */
const WorkspaceActionsContext = React.createContext<{ actions: WorkspaceActions } | null>(null);

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
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = React.useState(0);
  const dataRef = React.useRef<PersistedData | null>(null);
  const saveErrorShown = React.useRef(false);

  // Load once, in the browser only (avoids hydration mismatches).
  React.useEffect(() => {
    let cancelled = false;
    repository
      .load()
      .then((result) => {
        if (cancelled) return;
        dataRef.current = result.data;
        setData(result.data);
        setStorage({ status: result.status, isFirstRun: result.isFirstRun });
        if (result.message) toast(result.message, { duration: 8000 });
      })
      .catch((error: unknown) => {
        // Never fall back to an empty workspace: that could look like data loss.
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Your data couldn’t be loaded.");
      });
    const unsubscribe = repository.subscribe((external) => {
      dataRef.current = external;
      setData(external);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [repository, loadAttempt]);

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
      repository.save(next, current).then((result) => {
        if (!result.ok && !saveErrorShown.current) {
          saveErrorShown.current = true;
          toast.error(result.message);
        }
      });
    };

    /** The current data, or null before it has loaded. */
    const current = () => dataRef.current;

    return {
      addCapture: (input) => {
        if (!input.title.trim()) return null;
        const capture = createCapture(input, nowISO());
        commit((d) => tasks.addCapture(d, capture));
        return capture;
      },
      updateCapture: (id, changes) => commit((d) => tasks.updateCapture(d, id, changes, nowISO())),
      deleteCapture: (id) => {
        const capture = current()?.captures.find((c) => c.id === id) ?? null;
        if (capture) commit((d) => tasks.deleteCapture(d, id));
        return capture;
      },
      restoreCapture: (capture) => commit((d) => tasks.restoreCapture(d, capture)),
      convertCapture: (id, input) => {
        const data = current();
        const result = data && tasks.convertCapture(data, id, input, nowISO());
        if (!result) return null;
        commit(() => result.data);
        return result.task;
      },
      setCaptureKept: (id, kept) => commit((d) => tasks.setCaptureKept(d, id, kept, nowISO())),
      fileCaptureToProject: (id, projectId) => {
        const data = current();
        if (!data || !today) return null;
        const result = tasks.fileCaptureToProject(data, id, projectId, `${formatShortDate(today)} ${today.slice(0, 4)}`, nowISO());
        if (result) commit(() => result.data);
        return result;
      },
      undoFileCapture: (filed) => commit((d) => tasks.unfileCapture(d, filed, nowISO())),

      createTask: (input) => {
        const data = current();
        if (!input.title.trim() || !data) return null;
        const task = tasks.newTask(data, input, nowISO());
        commit((d) => tasks.addTask(d, task));
        return task;
      },
      updateTask: (id, changes) => commit((d) => tasks.updateTask(d, id, changes, nowISO())),
      setTaskStatus: (id, status) => commit((d) => tasks.setTaskStatus(d, id, status, nowISO())),
      toggleTaskComplete: (id) => {
        commit((d) => tasks.toggleTaskComplete(d, id, nowISO()));
        return current()?.tasks.find((t) => t.id === id) ?? null;
      },
      deleteTask: (id) => {
        const task = current()?.tasks.find((t) => t.id === id) ?? null;
        if (task) commit((d) => tasks.deleteTask(d, id));
        return task;
      },
      restoreTask: (task) => commit((d) => tasks.restoreTask(d, task)),
      moveTaskToSprint: (id, sprint) => commit((d) => tasks.moveTaskToSprint(d, id, sprint, nowISO())),
      applyBoardOrder: (updates) => commit((d) => tasks.applyBoardOrder(d, updates, nowISO())),

      createSession: (input) => {
        const data = current();
        if (!data || data.sessions.some(isOpenSession)) return null;
        const session = createSession(input, nowISO());
        commit((d) => daily.addSession(d, session));
        return session;
      },
      startSession: (id) => commit((d) => daily.startSession(d, id, nowISO())),
      pauseSession: (id) => commit((d) => daily.pauseSessionById(d, id, nowISO())),
      endSession: (id) => {
        commit((d) => daily.endSessionById(d, id, nowISO()));
        return current()?.sessions.find((x) => x.id === id) ?? null;
      },

      setHighlight: (taskId) => {
        const data = current();
        const result = data && today ? daily.setHighlight(data, taskId, today, nowISO()) : null;
        if (!result) return null;
        commit(() => result.data);
        return result.highlight;
      },
      createHighlightTask: (input) => {
        const data = current();
        if (!data || !today || !input.title.trim()) return null;
        const result = daily.createHighlightTask(data, input, today, nowISO());
        commit(() => result.data);
        return result.task;
      },
      removeHighlight: () => {
        if (today) commit((d) => daily.removeHighlight(d, today));
      },

      createCommitment: (input) => {
        if (!today || !input.title.trim()) return null;
        const commitment = createCommitment(input, today, nowISO());
        commit((d) => daily.addCommitment(d, commitment));
        return commitment;
      },
      updateCommitment: (id, changes) => commit((d) => daily.updateCommitment(d, id, changes, nowISO())),
      setCommitmentStatus: (id, status) => {
        if (today) commit((d) => daily.setCommitmentStatus(d, id, status, today, nowISO()));
      },
      deleteCommitment: (id) => commit((d) => daily.deleteCommitment(d, id)),
      toggleCommitmentDone: (id, date) => {
        const data = current();
        if (!data || (today && date > today)) return false;
        const result = daily.toggleCommitmentDone(data, id, date, nowISO());
        commit(() => result.data);
        return result.done;
      },

      ensureLog: (date) => commit((d) => daily.ensureLog(d, date, nowISO())),
      updateLog: (date, changes) => {
        if (today && date > today) return;
        commit((d) => daily.updateLog(d, date, changes, nowISO()));
      },

      createProject: (input) => {
        if (!input.name.trim()) return null;
        const project = createProject(input, nowISO());
        commit((d) => projects.addProject(d, project));
        return project;
      },
      updateProject: (id, changes) => commit((d) => projects.updateProject(d, id, changes, nowISO())),
      setProjectStatus: (id, status) => commit((d) => projects.setProjectStatus(d, id, status, nowISO())),
      deleteProject: (id) => commit((d) => projects.deleteProject(d, id, nowISO())),
      linkTaskToProject: (taskId, projectId) => commit((d) => projects.linkTaskToProject(d, taskId, projectId, nowISO())),
      reorderProjectTasks: (projectId, orderedTaskIds) => commit((d) => projects.reorderProjectTasks(d, projectId, orderedTaskIds)),

      createMilestone: (projectId, input) => {
        const data = current();
        const milestone = data ? projects.newMilestone(data, projectId, input, nowISO()) : null;
        if (milestone) commit((d) => projects.addMilestone(d, milestone));
        return milestone;
      },
      updateMilestone: (id, changes) => commit((d) => projects.updateMilestone(d, id, changes, nowISO())),
      deleteMilestone: (id) => commit((d) => projects.deleteMilestone(d, id)),
      reorderMilestones: (projectId, orderedIds) => commit((d) => projects.reorderMilestones(d, projectId, orderedIds)),

      createRecurrence: (input) => {
        if (!input.title.trim() || !today) return null;
        const template = createTemplate(input, nowISO(), today);
        commit((d) => recurrence.addRecurrence(d, template, today, nowISO()));
        return template;
      },
      updateRecurrence: (id, changes) => {
        if (today) commit((d) => recurrence.updateRecurrence(d, id, changes, today, nowISO()));
      },
      setRecurrenceStatus: (id, status, options) => {
        if (today) commit((d) => recurrence.setRecurrenceStatus(d, id, status, options, today, nowISO()));
      },
      deleteRecurrence: (id, options) => {
        if (today) commit((d) => recurrence.deleteRecurrence(d, id, options, today));
      },
      syncRecurrences: () => {
        if (today) commit((d) => generateOccurrences(d, today, nowISO()));
      },

      updateWeeklyReview: (weekStart, changes) => commit((d) => reviews.updateWeeklyReview(d, weekStart, changes, nowISO())),
      setWeeklyReviewStatus: (weekStart, status) => commit((d) => reviews.setWeeklyReviewStatus(d, weekStart, status, nowISO())),
      setWeeklyPriorities: (weekStart, items) => commit((d) => reviews.setWeeklyPriorities(d, weekStart, items, nowISO())),

      allocateSessionTime: (sessionId, allocations) => {
        const data = current();
        const next = data && reviews.allocateSessionTime(data, sessionId, allocations, nowISO());
        if (!next) return false;
        commit(() => next);
        return true;
      },

      loadSampleData: (options) => {
        if (!today) return;
        if (dataRef.current && hasAnyData(dataRef.current) && !options?.replace) return;
        commit(() => generateOccurrences(createSampleData(today), today, nowISO()));
      },

      createStudent: (input) => {
        if (!input.name.trim() || !current()) return null;
        const student = createStudent(input, nowISO());
        commit((d) => students.addStudent(d, student));
        return student;
      },
      updateStudent: (id, changes) => commit((d) => students.updateStudent(d, id, changes, nowISO())),
      deleteStudent: (id) => {
        const data = current();
        const result = data && students.deleteStudent(data, id);
        if (!result) return null;
        commit((d) => students.deleteStudent(d, id)?.data ?? d);
        return result.removed;
      },
      restoreStudent: (removed) => commit((d) => students.restoreStudent(d, removed)),
      setStudentStage: (studentId, track, stage, reachedOn, note = "") => {
        const data = current();
        if (!data) return null;
        const existed = data.studentStages.some((s) => s.studentId === studentId && s.track === track && s.stage === stage);
        const next = students.setStage(data, studentId, track, stage, reachedOn, note, nowISO());
        if (next === data) return null;
        commit(() => next);
        const entry = next.studentStages.find((s) => s.studentId === studentId && s.track === track && s.stage === stage)!;
        return { entry, created: !existed };
      },
      removeStudentStage: (id) => {
        const stage = current()?.studentStages.find((s) => s.id === id) ?? null;
        if (stage) commit((d) => students.removeStage(d, id));
        return stage;
      },
      restoreStudentStage: (stage) => commit((d) => students.restoreStage(d, stage)),
      addLesson: (studentId, input) => {
        const data = current();
        if (!data?.students.some((s) => s.id === studentId)) return null;
        const lesson = createLesson(studentId, input, nowISO());
        commit((d) => students.addLesson(d, lesson));
        return lesson;
      },
      updateLesson: (id, changes) => commit((d) => students.updateLesson(d, id, changes, nowISO())),
      deleteLesson: (id) => {
        const lesson = current()?.studentLessons.find((l) => l.id === id) ?? null;
        if (lesson) commit((d) => students.deleteLesson(d, id));
        return lesson;
      },
      restoreLesson: (lesson) => commit((d) => students.restoreLesson(d, lesson)),
      setStudentCheck: (studentId, track, stage, checkId, done) =>
        commit((d) => students.setStudentCheck(d, studentId, track, stage, checkId, done, nowISO())),

      saveLadderStage: (track, stage, input) => commit((d) => ladder.saveLadderStage(d, track, stage, input, nowISO())),
      addLadderStage: (track, input) => {
        const data = current();
        const result = data && ladder.addLadderStage(data, track, input, nowISO());
        if (!result) return null;
        commit(() => result.data);
        return result.stage;
      },
      removeLadderStage: (track, stage) => {
        const data = current();
        const result = data && ladder.removeLadderStage(data, track, stage);
        if (!result) return null;
        commit(() => result.data);
        return result.removed;
      },
      restoreLadderStage: (entry) => commit((d) => ladder.restoreLadderStage(d, entry)),

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

  // Only changes when the day changes or data first arrives — not on every edit.
  const ready = !!today && data !== null;
  const actionsValue = React.useMemo(() => (ready ? { actions } : null), [ready, actions]);

  const loadState = React.useMemo(
    () => ({
      error: loadError,
      retry: () => {
        setLoadError(null);
        setLoadAttempt((n) => n + 1);
      },
    }),
    [loadError],
  );

  return (
    <WorkspaceLoadContext.Provider value={loadState}>
      <WorkspaceActionsContext.Provider value={actionsValue}>
        <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
      </WorkspaceActionsContext.Provider>
    </WorkspaceLoadContext.Provider>
  );
}

const WorkspaceLoadContext = React.createContext<{ error: string | null; retry: () => void } | null>(null);

/** Load failures (e.g. offline at sign-in), with a way to try again. */
export function useWorkspaceLoadState() {
  return React.useContext(WorkspaceLoadContext);
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

/** Just the actions, for components that change data without reading it. */
export function useWorkspaceActions() {
  const ctx = React.useContext(WorkspaceActionsContext);
  if (!ctx) throw new Error("useWorkspaceActions must be used inside <WorkspaceReady>");
  return ctx.actions;
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
