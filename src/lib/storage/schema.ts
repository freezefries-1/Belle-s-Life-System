import { LEGACY_PROJECTS } from "@/data/legacy-projects";
import { addDays, isValidISODate, localDateOf, startOfWeek } from "@/lib/date";
import type {
  Capture,
  CaptureKind,
  CaptureStatus,
  CommitmentCompletion,
  CommitmentFrequency,
  CommitmentStatus,
  DailyHighlight,
  EnergyLevel,
  KaizenLog,
  MicroCommitment,
  Milestone,
  MilestoneStatus,
  PausedPeriod,
  Project,
  ProjectColour,
  ProjectIcon,
  ProjectStatus,
  RecurrenceFrequency,
  RecurrenceStatus,
  RecurrenceTemplate,
  PersistedData,
  SessionStatus,
  SprintId,
  SprintSession,
  Task,
  TaskPriority,
  TaskStatus,
  WeeklyPriority,
  WeeklyReview,
} from "@/types";

/**
 * Versioned storage schema.
 *
 * The key carries the major version so an incompatible future format can
 * live alongside this one; `schemaVersion` inside the envelope allows
 * in-place migrations for smaller changes.
 */
export const STORAGE_KEY = "belles-life-system:v1";
/**
 * 1 — Phase 2: tasks + captures.
 * 2 — Phase 3: tasks gain `sortOrder`; sprint `sessions` added.
 * 3 — Phase 4: daily `highlights`, `commitments`, `commitmentCompletions`, `kaizenLogs`.
 * 4 — Phase 5: `projects`, `milestones`, `recurrences`; tasks gain milestone,
 *     recurrence and project-order fields.
 * 5 — Phase 6: `weeklyReviews`, `weeklyPriorities`; commitments gain
 *     `pausedPeriods`, milestones `completedAt`, sessions `allocations`.
 */
export const SCHEMA_VERSION = 5;

export interface StorageEnvelope {
  schemaVersion: number;
  savedAt: string;
  data: PersistedData;
}

export const EMPTY_DATA: PersistedData = {
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

const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "completed", "skipped"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const SPRINT_IDS: SprintId[] = ["urgent", "deadlines", "admin", "build"];
const CAPTURE_KINDS: CaptureKind[] = ["task", "idea", "reminder", "note"];
const CAPTURE_STATUSES: CaptureStatus[] = ["inbox", "converted"];
const SESSION_STATUSES: SessionStatus[] = ["ready", "running", "paused", "ended"];
const ENERGY_LEVELS: EnergyLevel[] = ["low", "moderate", "high"];
const FREQUENCIES: CommitmentFrequency[] = ["daily", "weekdays", "weekly"];
const COMMITMENT_STATUSES: CommitmentStatus[] = ["active", "paused", "archived"];
const PROJECT_STATUSES: ProjectStatus[] = ["planning", "active", "on_hold", "completed", "archived"];
const PROJECT_COLOURS: ProjectColour[] = ["blue", "teal", "amber", "violet", "rose", "slate"];
const PROJECT_ICONS: ProjectIcon[] = ["folder", "briefcase", "trophy", "house", "heart", "sparkles", "book", "dumbbell"];
const MILESTONE_STATUSES: MilestoneStatus[] = ["upcoming", "in_progress", "completed"];
const RECURRENCE_FREQUENCIES: RecurrenceFrequency[] = ["daily", "weekdays", "weekly", "biweekly", "monthly", "custom"];
const RECURRENCE_STATUSES: RecurrenceStatus[] = ["active", "paused", "ended"];

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const strOrNull = (v: unknown) => (typeof v === "string" ? v : null);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
const minutes = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 100_000 ? Math.round(v) : null;
const isoDate = (v: unknown) => (isValidISODate(v) ? v : null);
const timestamp = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null);
const finite = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const stringArray = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Returns a clean Task, or null if the record is unusable. */
export function parseTask(raw: unknown): Task | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const title = str(raw.title)?.trim();
  const status = oneOf(raw.status, TASK_STATUSES);
  const createdAt = timestamp(raw.createdAt);
  if (!id || !title || !status || !createdAt) return null;

  return {
    id,
    title,
    description: str(raw.description) ?? "",
    status,
    priority: oneOf(raw.priority, PRIORITIES),
    sprint: oneOf(raw.sprint, SPRINT_IDS),
    projectId: strOrNull(raw.projectId),
    dueDate: isoDate(raw.dueDate),
    estimatedMinutes: minutes(raw.estimatedMinutes),
    actualMinutes: minutes(raw.actualMinutes),
    createdAt,
    updatedAt: timestamp(raw.updatedAt) ?? createdAt,
    // A completion timestamp only makes sense on a completed task.
    completedAt: status === "completed" ? (timestamp(raw.completedAt) ?? createdAt) : null,
    sourceCaptureId: strOrNull(raw.sourceCaptureId),
    capturedAt: timestamp(raw.capturedAt),
    // NaN marks "missing"; parseEnvelope assigns a stable position afterwards.
    sortOrder: finite(raw.sortOrder) ?? Number.NaN,
    projectSortOrder: finite(raw.projectSortOrder) ?? Number.NaN,
    milestoneId: strOrNull(raw.milestoneId),
    recurrenceTemplateId: strOrNull(raw.recurrenceTemplateId),
    occurrenceDate: isoDate(raw.occurrenceDate),
  };
}

