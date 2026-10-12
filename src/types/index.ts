/**
 * Domain model for Belle's Life System.
 *
 * These shapes are intentionally flat and relational (ids, not nested objects)
 * so each one maps cleanly onto a Supabase table in a later phase.
 */

/** Calendar date in the user's local time zone, formatted YYYY-MM-DD. */
export type ISODate = string;

/** Full timestamp, `Date.prototype.toISOString()` format (UTC). */
export type ISODateTime = string;

export type SprintId = "urgent" | "deadlines" | "admin" | "build";

export interface Sprint {
  id: SprintId;
  number: 1 | 2 | 3 | 4;
  name: string;
  description: string;
  /** When this kind of work tends to fit best — a hint, never a rule. */
  energyHint: string;
}

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

/** Stable internal identifiers — display labels live in `lib/tasks`. */
export type TaskStatus = "todo" | "in_progress" | "completed" | "skipped";

export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority | null;
  sprint: SprintId | null;
  projectId: string | null;
  dueDate: ISODate | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  completedAt: ISODateTime | null;
  /** The Brain Dump entry this task was converted from, if any. */
  sourceCaptureId: string | null;
  /** When the original thought was captured (preserved on conversion). */
  capturedAt: ISODateTime | null;
  /**
   * Manual position on the Sprints board (lower = higher up). Only compared
   * between tasks in the same sprint; gaps are fine.
   */
  sortOrder: number;
}

/** The fields a person can set from the task editor. */
export type TaskInput = Pick<Task, "title"> &
  Partial<
    Pick<
      Task,
      | "description"
      | "status"
      | "priority"
      | "sprint"
      | "projectId"
      | "dueDate"
      | "estimatedMinutes"
      | "actualMinutes"
    >
  >;

/* ------------------------------------------------------------------ */
/* Brain Dump                                                          */
/* ------------------------------------------------------------------ */

export type CaptureKind = "task" | "idea" | "reminder" | "note";

/** `inbox` until it is converted into a task (or deleted). */
export type CaptureStatus = "inbox" | "converted";

export interface Capture {
  id: string;
  title: string;
  note: string;
  kind: CaptureKind;
  status: CaptureStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  convertedTaskId: string | null;
}

export type CaptureInput = Pick<Capture, "title"> & Partial<Pick<Capture, "note" | "kind">>;

/* ------------------------------------------------------------------ */
/* Sprint sessions                                                     */
/* ------------------------------------------------------------------ */

export type EnergyLevel = "low" | "moderate" | "high";

/** `ready` = planned but timer not started yet. Only one non-ended session at a time. */
export type SessionStatus = "ready" | "running" | "paused" | "ended";

/**
 * A focused work session. References tasks by id — never copies them —
 * so the task list stays the single source of truth.
 */
export interface SprintSession {
  id: string;
  sprintId: SprintId;
  taskIds: string[];
  plannedMinutes: number;
  energyLevel: EnergyLevel | null;
  status: SessionStatus;
  createdAt: ISODateTime;
  startedAt: ISODateTime | null;
  endedAt: ISODateTime | null;
  /** Seconds banked from earlier running stretches (before the last pause). */
  accumulatedElapsedSeconds: number;
  /** When the current running stretch began; null unless running. */
  lastResumedAt: ISODateTime | null;
  /** Snapshot at the end of the session, so history stays accurate later. */
  completedTaskIds: string[];
}

/** Everything that is saved between visits. */
export interface PersistedData {
  tasks: Task[];
  captures: Capture[];
  sessions: SprintSession[];
}

/* ------------------------------------------------------------------ */
/* Preview content (not yet persisted — later phases)                  */
/* ------------------------------------------------------------------ */

export type LifeArea = "Business" | "Coaching" | "Tennis Ladder" | "Personal";

export interface Project {
  id: string;
  name: string;
  description: string;
  area: LifeArea;
  status: "active" | "paused" | "complete";
  targetDate: ISODate | null;
}

export interface MicroCommitment {
  id: string;
  title: string;
  description?: string;
  /** The moment in the day that prompts this habit. */
  cue?: string;
  completedDates: ISODate[];
}

export type EventKind = "coaching" | "ladder" | "business" | "personal";

export interface CalendarEvent {
  id: string;
  title: string;
  date: ISODate;
  /** 24h "HH:MM" */
  start: string;
  end: string;
  kind: EventKind;
}

export interface KaizenEntry {
  id: string;
  date: ISODate;
  highlight: string;
  highlightDone: boolean;
  brainDump: string[];
  commitments: { title: string; done: boolean }[];
  reflection: {
    wentWell: string;
    improve: string;
    oneSmallStep: string;
  };
  energy: 1 | 2 | 3 | 4 | 5;
}

export interface WeeklyReview {
  id: string;
  weekStart: ISODate;
  wins: string[];
  challenges: string[];
  lessons: string;
  nextWeekPriorities: string[];
}

/** Sample content shown on pages whose real functionality arrives later. */
export interface PreviewContent {
  projects: Project[];
  commitments: MicroCommitment[];
  events: CalendarEvent[];
  kaizenEntries: KaizenEntry[];
  weeklyReview: WeeklyReview;
  /** Static stand-in for the Daily Highlight (Phase 4). */
  highlightPreview: {
    title: string;
    sprint: SprintId;
    projectId: string;
    estimatedMinutes: number;
  };
}

/** What components read: saved data + preview content + today's date. */
export interface Workspace extends PersistedData, PreviewContent {
  today: ISODate;
}
