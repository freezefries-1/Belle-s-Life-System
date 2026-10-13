import { SCHEMA_VERSION, parseEnvelope } from "@/lib/storage/schema";
import type { PersistedData } from "@/types";
import type { AnyRow, TableName, TableRows } from "@/types/database";

/**
 * The one place app records and database rows meet. Rows going up drop any
 * link to a record that no longer exists (so a save can never fail on a
 * foreign key); rows coming down pass through the same validation and
 * integrity rules as local data (parseEnvelope), so there's one set of
 * business rules, not two.
 */

export type RowSet = { [T in TableName]: Map<string, TableRows[T]> };

export const emptyRowSet = (): RowSet => ({
  projects: new Map(),
  project_milestones: new Map(),
  recurrence_templates: new Map(),
  brain_dump_entries: new Map(),
  tasks: new Map(),
  sprint_sessions: new Map(),
  sprint_session_tasks: new Map(),
  micro_commitments: new Map(),
  micro_commitment_completions: new Map(),
  daily_highlights: new Map(),
  kaizen_logs: new Map(),
  weekly_reviews: new Map(),
  weekly_priorities: new Map(),
});

const sessionTaskId = (sessionId: string, taskId: string) => `${sessionId}:${taskId}`;

/** App data → rows, keyed by id per table. */
export function dataToRows(d: PersistedData): RowSet {
  const rows = emptyRowSet();
  const taskIds = new Set(d.tasks.map((t) => t.id));
  const projectIds = new Set(d.projects.map((p) => p.id));
  const milestoneProject = new Map(d.milestones.filter((m) => projectIds.has(m.projectId)).map((m) => [m.id, m.projectId]));
  const recurrenceIds = new Set(d.recurrences.map((r) => r.id));
  const captureIds = new Set(d.captures.map((c) => c.id));
  const commitmentIds = new Set(d.commitments.map((c) => c.id));
  const reviewIds = new Set(d.weeklyReviews.map((r) => r.id));
  const keep = (id: string | null, set: Set<string>) => (id && set.has(id) ? id : null);

  for (const p of d.projects)
    rows.projects.set(p.id, {
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      priority: p.priority,
      category: p.category,
      start_date: p.startDate,
      target_date: p.targetDate,
      preparation_date: p.preparationDate,
      icon: p.icon,
      colour: p.colour,
      notes: p.notes,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
      archived_at: p.archivedAt,
    });
  for (const m of d.milestones) {
    if (!projectIds.has(m.projectId)) continue;
    rows.project_milestones.set(m.id, {
      id: m.id,
      project_id: m.projectId,
      title: m.title,
      description: m.description,
      target_date: m.targetDate,
      preparation_date: m.preparationDate,
      status: m.status,
      sort_order: m.sortOrder,
      created_at: m.createdAt,
      updated_at: m.updatedAt,
      completed_at: m.completedAt,
    });
  }
  for (const r of d.recurrences)
    rows.recurrence_templates.set(r.id, {
      id: r.id,
      title: r.title,
      description: r.description,
      frequency: r.frequency,
      interval: r.interval,
      interval_unit: r.intervalUnit,
      selected_weekdays: r.selectedWeekdays,
      start_date: r.startDate,
      end_date: r.endDate,
      sprint: r.sprintId,
      project_id: keep(r.projectId, projectIds),
      priority: r.priority,
      estimated_minutes: r.estimatedMinutes,
      status: r.status,
      generated_through: r.generatedThrough,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    });
  for (const c of d.captures)
    rows.brain_dump_entries.set(c.id, {
      id: c.id,
      title: c.title,
      note: c.note,
      kind: c.kind,
      status: c.status,
      converted_task_id: keep(c.convertedTaskId, taskIds),
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    });
  for (const t of d.tasks) {
    const projectId = keep(t.projectId, projectIds);
    rows.tasks.set(t.id, {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      sprint: t.sprint,
      project_id: projectId,
      milestone_id: t.milestoneId && projectId && milestoneProject.get(t.milestoneId) === projectId ? t.milestoneId : null,
      recurrence_template_id: keep(t.recurrenceTemplateId, recurrenceIds),
      occurrence_date: t.occurrenceDate,
      due_date: t.dueDate,
      estimated_minutes: t.estimatedMinutes,
      actual_minutes: t.actualMinutes,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
      completed_at: t.completedAt,
      source_capture_id: keep(t.sourceCaptureId, captureIds),
      captured_at: t.capturedAt,
      sort_order: t.sortOrder,
      project_sort_order: t.projectSortOrder,
    });
  }
  for (const s of d.sessions) {
    rows.sprint_sessions.set(s.id, {
      id: s.id,
      sprint: s.sprintId,
      planned_minutes: s.plannedMinutes,
      energy_level: s.energyLevel,
      status: s.status,
      created_at: s.createdAt,
      started_at: s.startedAt,
      ended_at: s.endedAt,
      accumulated_elapsed_seconds: Math.round(s.accumulatedElapsedSeconds),
      last_resumed_at: s.lastResumedAt,
    });
    // Join rows: the session's tasks (in order), plus any completed or allocated ones.
    const ids = [...new Set([...s.taskIds, ...s.completedTaskIds, ...s.allocations.map((a) => a.taskId)])].filter((id) => taskIds.has(id));
    ids.forEach((taskId) => {
      const position = s.taskIds.indexOf(taskId);
      rows.sprint_session_tasks.set(sessionTaskId(s.id, taskId), {
        id: sessionTaskId(s.id, taskId),
        session_id: s.id,
        task_id: taskId,
        position: position === -1 ? 1000 + ids.indexOf(taskId) : position,
        completed_in_session: s.completedTaskIds.includes(taskId),
        allocated_minutes: s.allocations.find((a) => a.taskId === taskId)?.minutes ?? null,
      });
    });
  }
  for (const c of d.commitments)
    rows.micro_commitments.set(c.id, {
      id: c.id,
      title: c.title,
      description: c.description,
      target_minutes: c.targetMinutes,
      frequency: c.frequency,
      selected_weekdays: c.selectedWeekdays,
      start_date: c.startDate,
      status: c.status,
      paused_periods: c.pausedPeriods,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      archived_at: c.archivedAt,
    });
  for (const c of d.commitmentCompletions) {
    if (!commitmentIds.has(c.commitmentId)) continue;
    rows.micro_commitment_completions.set(c.id, { id: c.id, commitment_id: c.commitmentId, date_key: c.dateKey, completed_at: c.completedAt });
  }
  for (const h of d.highlights)
    rows.daily_highlights.set(h.id, {
      id: h.id,
      date_key: h.dateKey,
      task_id: keep(h.taskId, taskIds),
      title_snapshot: h.titleSnapshot,
      selected_at: h.selectedAt,
      updated_at: h.updatedAt,
    });
  for (const l of d.kaizenLogs)
    rows.kaizen_logs.set(l.id, {
      id: l.id,
      date_key: l.dateKey,
      reflection_went_well: l.reflectionWentWell,
      reflection_improve: l.reflectionImprove,
      reflection_learned: l.reflectionLearned,
      notes: l.notes,
      created_at: l.createdAt,
      updated_at: l.updatedAt,
    });
  for (const r of d.weeklyReviews)
    rows.weekly_reviews.set(r.id, {
      id: r.id,
      week_start_date: r.weekStartDate,
      week_end_date: r.weekEndDate,
      status: r.status,
      went_well: r.wentWell,
      challenges: r.challenges,
      improvements: r.improvements,
      lessons_learned: r.lessonsLearned,
      next_week_focus: r.nextWeekFocus,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
      completed_at: r.completedAt,
    });
  for (const p of d.weeklyPriorities) {
    if (!reviewIds.has(p.weeklyReviewId)) continue;
    rows.weekly_priorities.set(p.id, {
      id: p.id,
      weekly_review_id: p.weeklyReviewId,
      task_id: keep(p.taskId, taskIds),
      project_id: keep(p.projectId, projectIds),
      title: p.title,
      sort_order: p.sortOrder,
      created_at: p.createdAt,
    });
  }
  return rows;
}