export function parseProject(raw: unknown): Project | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const name = str(raw.name)?.trim();
  const createdAt = timestamp(raw.createdAt);
  if (!id || !name || !createdAt) return null;
  const status = oneOf(raw.status, PROJECT_STATUSES) ?? "active";
  return {
    id,
    name,
    description: str(raw.description) ?? "",
    status,
    priority: oneOf(raw.priority, PRIORITIES),
    category: str(raw.category) ?? "",
    startDate: isoDate(raw.startDate),
    targetDate: isoDate(raw.targetDate),
    preparationDate: isoDate(raw.preparationDate),
    icon: oneOf(raw.icon, PROJECT_ICONS) ?? "folder",
    colour: oneOf(raw.colour, PROJECT_COLOURS) ?? "blue",
    notes: str(raw.notes) ?? "",
    createdAt,
    updatedAt: timestamp(raw.updatedAt) ?? createdAt,
    archivedAt: status === "archived" ? (timestamp(raw.archivedAt) ?? createdAt) : null,
  };
}

export function parseMilestone(raw: unknown): Milestone | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const projectId = str(raw.projectId);
  const title = str(raw.title)?.trim();
  const createdAt = timestamp(raw.createdAt);
  if (!id || !projectId || !title || !createdAt) return null;
  return {
    id,
    projectId,
    title,
    description: str(raw.description) ?? "",
    targetDate: isoDate(raw.targetDate),
    preparationDate: isoDate(raw.preparationDate),
    status: oneOf(raw.status, MILESTONE_STATUSES) ?? "upcoming",
    sortOrder: finite(raw.sortOrder) ?? 0,
    createdAt,
    updatedAt: timestamp(raw.updatedAt) ?? createdAt,
    // Older records have no completion time; their last update is the best estimate.
    completedAt: raw.status === "completed" ? (timestamp(raw.completedAt) ?? timestamp(raw.updatedAt) ?? createdAt) : null,
  };
}

