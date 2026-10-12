/**
 * Row shapes of the Supabase tables (see supabase/migrations). Columns are
 * snake_case; `user_id`, `version` and `synced_at` are managed by the
 * database and never sent by the app.
 */
export type ISODate = string;
export type Timestamp = string;

interface Managed {
  user_id?: string;
  version?: number;
  synced_at?: Timestamp;
}

export interface ProjectRow extends Managed {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string | null;
  category: string;
  start_date: ISODate | null;
  target_date: ISODate | null;
  preparation_date: ISODate | null;
  icon: string;
  colour: string;
  notes: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  archived_at: Timestamp | null;
}

export interface MilestoneRow extends Managed {
  id: string;
  project_id: string;
  title: string;
  description: string;
  target_date: ISODate | null;
  preparation_date: ISODate | null;
  status: string;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  completed_at: Timestamp | null;
}

export interface RecurrenceRow extends Managed {
  id: string;
  title: string;
  description: string;
  frequency: string;
  interval: number;
  interval_unit: string;
  selected_weekdays: number[];
  start_date: ISODate;
  end_date: ISODate | null;
  sprint: string | null;
  project_id: string | null;
  priority: string | null;
  estimated_minutes: number | null;
  status: string;
  generated_through: ISODate | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CaptureRow extends Managed {
  id: string;
  title: string;
  note: string;
  kind: string;
  status: string;
  converted_task_id: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TaskRow extends Managed {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string | null;
  sprint: string | null;
  project_id: string | null;
  milestone_id: string | null;
  recurrence_template_id: string | null;
  occurrence_date: ISODate | null;
  due_date: ISODate | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  completed_at: Timestamp | null;
  source_capture_id: string | null;
  captured_at: Timestamp | null;
  sort_order: number;
  project_sort_order: number;
}

export interface SessionRow extends Managed {
  id: string;
  sprint: string;
  planned_minutes: number;
  energy_level: string | null;
  status: string;
  created_at: Timestamp;
  started_at: Timestamp | null;
  ended_at: Timestamp | null;
  accumulated_elapsed_seconds: number;
  last_resumed_at: Timestamp | null;
}

export interface SessionTaskRow extends Managed {
  id: string;
  session_id: string;
  task_id: string;
  position: number;
  completed_in_session: boolean;
  allocated_minutes: number | null;
}

export interface HighlightRow extends Managed {
  id: string;
  date_key: ISODate;
  task_id: string | null;
  title_snapshot: string;
  selected_at: Timestamp;
  updated_at: Timestamp;
}

export interface CommitmentRow extends Managed {
  id: string;
  title: string;
  description: string;
  target_minutes: number | null;
  frequency: string;
  selected_weekdays: number[];
  start_date: ISODate;
  status: string;
  paused_periods: { from: ISODate; to: ISODate | null }[];
  created_at: Timestamp;
  updated_at: Timestamp;
  archived_at: Timestamp | null;
}

export interface CompletionRow extends Managed {
  id: string;
  commitment_id: string;
  date_key: ISODate;
  completed_at: Timestamp;
}

export interface KaizenLogRow extends Managed {
  id: string;
  date_key: ISODate;
  reflection_went_well: string;
  reflection_improve: string;
  reflection_learned: string;
  notes: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface WeeklyReviewRow extends Managed {
  id: string;
  week_start_date: ISODate;
  week_end_date: ISODate;
  status: string;
  went_well: string;
  challenges: string;
  improvements: string;
  lessons_learned: string;
  next_week_focus: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  completed_at: Timestamp | null;
}

export interface WeeklyPriorityRow extends Managed {
  id: string;
  weekly_review_id: string;
  task_id: string | null;
  project_id: string | null;
  title: string;
  sort_order: number;
  created_at: Timestamp;
}

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
