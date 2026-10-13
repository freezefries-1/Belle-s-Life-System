/**
 * Domain model for Belle's Life System.
 *
 * These shapes are intentionally flat and relational (ids, not nested objects)
 * so each one maps cleanly onto a Supabase table (see ./database.ts and the mappers).
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
  /** Manual position inside its project's task list (separate from the sprint order). */
  projectSortOrder: number;
  /** Optional milestone within the task's project. */
  milestoneId: string | null;
  /** Set on tasks generated from a recurring template. */
  recurrenceTemplateId: string | null;
  /** The scheduled date this occurrence was generated for (YYYY-MM-DD). */
  occurrenceDate: ISODate | null;
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
      | "milestoneId"
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
  /**
   * Session minutes the user chose to give to individual tasks (added to each
   * task's `actualMinutes`). Never more than the session's elapsed time, so
   * the same minutes can't be counted twice.
   */
  allocations: SessionAllocation[];
}

export interface SessionAllocation {
  taskId: string;
  minutes: number;
}

/* ------------------------------------------------------------------ */
/* Daily: highlight, micro-commitments, Kaizen Log                     */
/* ------------------------------------------------------------------ */

/**
 * The one priority for a calendar day. Points at an existing task (never a
 * copy); `titleSnapshot` keeps history readable if that task is deleted.
 * Completion is always read from the task itself.
 */
export interface DailyHighlight {
  id: string;
  /** Local calendar date, YYYY-MM-DD. Unique — one highlight per day. */
  dateKey: ISODate;
  taskId: string;
  titleSnapshot: string;
  selectedAt: ISODateTime;
  updatedAt: ISODateTime;
}

/**
 * - `daily`: every day.
 * - `weekdays`: only on `selectedWeekdays`.
 * - `weekly`: once per week (Mon–Sun), on whichever day suits.
 */
export type CommitmentFrequency = "daily" | "weekdays" | "weekly";
export type CommitmentStatus = "active" | "paused" | "archived";

export interface MicroCommitment {
  id: string;
  title: string;
  description: string;
  targetMinutes: number | null;
  frequency: CommitmentFrequency;
  /** 0 = Sunday … 6 = Saturday. Used when frequency is `weekdays`. */
  selectedWeekdays: number[];
  startDate: ISODate;
  status: CommitmentStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  archivedAt: ISODateTime | null;
  /**
   * When the commitment was paused (local dates). `from` is the first paused
   * day; `to` is the day it resumed (scheduled again), or null while paused.
   */
  pausedPeriods: PausedPeriod[];
}

export interface PausedPeriod {
  from: ISODate;
  to: ISODate | null;
}

export type CommitmentInput = Pick<MicroCommitment, "title"> &
  Partial<Pick<MicroCommitment, "description" | "targetMinutes" | "frequency" | "selectedWeekdays" | "startDate">>;

/** One record per commitment per day it was done. Unique by (commitmentId, dateKey). */
export interface CommitmentCompletion {
  id: string;
  commitmentId: string;
  dateKey: ISODate;
  completedAt: ISODateTime;
}

/**
 * A day's journal. Only the words are stored here — the highlight,
 * commitments and completed tasks for that day are read from their own
 * records so nothing is duplicated.
 */
export interface KaizenLog {
  id: string;
  dateKey: ISODate;
  reflectionWentWell: string;
  reflectionImprove: string;
  reflectionLearned: string;
  notes: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type KaizenLogInput = Partial<
  Pick<KaizenLog, "reflectionWentWell" | "reflectionImprove" | "reflectionLearned" | "notes">
>;

/* ------------------------------------------------------------------ */
/* Projects, milestones, recurring tasks                               */
/* ------------------------------------------------------------------ */

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "archived";
export type ProjectColour = "blue" | "teal" | "amber" | "violet" | "rose" | "slate";
export type ProjectIcon = "folder" | "briefcase" | "trophy" | "house" | "heart" | "sparkles" | "book" | "dumbbell";

/** A collection of tasks working towards one outcome. Tasks point at it via `projectId`. */
export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: TaskPriority | null;
  /** Free-text life area, e.g. "Coaching". */
  category: string;
  startDate: ISODate | null;
  targetDate: ISODate | null;
  /** When to start working towards the target date (a reminder, not a task). */
  preparationDate: ISODate | null;
  icon: ProjectIcon;
  colour: ProjectColour;
  notes: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  archivedAt: ISODateTime | null;
}