export function parseRecurrence(raw: unknown): RecurrenceTemplate | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const title = str(raw.title)?.trim();
  const createdAt = timestamp(raw.createdAt);
  const startDate = isoDate(raw.startDate);
  const frequency = oneOf(raw.frequency, RECURRENCE_FREQUENCIES);
  if (!id || !title || !createdAt || !startDate || !frequency) return null;
  const weekdays = Array.isArray(raw.selectedWeekdays)
    ? [...new Set(raw.selectedWeekdays.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
    : [];
  const interval = finite(raw.interval);
  const endDate = isoDate(raw.endDate);
  return {
    id,
    title,
    description: str(raw.description) ?? "",
    frequency,
    interval: interval && interval >= 1 ? Math.min(365, Math.round(interval)) : 1,
    intervalUnit: raw.intervalUnit === "weeks" ? "weeks" : "days",
    selectedWeekdays: weekdays,
    startDate,
    endDate: endDate && endDate >= startDate ? endDate : null,
    sprintId: oneOf(raw.sprintId, SPRINT_IDS),
    projectId: strOrNull(raw.projectId),
    priority: oneOf(raw.priority, PRIORITIES),
    estimatedMinutes: minutes(raw.estimatedMinutes),
    status: oneOf(raw.status, RECURRENCE_STATUSES) ?? "active",
    generatedThrough: isoDate(raw.generatedThrough),
    createdAt,
    updatedAt: timestamp(raw.updatedAt) ?? createdAt,
  };
}

export function parseSession(raw: unknown): SprintSession | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const sprintId = oneOf(raw.sprintId, SPRINT_IDS);
  const status = oneOf(raw.status, SESSION_STATUSES);
  const createdAt = timestamp(raw.createdAt);
  const plannedMinutes = minutes(raw.plannedMinutes);
  if (!id || !sprintId || !status || !createdAt || plannedMinutes === null) return null;

  const lastResumedAt = timestamp(raw.lastResumedAt);
  return {
    id,
    sprintId,
    taskIds: stringArray(raw.taskIds),
    plannedMinutes,
    energyLevel: oneOf(raw.energyLevel, ENERGY_LEVELS),
    // A "running" session with no resume time can't be timed — treat it as paused.
    status: status === "running" && !lastResumedAt ? "paused" : status,
    createdAt,
    startedAt: timestamp(raw.startedAt),
    endedAt: timestamp(raw.endedAt),
    accumulatedElapsedSeconds: Math.max(0, finite(raw.accumulatedElapsedSeconds) ?? 0),
    lastResumedAt: status === "running" ? lastResumedAt : null,
    completedTaskIds: stringArray(raw.completedTaskIds),
    allocations: Array.isArray(raw.allocations)
      ? raw.allocations
          .filter(isObj)
          .map((a) => ({ taskId: str(a.taskId), minutes: minutes(a.minutes) }))
          .filter((a): a is { taskId: string; minutes: number } => !!a.taskId && !!a.minutes)
      : [],
  };
}

export function parseHighlight(raw: unknown): DailyHighlight | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const dateKey = isoDate(raw.dateKey);
  const taskId = str(raw.taskId);
  const selectedAt = timestamp(raw.selectedAt);
  if (!id || !dateKey || !taskId || !selectedAt) return null;
  return {
    id,
    dateKey,
    taskId,
    titleSnapshot: str(raw.titleSnapshot)?.trim() || "Untitled task",
    selectedAt,
    updatedAt: timestamp(raw.updatedAt) ?? selectedAt,
  };
}

