/**
 * Domain model for Belle's Life System.
 *
 * These shapes are intentionally flat and relational (ids, not nested objects)
 * so each one maps cleanly onto a Supabase table in Phase 2.
 */

/** Calendar date in the user's local time zone, formatted YYYY-MM-DD. */
export type ISODate = string;

export type SprintId = "urgent" | "deadlines" | "admin" | "build";

export interface Sprint {
  id: SprintId;
  number: 1 | 2 | 3 | 4;
  name: string;
  description: string;
  /** When this kind of work tends to fit best — a hint, never a rule. */
  energyHint: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  sprintId: SprintId;
  projectId: string | null;
  status: TaskStatus;
  /** The day Belle intends to work on it. */
  plannedDate: ISODate | null;
  /** A real external deadline, if there is one. */
  dueDate: ISODate | null;
  estimateMinutes: number | null;
  actualMinutes: number | null;
  completedDate: ISODate | null;
}

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

export type CaptureKind = "task" | "idea" | "reminder" | "note";

export interface CaptureItem {
  id: string;
  text: string;
  kind: CaptureKind;
  capturedDate: ISODate;
  processed: boolean;
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

export interface Workspace {
  today: ISODate;
  highlightTaskId: string | null;
  tasks: Task[];
  projects: Project[];
  commitments: MicroCommitment[];
  captures: CaptureItem[];
  events: CalendarEvent[];
  kaizenEntries: KaizenEntry[];
  weeklyReview: WeeklyReview;
}
