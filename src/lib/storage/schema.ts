import type {
  Capture,
  CaptureKind,
  CaptureStatus,
  PersistedData,
  SprintId,
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
export const SCHEMA_VERSION = 1;

export interface StorageEnvelope {
  schemaVersion: number;
  savedAt: string;
  data: PersistedData;
}

export const EMPTY_DATA: PersistedData = { tasks: [], captures: [] };

const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "completed", "skipped"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const SPRINT_IDS: SprintId[] = ["urgent", "deadlines", "admin", "build"];
const CAPTURE_KINDS: CaptureKind[] = ["task", "idea", "reminder", "note"];
const CAPTURE_STATUSES: CaptureStatus[] = ["inbox", "converted"];

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
  };
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
}

/** Validate a stored envelope. Returns null when the whole thing is unreadable. */
export function parseEnvelope(raw: unknown): ParseResult | null {
  if (!isObj(raw) || typeof raw.schemaVersion !== "number" || !isObj(raw.data)) return null;
  const migrated = migrate(raw.schemaVersion, raw.data);
  if (!migrated) return null;

  const rawTasks = Array.isArray(migrated.tasks) ? migrated.tasks : [];
  const rawCaptures = Array.isArray(migrated.captures) ? migrated.captures : [];
  const tasks = dedupeById(rawTasks.map(parseTask).filter((t): t is Task => t !== null));
  const captures = dedupeById(rawCaptures.map(parseCapture).filter((c): c is Capture => c !== null));

  return {
    data: { tasks, captures },
    dropped: rawTasks.length - tasks.length + (rawCaptures.length - captures.length),
  };
}

/** Upgrade older schema versions in place. Add steps here as the schema evolves. */
function migrate(version: number, data: Obj): Obj | null {
  if (version > SCHEMA_VERSION) return null; // Written by a newer app version — don't guess.
  return data;
}

export function createEnvelope(data: PersistedData): StorageEnvelope {
  return { schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), data };
}