export function parseCommitment(raw: unknown): MicroCommitment | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const title = str(raw.title)?.trim();
  const createdAt = timestamp(raw.createdAt);
  const startDate = isoDate(raw.startDate);
  if (!id || !title || !createdAt || !startDate) return null;
  const weekdays = Array.isArray(raw.selectedWeekdays)
    ? [...new Set(raw.selectedWeekdays.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
    : [];
  let frequency = oneOf(raw.frequency, FREQUENCIES) ?? "daily";
  // "Selected weekdays" with no days chosen would never be scheduled — treat as daily.
  if (frequency === "weekdays" && weekdays.length === 0) frequency = "daily";
  const status = oneOf(raw.status, COMMITMENT_STATUSES) ?? "active";
  return {
    id,
    title,
    description: str(raw.description) ?? "",
    targetMinutes: minutes(raw.targetMinutes),
    frequency,
    selectedWeekdays: weekdays,
    startDate,
    status,
    createdAt,
    updatedAt: timestamp(raw.updatedAt) ?? createdAt,
    archivedAt: status === "archived" ? (timestamp(raw.archivedAt) ?? createdAt) : null,
    pausedPeriods: parsePausedPeriods(raw.pausedPeriods, status, localDateOf(timestamp(raw.updatedAt) ?? createdAt)),
  };
}

/**
 * Valid, ordered pause periods with at most one still open — and only while
 * paused. A commitment paused before pause history existed gets one period
 * starting from its last update (the best date available).
 */
function parsePausedPeriods(raw: unknown, status: string, fallbackDate: string): PausedPeriod[] {
  const periods = (Array.isArray(raw) ? raw : [])
    .filter(isObj)
    .map((p) => ({ from: isoDate(p.from), to: isoDate(p.to) }))
    .filter((p): p is PausedPeriod => !!p.from && (p.to === null || p.to >= p.from))
    .sort((a, b) => a.from.localeCompare(b.from));
  const closed = periods.filter((p) => p.to !== null);
  const open = periods.find((p) => p.to === null);
  if (status === "paused") return [...closed, open ?? { from: fallbackDate, to: null }];
  return open ? [...closed, { from: open.from, to: fallbackDate >= open.from ? fallbackDate : open.from }] : closed;
}

export function parseWeeklyReview(raw: unknown): WeeklyReview | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const date = isoDate(raw.weekStartDate);
  const createdAt = timestamp(raw.createdAt);
  if (!id || !date || !createdAt) return null;
  const weekStartDate = startOfWeek(date);
  const status = raw.status === "completed" ? "completed" : "in_progress";
  return {
    id,
    weekStartDate,
    weekEndDate: addDays(weekStartDate, 6),
    status,
    wentWell: str(raw.wentWell) ?? "",
    challenges: str(raw.challenges) ?? "",
    improvements: str(raw.improvements) ?? "",
    lessonsLearned: str(raw.lessonsLearned) ?? "",
    nextWeekFocus: str(raw.nextWeekFocus) ?? "",
    createdAt,
    updatedAt: timestamp(raw.updatedAt) ?? createdAt,
    completedAt: status === "completed" ? (timestamp(raw.completedAt) ?? timestamp(raw.updatedAt) ?? createdAt) : null,
  };
}

export function parseWeeklyPriority(raw: unknown): WeeklyPriority | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const weeklyReviewId = str(raw.weeklyReviewId);
  const title = str(raw.title)?.trim();
  const createdAt = timestamp(raw.createdAt);
  if (!id || !weeklyReviewId || !title || !createdAt) return null;
  return {
    id,
    weeklyReviewId,
    taskId: strOrNull(raw.taskId),
    projectId: strOrNull(raw.projectId),
    title,
    sortOrder: finite(raw.sortOrder) ?? 0,
    createdAt,
  };
}

export function parseCompletion(raw: unknown): CommitmentCompletion | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const commitmentId = str(raw.commitmentId);
  const dateKey = isoDate(raw.dateKey);
  const completedAt = timestamp(raw.completedAt);
  if (!id || !commitmentId || !dateKey || !completedAt) return null;
  return { id, commitmentId, dateKey, completedAt };
}

export function parseKaizenLog(raw: unknown): KaizenLog | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const dateKey = isoDate(raw.dateKey);
  const createdAt = timestamp(raw.createdAt);
  if (!id || !dateKey || !createdAt) return null;
  return {
    id,
    dateKey,
    reflectionWentWell: str(raw.reflectionWentWell) ?? "",
    reflectionImprove: str(raw.reflectionImprove) ?? "",
    reflectionLearned: str(raw.reflectionLearned) ?? "",
    notes: str(raw.notes) ?? "",
    createdAt,
    updatedAt: timestamp(raw.updatedAt) ?? createdAt,
  };
}

/** Keep one record per key — the most recently updated wins. */
function uniqueBy<T>(items: T[], key: (item: T) => string, updated: (item: T) => string) {
  const best = new Map<string, T>();
  for (const item of items) {
    const k = key(item);
    const current = best.get(k);
    if (!current || updated(item) > updated(current)) best.set(k, item);
  }
  return items.filter((item) => best.get(key(item)) === item);
}

