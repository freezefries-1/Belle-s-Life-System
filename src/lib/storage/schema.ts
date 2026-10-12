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
  PersistedData,
  SessionStatus,
  SprintId,
  SprintSession,
  Task,
  TaskPriority,
  TaskStatus,
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
 */
export const SCHEMA_VERSION = 3;

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

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const strOrNull = (v: unknown) => (typeof v === "string" ? v : null);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
const minutes = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 100_000 ? Math.round(v) : null;
const isoDate = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
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
  /** Records that were present but could not be read. */
  dropped: number;
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
  const tasks = assignMissingSortOrders(dedupeById(rawTasks.map(parseTask).filter((t): t is Task => t !== null)));
  const captures = dedupeById(rawCaptures.map(parseCapture).filter((c): c is Capture => c !== null));
  let sessions = dedupeById(rawSessions.map(parseSession).filter((x): x is SprintSession => x !== null));

  // Only one session may be open; if several are, keep the newest open one.
  const open = sessions.filter((x) => x.status !== "ended").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (open.length > 1) {
    const extra = new Set(open.slice(1).map((x) => x.id));
    sessions = sessions.map((x) => (extra.has(x.id) ? { ...x, status: "ended", endedAt: x.endedAt ?? x.createdAt, lastResumedAt: null } : x));
  }

  const highlights = parseList(migrated.highlights, parseHighlight);
  const commitments = parseList(migrated.commitments, parseCommitment);
  const completions = parseList(migrated.commitmentCompletions, parseCompletion);
  const logs = parseList(migrated.kaizenLogs, parseKaizenLog);
  const commitmentIds = new Set(commitments.parsed.map((c) => c.id));

  return {
    data: {
      tasks,
      captures,
      sessions,
      // One highlight and one log per calendar day; one completion per commitment per day.
      highlights: uniqueBy(dedupeById(highlights.parsed), (h) => h.dateKey, (h) => h.updatedAt),
      commitments: dedupeById(commitments.parsed),
      commitmentCompletions: uniqueBy(
        dedupeById(completions.parsed).filter((c) => commitmentIds.has(c.commitmentId)),
        (c) => `${c.commitmentId}|${c.dateKey}`,
        (c) => c.completedAt,
      ),
      kaizenLogs: uniqueBy(dedupeById(logs.parsed), (l) => l.dateKey, (l) => l.updatedAt),
    },
    dropped:
      rawTasks.length -
      tasks.length +
      (rawCaptures.length - captures.length) +
      (rawSessions.length - sessions.length) +
      highlights.dropped +
      commitments.dropped +
      completions.dropped +
      logs.dropped,
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
  return current;
}

export function createEnvelope(data: PersistedData): StorageEnvelope {
  return { schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), data };
}