export type ProjectInput = Pick<Project, "name"> &
  Partial<
    Pick<
      Project,
      "description" | "status" | "priority" | "category" | "startDate" | "targetDate" | "preparationDate" | "icon" | "colour" | "notes"
    >
  >;

export type MilestoneStatus = "upcoming" | "in_progress" | "completed";

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  targetDate: ISODate | null;
  preparationDate: ISODate | null;
  status: MilestoneStatus;
  sortOrder: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  /** Set when marked completed, cleared when reopened. */
  completedAt: ISODateTime | null;
}

export type MilestoneInput = Pick<Milestone, "title"> &
  Partial<Pick<Milestone, "description" | "targetDate" | "preparationDate" | "status">>;

/**
 * - daily: every day · weekdays: Mon–Fri
 * - weekly / biweekly: on `selectedWeekdays`, every 1 or 2 weeks
 * - monthly: same day of the month as the start date (clamped to month end)
 * - custom: every `interval` days or weeks (`intervalUnit`)
 */
export type RecurrenceFrequency = "daily" | "weekdays" | "weekly" | "biweekly" | "monthly" | "custom";
export type RecurrenceStatus = "active" | "paused" | "ended";

/** A rule that generates ordinary tasks ("occurrences"), one per scheduled date. */
export interface RecurrenceTemplate {
  id: string;
  title: string;
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
  intervalUnit: "days" | "weeks";
  /** 0 = Sunday … 6 = Saturday. Used by weekly, biweekly and custom-weeks. */
  selectedWeekdays: number[];
  startDate: ISODate;
  endDate: ISODate | null;
  sprintId: SprintId | null;
  projectId: string | null;
  priority: TaskPriority | null;
  estimatedMinutes: number | null;
  status: RecurrenceStatus;
  /** Every date up to here has been considered, so deleted occurrences never come back. */
  generatedThrough: ISODate | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type RecurrenceRule = Pick<
  RecurrenceTemplate,
  "frequency" | "interval" | "intervalUnit" | "selectedWeekdays" | "startDate" | "endDate"
>;

export type RecurrenceInput = Pick<RecurrenceTemplate, "title"> &
  RecurrenceRule &
  Partial<Pick<RecurrenceTemplate, "description" | "sprintId" | "projectId" | "priority" | "estimatedMinutes">>;

/* ------------------------------------------------------------------ */
/* Weekly reviews                                                      */
/* ------------------------------------------------------------------ */

/** "Not started" is simply the absence of a record for that week. */
export type WeeklyReviewStatus = "in_progress" | "completed";

/**
 * One per Monday–Sunday week. Only the user's words are stored — the week's
 * numbers are always calculated from tasks, sessions and commitments.
 */
export interface WeeklyReview {
  id: string;
  /** Monday, local date. Unique. */
  weekStartDate: ISODate;
  /** Sunday, local date. */
  weekEndDate: ISODate;
  status: WeeklyReviewStatus;
  wentWell: string;
  challenges: string;
  improvements: string;
  lessonsLearned: string;
  nextWeekFocus: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  completedAt: ISODateTime | null;
}

export type WeeklyReviewInput = Partial<
  Pick<WeeklyReview, "wentWell" | "challenges" | "improvements" | "lessonsLearned" | "nextWeekFocus">
>;

/** Up to three per review. Points at a task or project, or is free text; `title` keeps it readable if those are deleted. */
export interface WeeklyPriority {
  id: string;
  weeklyReviewId: string;
  taskId: string | null;
  projectId: string | null;
  title: string;
  sortOrder: number;
  createdAt: ISODateTime;
}

/** Everything that is saved between visits. */
export interface PersistedData {
  tasks: Task[];
  captures: Capture[];
  sessions: SprintSession[];
  highlights: DailyHighlight[];
  commitments: MicroCommitment[];
  commitmentCompletions: CommitmentCompletion[];
  kaizenLogs: KaizenLog[];
  projects: Project[];
  milestones: Milestone[];
  recurrences: RecurrenceTemplate[];
  weeklyReviews: WeeklyReview[];
  weeklyPriorities: WeeklyPriority[];
}

/** What components read: saved data + today's date. */
export interface Workspace extends PersistedData {
  today: ISODate;
}