function parseList<T>(raw: unknown, parse: (x: unknown) => T | null) {
  const list = Array.isArray(raw) ? raw : [];
  const parsed = list.map(parse).filter((x): x is T => x !== null);
  return { parsed, dropped: list.length - parsed.length };
}

/**
 * Give tasks without a position a stable one, after all positioned tasks,
 * in the order the Phase 2 board showed them (due date, then oldest first).
 */
function assignMissingSortOrders(tasks: Task[]): Task[] {
  const known = tasks.filter((t) => !Number.isNaN(t.sortOrder));
  let next = known.length ? Math.max(...known.map((t) => t.sortOrder)) + 1000 : 1000;
  const missing = tasks
    .filter((t) => Number.isNaN(t.sortOrder))
    .sort(
      (a, b) =>
        (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
  const assigned = new Map(missing.map((t) => [t.id, (next += 1000)]));
  return tasks.map((t) => (assigned.has(t.id) ? { ...t, sortOrder: assigned.get(t.id)! } : t));
}

export function parseCapture(raw: unknown): Capture | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const title = str(raw.title)?.trim();
  const createdAt = timestamp(raw.createdAt);
  if (!id || !title || !createdAt) return null;

  return {
    id,
    title,
    note: str(raw.note) ?? "",
    kind: oneOf(raw.kind, CAPTURE_KINDS) ?? "task",
    status: oneOf(raw.status, CAPTURE_STATUSES) ?? "inbox",
    createdAt,
    updatedAt: timestamp(raw.updatedAt) ?? createdAt,
    convertedTaskId: strOrNull(raw.convertedTaskId),
  };
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

export interface ParseResult {
  data: PersistedData;
  /** Every record that was present but isn't in `data`: unreadable ones plus those removed by the clean-up rules. */
  dropped: number;
  /** Records that were present but could not be read. */
  unreadable: number;
  /** Readable records removed by the clean-up rules, by kind. */
  removed: {
    /** Milestones whose project is missing. */
    milestones: number;
    /** Commitment history for a commitment that doesn't exist. */
    completions: number;
    /** Weekly priorities whose review is missing, or beyond three per review. */
    priorities: number;
    /** Repeated copies: the same id twice, or a second record for one day or week. */
    duplicates: number;
  };
  /** The older schema version this data was upgraded from, if any. */
  migratedFrom: number | null;
}

/** Validate a stored envelope. Returns null when the whole thing is unreadable. */
export function parseEnvelope(raw: unknown): ParseResult | null {
  if (!isObj(raw) || typeof raw.schemaVersion !== "number" || !isObj(raw.data)) return null;
  const migrated = migrate(raw.schemaVersion, raw.data);
  if (!migrated) return null;

  const rawTasks = Array.isArray(migrated.tasks) ? migrated.tasks : [];
  const rawCaptures = Array.isArray(migrated.captures) ? migrated.captures : [];
  const rawSessions = Array.isArray(migrated.sessions) ? migrated.sessions : [];
  const parsedTasks = rawTasks.map(parseTask).filter((t): t is Task => t !== null);
  const parsedCaptures = rawCaptures.map(parseCapture).filter((c): c is Capture => c !== null);
  const parsedSessions = rawSessions.map(parseSession).filter((x): x is SprintSession => x !== null);
  const [parsedTaskCount, parsedCaptureCount, parsedSessionCount] = [parsedTasks.length, parsedCaptures.length, parsedSessions.length];
  const tasks = assignMissingSortOrders(dedupeById(parsedTasks));
  const captures = dedupeById(parsedCaptures);
  let sessions = dedupeById(parsedSessions);

  // Only one session may be open; if several are, keep the newest open one.
  const open = sessions.filter((x) => x.status !== "ended").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (open.length > 1) {
    const extra = new Set(open.slice(1).map((x) => x.id));
    sessions = sessions.map((x) => (extra.has(x.id) ? { ...x, status: "ended", endedAt: x.endedAt ?? x.createdAt, lastResumedAt: null } : x));
  }

  const projectsParsed = parseList(migrated.projects, parseProject);
  const projects = dedupeById(projectsParsed.parsed);
  const projectIds = new Set(projects.map((p) => p.id));
  const milestonesParsed = parseList(migrated.milestones, parseMilestone);
  const milestones = dedupeById(milestonesParsed.parsed).filter((m) => projectIds.has(m.projectId));
  const milestoneProject = new Map(milestones.map((m) => [m.id, m.projectId]));
  const recurrencesParsed = parseList(migrated.recurrences, parseRecurrence);
  const recurrences = dedupeById(recurrencesParsed.parsed).map((r) =>
    r.projectId && !projectIds.has(r.projectId) ? { ...r, projectId: null } : r,
  );
  const recurrenceIds = new Set(recurrences.map((r) => r.id));
  // No broken references: links to missing projects, milestones or templates are cleared.
  const linkedTasks = tasks.map((t) => {
    const projectId = t.projectId && projectIds.has(t.projectId) ? t.projectId : null;
    const milestoneId = t.milestoneId && projectId && milestoneProject.get(t.milestoneId) === projectId ? t.milestoneId : null;
    const recurrenceTemplateId = t.recurrenceTemplateId && recurrenceIds.has(t.recurrenceTemplateId) ? t.recurrenceTemplateId : null;
    const projectSortOrder = Number.isNaN(t.projectSortOrder) ? t.sortOrder : t.projectSortOrder;
    return projectId === t.projectId &&
      milestoneId === t.milestoneId &&
      recurrenceTemplateId === t.recurrenceTemplateId &&
      projectSortOrder === t.projectSortOrder
      ? t
      : { ...t, projectId, milestoneId, recurrenceTemplateId, projectSortOrder };
  });

  const highlights = parseList(migrated.highlights, parseHighlight);
  const commitments = parseList(migrated.commitments, parseCommitment);
  const completions = parseList(migrated.commitmentCompletions, parseCompletion);
  const logs = parseList(migrated.kaizenLogs, parseKaizenLog);
  const commitmentIds = new Set(commitments.parsed.map((c) => c.id));

  // Weekly reviews: one per week. Priorities belong to a review (max three),
  // and links to deleted tasks or projects are cleared — the title stays.
  const reviewsParsed = parseList(migrated.weeklyReviews, parseWeeklyReview);
  const weeklyReviews = uniqueBy(dedupeById(reviewsParsed.parsed), (r) => r.weekStartDate, (r) => r.updatedAt);
  const reviewIds = new Set(weeklyReviews.map((r) => r.id));
  const taskIds = new Set(linkedTasks.map((t) => t.id));
  const prioritiesParsed = parseList(migrated.weeklyPriorities, parseWeeklyPriority);
  const perReview = new Map<string, number>();
  const weeklyPriorities = dedupeById(prioritiesParsed.parsed)
    .filter((p) => reviewIds.has(p.weeklyReviewId))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((p) => {
      const n = perReview.get(p.weeklyReviewId) ?? 0;
      perReview.set(p.weeklyReviewId, n + 1);
      return n < 3;
    })
    .map((p) => ({
      ...p,
      taskId: p.taskId && taskIds.has(p.taskId) ? p.taskId : null,
      projectId: p.projectId && projectIds.has(p.projectId) ? p.projectId : null,
    }));
  // Session time given to tasks that no longer exist is released.
  const cleanSessions = sessions.map((x) =>
    x.allocations.every((a) => taskIds.has(a.taskId)) ? x : { ...x, allocations: x.allocations.filter((a) => taskIds.has(a.taskId)) },
  );

  const highlightsKept = dedupeById(highlights.parsed);
  const commitmentsKept = dedupeById(commitments.parsed);
  const completionsKept = dedupeById(completions.parsed);
  const completionsLinked = completionsKept.filter((c) => commitmentIds.has(c.commitmentId));
  const logsKept = dedupeById(logs.parsed);
  const prioritiesKept = dedupeById(prioritiesParsed.parsed);
  const data: PersistedData = {
    tasks: linkedTasks,
    captures,
    sessions: cleanSessions,
    // One highlight and one log per calendar day; one completion per commitment per day.
    highlights: uniqueBy(highlightsKept, (h) => h.dateKey, (h) => h.updatedAt),
    commitments: commitmentsKept,
    commitmentCompletions: uniqueBy(completionsLinked, (c) => `${c.commitmentId}|${c.dateKey}`, (c) => c.completedAt),
    kaizenLogs: uniqueBy(logsKept, (l) => l.dateKey, (l) => l.updatedAt),
    projects,
    milestones,
    recurrences,
    weeklyReviews,
    weeklyPriorities,
  };

  const unreadable =
    rawTasks.length -
    parsedTaskCount +
    (rawCaptures.length - parsedCaptureCount) +
    (rawSessions.length - parsedSessionCount) +
    highlights.dropped +
    commitments.dropped +
    completions.dropped +
    logs.dropped +
    projectsParsed.dropped +
    milestonesParsed.dropped +
    recurrencesParsed.dropped +
    reviewsParsed.dropped +
    prioritiesParsed.dropped;
  const removed = {
    milestones: dedupeById(milestonesParsed.parsed).length - milestones.length,
    completions: completionsKept.length - completionsLinked.length,
    priorities: prioritiesKept.length - weeklyPriorities.length,
    duplicates:
      parsedTaskCount -
      tasks.length +
      (parsedCaptureCount - captures.length) +
      (parsedSessionCount - sessions.length) +
      (highlights.parsed.length - data.highlights.length) +
      (commitments.parsed.length - commitmentsKept.length) +
      (completions.parsed.length - completionsKept.length) +
      (completionsLinked.length - data.commitmentCompletions.length) +
      (logs.parsed.length - data.kaizenLogs.length) +
      (projectsParsed.parsed.length - projects.length) +
      (milestonesParsed.parsed.length - dedupeById(milestonesParsed.parsed).length) +
      (recurrencesParsed.parsed.length - recurrences.length) +
      (reviewsParsed.parsed.length - weeklyReviews.length) +
      (prioritiesParsed.parsed.length - prioritiesKept.length),
  };

  return {
    data,
    dropped: unreadable + removed.milestones + removed.completions + removed.priorities + removed.duplicates,
    unreadable,
    removed,
    migratedFrom: raw.schemaVersion < SCHEMA_VERSION ? raw.schemaVersion : null,
  };
}

/** Upgrade older schema versions step by step. Add a step whenever the schema changes. */
function migrate(version: number, data: Obj): Obj | null {
  if (version > SCHEMA_VERSION || version < 1) return null; // Unknown — don't guess.
  let current = data;
  if (version < 2) {
    // v1 → v2: tasks get positions (assigned during parsing), sessions start empty.
    current = { ...current, sessions: [] };
  }
  if (version < 3) {
    // v2 → v3: daily records start empty. Nothing existing is touched.
    current = { ...current, highlights: [], commitments: [], commitmentCompletions: [], kaizenLogs: [] };
  }
  if (version < 4) {
    // v3 → v4: projects become real records. Tasks linked to one of the old
    // built-in preview projects keep that link via a real project; no other
    // projects are created.
    const tasks = Array.isArray(current.tasks) ? current.tasks : [];
    const used = new Set(tasks.map((t) => (isObj(t) ? t.projectId : null)).filter((id): id is string => typeof id === "string"));
    const now = new Date().toISOString();
    const projects = Object.entries(LEGACY_PROJECTS)
      .filter(([id]) => used.has(id))
      .map(([id, p]) => ({ id, ...p, status: "active", notes: "", createdAt: now, updatedAt: now }));
    current = { ...current, projects, milestones: [], recurrences: [] };
  }
  if (version < 5) {
    // v4 → v5: weekly reviews start empty. New fields on commitments,
    // milestones and sessions are filled in (from existing timestamps) while parsing.
    current = { ...current, weeklyReviews: [], weeklyPriorities: [] };
  }
  return current;
}

export function createEnvelope(data: PersistedData): StorageEnvelope {
  return { schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), data };
}