/** Rows → app data, through the same validation and integrity rules as local storage. */
export function rowsToData(rows: RowSet): PersistedData {
  const list = <T extends TableName>(t: T) => [...rows[t].values()];
  const joins = list("sprint_session_tasks");
  const raw = {
    projects: list("projects").map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      priority: p.priority,
      category: p.category,
      startDate: p.start_date,
      targetDate: p.target_date,
      preparationDate: p.preparation_date,
      icon: p.icon,
      colour: p.colour,
      notes: p.notes,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      archivedAt: p.archived_at,
    })),
    milestones: list("project_milestones").map((m) => ({
      id: m.id,
      projectId: m.project_id,
      title: m.title,
      description: m.description,
      targetDate: m.target_date,
      preparationDate: m.preparation_date,
      status: m.status,
      sortOrder: m.sort_order,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      completedAt: m.completed_at,
    })),
    recurrences: list("recurrence_templates").map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      frequency: r.frequency,
      interval: r.interval,
      intervalUnit: r.interval_unit,
      selectedWeekdays: r.selected_weekdays,
      startDate: r.start_date,
      endDate: r.end_date,
      sprintId: r.sprint,
      projectId: r.project_id,
      priority: r.priority,
      estimatedMinutes: r.estimated_minutes,
      status: r.status,
      generatedThrough: r.generated_through,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    captures: list("brain_dump_entries").map((c) => ({
      id: c.id,
      title: c.title,
      note: c.note,
      kind: c.kind,
      status: c.status,
      convertedTaskId: c.converted_task_id,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
    tasks: list("tasks").map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      sprint: t.sprint,
      projectId: t.project_id,
      milestoneId: t.milestone_id,
      recurrenceTemplateId: t.recurrence_template_id,
      occurrenceDate: t.occurrence_date,
      dueDate: t.due_date,
      estimatedMinutes: t.estimated_minutes,
      actualMinutes: t.actual_minutes,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      completedAt: t.completed_at,
      sourceCaptureId: t.source_capture_id,
      capturedAt: t.captured_at,
      sortOrder: t.sort_order,
      projectSortOrder: t.project_sort_order,
    })),
    sessions: list("sprint_sessions").map((s) => {
      const mine = joins.filter((j) => j.session_id === s.id).sort((a, b) => a.position - b.position);
      return {
        id: s.id,
        sprintId: s.sprint,
        taskIds: mine.filter((j) => j.position < 1000).map((j) => j.task_id),
        plannedMinutes: s.planned_minutes,
        energyLevel: s.energy_level,
        status: s.status,
        createdAt: s.created_at,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        accumulatedElapsedSeconds: s.accumulated_elapsed_seconds,
        lastResumedAt: s.last_resumed_at,
        completedTaskIds: mine.filter((j) => j.completed_in_session).map((j) => j.task_id),
        allocations: mine.filter((j) => j.allocated_minutes).map((j) => ({ taskId: j.task_id, minutes: j.allocated_minutes })),
      };
    }),
    highlights: list("daily_highlights").map((h) => ({
      id: h.id,
      dateKey: h.date_key,
      // A highlight whose task was deleted keeps its title snapshot.
      taskId: h.task_id ?? `deleted:${h.id}`,
      titleSnapshot: h.title_snapshot,
      selectedAt: h.selected_at,
      updatedAt: h.updated_at,
    })),
    commitments: list("micro_commitments").map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      targetMinutes: c.target_minutes,
      frequency: c.frequency,
      selectedWeekdays: c.selected_weekdays,
      startDate: c.start_date,
      status: c.status,
      pausedPeriods: c.paused_periods,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      archivedAt: c.archived_at,
    })),
    commitmentCompletions: list("micro_commitment_completions").map((c) => ({
      id: c.id,
      commitmentId: c.commitment_id,
      dateKey: c.date_key,
      completedAt: c.completed_at,
    })),
    kaizenLogs: list("kaizen_logs").map((l) => ({
      id: l.id,
      dateKey: l.date_key,
      reflectionWentWell: l.reflection_went_well,
      reflectionImprove: l.reflection_improve,
      reflectionLearned: l.reflection_learned,
      notes: l.notes,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    })),
    weeklyReviews: list("weekly_reviews").map((r) => ({
      id: r.id,
      weekStartDate: r.week_start_date,
      weekEndDate: r.week_end_date,
      status: r.status,
      wentWell: r.went_well,
      challenges: r.challenges,
      improvements: r.improvements,
      lessonsLearned: r.lessons_learned,
      nextWeekFocus: r.next_week_focus,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      completedAt: r.completed_at,
    })),
    weeklyPriorities: list("weekly_priorities").map((p) => ({
      id: p.id,
      weeklyReviewId: p.weekly_review_id,
      taskId: p.task_id,
      projectId: p.project_id,
      title: p.title,
      sortOrder: p.sort_order,
      createdAt: p.created_at,
    })),
  };
  const parsed = parseEnvelope({ schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), data: raw });
  return parsed ? parsed.data : rowsToEmpty();
}

