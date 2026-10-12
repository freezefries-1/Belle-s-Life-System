import type { Tables } from "./supabase";

/**
 * Row shapes of the Supabase tables, derived from the generated schema types
 * in ./supabase.ts (regenerate with supabase/local/gen-types.sh after a
 * migration), so they can't drift from the database. Columns are snake_case;
 * `user_id`, `version` and `synced_at` are managed by the database and never
 * sent by the app.
 */
export type ISODate = string;
export type Timestamp = string;

type ManagedColumn = "user_id" | "version" | "synced_at";
type Managed = { user_id?: string; version?: number; synced_at?: Timestamp };

/** A table's row as the app sees it; `Override` narrows columns the database stores loosely (jsonb). */
type AppRow<T extends keyof TableRows, Override = object> = Omit<Tables<T>, ManagedColumn | keyof Override> & Override & Managed;

export type PausedPeriod = { from: ISODate; to: ISODate | null };

export type ProjectRow = AppRow<"projects">;
export type MilestoneRow = AppRow<"project_milestones">;
export type RecurrenceRow = AppRow<"recurrence_templates">;
export type CaptureRow = AppRow<"brain_dump_entries">;
export type TaskRow = AppRow<"tasks">;
export type SessionRow = AppRow<"sprint_sessions">;
export type SessionTaskRow = AppRow<"sprint_session_tasks">;
export type HighlightRow = AppRow<"daily_highlights">;
export type CommitmentRow = AppRow<"micro_commitments", { paused_periods: PausedPeriod[] }>;
export type CompletionRow = AppRow<"micro_commitment_completions">;
export type KaizenLogRow = AppRow<"kaizen_logs">;
export type WeeklyReviewRow = AppRow<"weekly_reviews">;
export type WeeklyPriorityRow = AppRow<"weekly_priorities">;

export interface TableRows {
  projects: ProjectRow;
  project_milestones: MilestoneRow;
  recurrence_templates: RecurrenceRow;
  brain_dump_entries: CaptureRow;
  tasks: TaskRow;
  sprint_sessions: SessionRow;
  sprint_session_tasks: SessionTaskRow;
  daily_highlights: HighlightRow;
  micro_commitments: CommitmentRow;
  micro_commitment_completions: CompletionRow;
  kaizen_logs: KaizenLogRow;
  weekly_reviews: WeeklyReviewRow;
  weekly_priorities: WeeklyPriorityRow;
}

export type TableName = keyof TableRows;
export type AnyRow = TableRows[TableName];

export interface TombstoneRow {
  table_name: TableName;
  id: string;
  deleted_at: Timestamp;
}

/** Parents before children: the order inserts must follow (deletes go in reverse). */
export const TABLE_ORDER: TableName[] = [
  "projects",
  "project_milestones",
  "recurrence_templates",
  "brain_dump_entries",
  "tasks",
  "sprint_sessions",
  "sprint_session_tasks",
  "micro_commitments",
  "micro_commitment_completions",
  "daily_highlights",
  "kaizen_logs",
  "weekly_reviews",
  "weekly_priorities",
];