function rowsToEmpty(): PersistedData {
  return {
    tasks: [],
    captures: [],
    sessions: [],
    highlights: [],
    commitments: [],
    commitmentCompletions: [],
    kaizenLogs: [],
    projects: [],
    milestones: [],
    recurrences: [],
    weeklyReviews: [],
    weeklyPriorities: [],
  };
}

/** Data columns only — what's compared and sent (no user_id/version/synced_at). */
export function stripManaged<R extends AnyRow>(row: R): R {
  const { user_id: _u, version: _v, synced_at: _s, ...rest } = row as R & { user_id?: string; version?: number; synced_at?: string };
  void _u;
  void _v;
  void _s;
  return rest as R;
}

const MANAGED = new Set(["user_id", "version", "synced_at"]);

/** Every data field holds the very same value (the usual case for an unchanged record). */
function identicalFields(a: AnyRow, b: AnyRow) {
  const x = a as unknown as Record<string, unknown>;
  const y = b as unknown as Record<string, unknown>;
  for (const k in x) if (!MANAGED.has(k) && x[k] !== y[k]) return false;
  for (const k in y) if (!MANAGED.has(k) && !(k in x)) return false;
  return true;
}

/** Stable comparison of two rows' data. Timestamps are compared as instants. */
export function sameRow(a: AnyRow | undefined, b: AnyRow | undefined) {
  if (!a || !b) return a === b;
  // Fast path first: comparing every row as normalised JSON on each save is slow with years of data.
  return identicalFields(a, b) || canonical(stripManaged(a)) === canonical(stripManaged(b));
}

function canonical(row: object) {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(row).sort()) {
    const v = (row as Record<string, unknown>)[k];
    out[k] = typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v).toISOString() : v;
  }
  return JSON.stringify(out);
}
