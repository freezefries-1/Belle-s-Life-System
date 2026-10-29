import type { AppSupabaseClient } from "@/lib/supabase/client";

import { listKeys, readRaw, removeRaw, writeRaw } from "@/lib/storage/local-storage";
import { STORAGE_KEY, parseEnvelope, type ParseResult } from "@/lib/storage/schema";
import { TABLE_ORDER, type AnyRow, type TableName } from "@/types/database";

import { dataToRows, emptyRowSet, stripManaged, type RowSet } from "./mappers";

/**
 * Moving browser-only data into the signed-in account. Read-only until the
 * person confirms; the import only ever inserts (never overwrites cloud
 * records), is safe to retry, and the original local data is kept.
 */

export const MIGRATION_MARKER_KEY = `${STORAGE_KEY}:migration`;
const CHUNK = 200;

export const TABLE_LABELS: Record<TableName, string> = {
  projects: "Projects",
  project_milestones: "Milestones",
  recurrence_templates: "Recurring tasks",
  brain_dump_entries: "Brain Dump entries",
  tasks: "Tasks",
  sprint_sessions: "Focus sessions",
  sprint_session_tasks: "Session task links",
  micro_commitments: "Micro-commitments",
  micro_commitment_completions: "Commitment history",
  daily_highlights: "Daily Highlights",
  kaizen_logs: "Kaizen Logs",
  weekly_reviews: "Weekly reviews",
  weekly_priorities: "Weekly priorities",
  students: "Students",
  student_stages: "Student stages",
  student_lessons: "Lesson notes",
};

/** Tables where one record per day/week is allowed, so a different id can still be a duplicate. */
export const DATE_KEYS: Partial<Record<TableName, string>> = {
  daily_highlights: "date_key",
  kaizen_logs: "date_key",
  weekly_reviews: "week_start_date",
};

export interface LocalSnapshot {
  raw: string;
  parsed: ParseResult;
  rows: RowSet;
  schemaVersion: number;
  savedAt: string | null;
  /** Records the validator couldn't read (skipped). */
  invalid: number;
  /** Links to records that don't exist (cleared before import; the records themselves are kept). */
  missingReferences: { label: string; count: number }[];
}

/** Read the browser's saved data without changing anything. */
export function readLocalSnapshot(): LocalSnapshot | { error: string } | null {
  const raw = readRaw(STORAGE_KEY);
  if (raw === null) return null;
  return snapshotFromText(raw, {
    notJson: "The data saved in this browser isn’t readable JSON, so it can’t be imported. Download it to keep a copy.",
    unknown: "The data saved in this browser is in an unknown format, so it can’t be imported. Download it to keep a copy.",
  });
}

/** Validate a saved envelope (the browser copy, or a downloaded backup file). Read-only. */
export function snapshotFromText(raw: string, errors: { notJson: string; unknown: string }): LocalSnapshot | { error: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { error: errors.notJson };
  }
  const parsed = parseEnvelope(json);
  if (!parsed) return { error: errors.unknown };
  const env = json as { schemaVersion?: number; savedAt?: string; data?: Record<string, unknown> };
  return {
    raw,
    parsed,
    rows: dataToRows(parsed.data),
    schemaVersion: env.schemaVersion ?? 0,
    savedAt: env.savedAt ?? null,
    invalid: parsed.unreadable,
    missingReferences: findMissingReferences(env.data ?? {}, parsed),
  };
}

function findMissingReferences(raw: Record<string, unknown>, { data: clean, removed }: ParseResult) {
  const list = (k: string) => (Array.isArray(raw[k]) ? (raw[k] as Record<string, unknown>[]) : []);
  const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));
  const tasks = byId(clean.tasks);
  const out: { label: string; count: number }[] = [];
  const count = (label: string, n: number) => n > 0 && out.push({ label, count: n });

  const rawTasks = list("tasks");
  count("Task → project", rawTasks.filter((t) => typeof t.projectId === "string" && tasks.get(t.id as string)?.projectId === null).length);
  count("Task → milestone", rawTasks.filter((t) => typeof t.milestoneId === "string" && tasks.get(t.id as string)?.milestoneId === null).length);
  count(
    "Task → recurring template",
    rawTasks.filter((t) => typeof t.recurrenceTemplateId === "string" && tasks.get(t.id as string)?.recurrenceTemplateId === null).length,
  );
  count("Daily Highlight → deleted task (title kept)", clean.highlights.filter((h) => !tasks.has(h.taskId)).length);
  count("Weekly priority → deleted task or project (title kept)", list("weeklyPriorities").filter((p) => {
    const c = clean.weeklyPriorities.find((x) => x.id === p.id);
    return !!c && ((typeof p.taskId === "string" && c.taskId === null) || (typeof p.projectId === "string" && c.projectId === null));
  }).length);
  count("Milestone → missing project (skipped)", removed.milestones);
  count("Commitment history → missing commitment (skipped)", removed.completions);
  count("Weekly priority → missing review, or more than three (skipped)", removed.priorities);
  count("Repeated records — same id, or a second one for the same day or week (skipped)", removed.duplicates);
  return out;
}

export function countRows(rows: RowSet) {
  return Object.fromEntries(TABLE_ORDER.map((t) => [t, rows[t].size])) as Record<TableName, number>;
}

/* ---------------- preview ---------------- */

export interface PreviewRow {
  table: TableName;
  local: number;
  /** Same id already in the cloud: the cloud copy is kept. */
  sameId: number;
  /** Different id but the same day/week already in the cloud. */
  sameDay: number;
  toImport: number;
  cloudTotal: number;
}

export async function existingIds(client: AppSupabaseClient, table: TableName, ids: string[]) {
  const found = new Set<string>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await client.from(table).select("id").in("id", ids.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
    for (const r of data as { id: string }[]) found.add(r.id);
  }
  return found;
}

export async function previewImport(client: AppSupabaseClient, rows: RowSet): Promise<PreviewRow[]> {
  return Promise.all(
    TABLE_ORDER.map(async (table) => {
      const local = [...rows[table].values()] as AnyRow[];
      const { count, error } = await client.from(table).select("id", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      const ids = await existingIds(client, table, local.map((r) => r.id));
      let sameDay = 0;
      const dateCol = DATE_KEYS[table];
      if (dateCol) {
        const dates = [...new Set(local.filter((r) => !ids.has(r.id)).map((r) => (r as unknown as Record<string, string>)[dateCol]))];
        if (dates.length) {
          const { data, error: e2 } = await client.from(table).select(`id, ${dateCol}`).in(dateCol, dates);
          if (e2) throw new Error(e2.message);
          const cloudDates = new Set((data as unknown as Record<string, string>[]).map((r) => r[dateCol]));
          sameDay = local.filter((r) => !ids.has(r.id) && cloudDates.has((r as unknown as Record<string, string>)[dateCol])).length;
        }
      }
      return { table, local: local.length, sameId: ids.size, sameDay, toImport: local.length - ids.size - sameDay, cloudTotal: count ?? 0 };
    }),
  );
}

/* ---------------- import ---------------- */

export interface TableImportResult {
  inserted: number;
  existing: number;
  filled: number;
  skipped: { id: string; reason: string }[];
}

export type ImportResult = Record<TableName, TableImportResult>;

/**
 * Insert-only, idempotent import in dependency order. Brain Dump entries
 * go in first without their converted-task link (tasks don't exist yet),
 * and the links are filled in at the end. Safe to run again after a failure.
 */
export async function runImport(
  client: AppSupabaseClient,
  userId: string,
  rows: RowSet,
  onProgress: (done: number, total: number, table: TableName) => void,
): Promise<ImportResult> {
  const result = Object.fromEntries(TABLE_ORDER.map((t) => [t, { inserted: 0, existing: 0, filled: 0, skipped: [] }])) as unknown as ImportResult;
  const captures = [...rows.brain_dump_entries.values()];
  const linkPass = captures.filter((c) => c.converted_task_id);
  const total = TABLE_ORDER.reduce((n, t) => n + rows[t].size, 0) + linkPass.length;
  let done = 0;

  const send = async (table: TableName, list: AnyRow[], tally: boolean) => {
    for (let i = 0; i < list.length; i += CHUNK) {
      const chunk = list.slice(i, i + CHUNK).map((r) => stripManaged(r));
      const { data, error } = await client.rpc("import_rows", { target: table, rows: chunk, p_user: userId });
      if (error) throw new Error(`${TABLE_LABELS[table]}: ${error.message}`);
      const r = data as unknown as TableImportResult;
      if (tally) {
        result[table].inserted += r.inserted;
        result[table].existing += r.existing;
        result[table].filled += r.filled;
        result[table].skipped.push(...r.skipped);
      }
      done += chunk.length;
      onProgress(done, total, table);
    }
  };

  for (const table of TABLE_ORDER) {
    const list = table === "brain_dump_entries" ? captures.map((c) => ({ ...c, converted_task_id: null })) : ([...rows[table].values()] as AnyRow[]);
    await send(table, list, true);
  }
  await send("brain_dump_entries", linkPass, false);
  return result;
}

/* ---------------- test import ---------------- */

/**
 * A handful of real records that between them use every kind of link the
 * full import has to get right, plus everything they depend on (a task's
 * project, milestone, recurring template and Brain Dump entry; a highlight's
 * task; and so on), so nothing in the sample is missing its parent.
 */
export function pickSample(rows: RowSet): RowSet {
  const out = emptyRowSet();
  const tasks = [...rows.tasks.values()];
  const firstWhere = <T>(xs: T[], test: (x: T) => boolean) => xs.find(test);
  const addProject = (id: string | null | undefined) => {
    const p = id ? rows.projects.get(id) : undefined;
    if (p) out.projects.set(p.id, p);
  };
  const addTemplate = (id: string | null | undefined) => {
    const r = id ? rows.recurrence_templates.get(id) : undefined;
    if (!r) return;
    out.recurrence_templates.set(r.id, r);
    addProject(r.project_id);
  };
  const addCapture = (id: string | null | undefined) => {
    const c = id ? rows.brain_dump_entries.get(id) : undefined;
    if (!c || out.brain_dump_entries.has(c.id)) return;
    out.brain_dump_entries.set(c.id, c);
    addTask(c.converted_task_id);
  };
  const addTask = (id: string | null | undefined) => {
    const t = id ? rows.tasks.get(id) : undefined;
    if (!t || out.tasks.has(t.id)) return;
    out.tasks.set(t.id, t);
    addProject(t.project_id);
    const m = t.milestone_id ? rows.project_milestones.get(t.milestone_id) : undefined;
    if (m) {
      out.project_milestones.set(m.id, m);
      addProject(m.project_id);
    }
    addTemplate(t.recurrence_template_id);
    addCapture(t.source_capture_id);
  };

  // Seeds: one record for each relationship the import must preserve.
  addTask(firstWhere(tasks, (t) => !!t.project_id && !!t.milestone_id)?.id ?? firstWhere(tasks, (t) => !!t.project_id)?.id);
  addTask(firstWhere(tasks, (t) => t.status === "completed" && !!t.completed_at)?.id);
  addTask(firstWhere(tasks, (t) => !!t.sprint)?.id);
  addTask(firstWhere(tasks, (t) => !!t.recurrence_template_id)?.id);
  addCapture(firstWhere([...rows.brain_dump_entries.values()], (c) => !!c.converted_task_id)?.id);
  if (out.recurrence_templates.size === 0) addTemplate([...rows.recurrence_templates.keys()][0]);
  const highlight = firstWhere([...rows.daily_highlights.values()], (h) => !!h.task_id && rows.tasks.has(h.task_id));
  if (highlight) {
    out.daily_highlights.set(highlight.id, highlight);
    addTask(highlight.task_id);
  }
  const completions = [...rows.micro_commitment_completions.values()];
  const commitment = completions[0] ? rows.micro_commitments.get(completions[0].commitment_id) : [...rows.micro_commitments.values()][0];
  if (commitment) {
    out.micro_commitments.set(commitment.id, commitment);
    completions.filter((c) => c.commitment_id === commitment.id).slice(0, 3).forEach((c) => out.micro_commitment_completions.set(c.id, c));
  }
  const priorities = [...rows.weekly_priorities.values()];
  const priority = firstWhere(priorities, (p) => !!p.task_id || !!p.project_id) ?? priorities[0];
  const review = priority ? rows.weekly_reviews.get(priority.weekly_review_id) : undefined;
  if (priority && review) {
    out.weekly_reviews.set(review.id, review);
    out.weekly_priorities.set(priority.id, priority);
    addTask(priority.task_id);
    addProject(priority.project_id);
  }
  if (out.projects.size === 0) addProject([...rows.projects.keys()][0]);
  return out;
}

export interface SampleCheck {
  label: string;
  /** How many sampled records this check looked at (0 = none of this kind in your data). */
  checked: number;
  /** Records already in the account before the test, which keep the account's version. */
  alreadyThere: number;
  problems: string[];
}

export interface SampleResult {
  ok: boolean;
  imported: number;
  checks: SampleCheck[];
}

/** Ids already in the account, plus — for one-per-day records — rows for a day the account already has. */
async function preexisting(client: AppSupabaseClient, sample: RowSet) {
  const found = {} as Record<TableName, Set<string>>;
  for (const table of TABLE_ORDER) {
    const local = [...sample[table].values()] as AnyRow[];
    found[table] = await existingIds(client, table, local.map((r) => r.id));
    const dateCol = DATE_KEYS[table];
    if (dateCol && local.length) {
      const dates = local.map((r) => (r as unknown as Record<string, string>)[dateCol]);
      const { data, error } = await client.from(table).select(`id, ${dateCol}`).in(dateCol, dates);
      if (error) throw new Error(error.message);
      const cloudDates = new Set((data as unknown as Record<string, string>[]).map((r) => r[dateCol]));
      for (const r of local) if (cloudDates.has((r as unknown as Record<string, string>)[dateCol])) found[table].add(r.id);
    }
  }
  return found;
}

async function fetchRows(client: AppSupabaseClient, table: TableName, ids: string[]) {
  const out = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await client.from(table).select("*").in("id", ids.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
    for (const r of data as unknown as Record<string, unknown>[]) out.set(r.id as string, r);
  }
  return out;
}

const sameTime = (a: unknown, b: unknown) =>
  a === b || (typeof a === "string" && typeof b === "string" && new Date(a).getTime() === new Date(b).getTime());

/**
 * Import the sample (insert-only, like the full import — these are your real
 * records, so they simply stay), then read each one back and compare the
 * links and history the full import depends on.
 */
export async function runSampleImport(client: AppSupabaseClient, userId: string, sample: RowSet): Promise<SampleResult> {
  const before = await preexisting(client, sample);
  const result = await runImport(client, userId, sample, () => {});
  const skippedIds = new Set(TABLE_ORDER.flatMap((t) => result[t].skipped.map((s) => `${t}:${s.id}`)));

  const check = async <T extends TableName>(
    label: string,
    table: T,
    pick: (r: RowSet[T] extends Map<string, infer R> ? R : never) => boolean,
    compare: { col: string; time?: boolean }[],
  ): Promise<SampleCheck> => {
    const local = ([...sample[table].values()] as never[]).filter(pick) as unknown as Record<string, unknown>[];
    const fresh = local.filter((r) => !before[table].has(r.id as string));
    const cloud = await fetchRows(client, table, fresh.map((r) => r.id as string));
    const problems: string[] = [];
    for (const r of fresh) {
      const id = r.id as string;
      const c = cloud.get(id);
      if (skippedIds.has(`${table}:${id}`)) problems.push(`${TABLE_LABELS[table]} ${id} was skipped`);
      else if (!c) problems.push(`${TABLE_LABELS[table]} ${id} isn’t in the account`);
      else
        for (const { col, time } of compare) {
          if (!(time ? sameTime(r[col], c[col]) : r[col] === c[col])) problems.push(`${TABLE_LABELS[table]} ${id}: ${col} differs`);
        }
    }
    return { label, checked: fresh.length, alreadyThere: local.length - fresh.length, problems };
  };

  // Project associations cover the projects themselves as well as their milestones.
  const projects = await check("Projects", "projects", () => true, [{ col: "name" }]);
  const milestones = await check("Project associations", "project_milestones", () => true, [{ col: "project_id" }]);
  const checks = [
    await check("Task relationships", "tasks", () => true, [
      { col: "project_id" },
      { col: "milestone_id" },
      { col: "recurrence_template_id" },
      { col: "source_capture_id" },
    ]),
    {
      ...milestones,
      checked: milestones.checked + projects.checked,
      alreadyThere: milestones.alreadyThere + projects.alreadyThere,
      problems: [...projects.problems, ...milestones.problems],
    },
    await check("Completed task history", "tasks", (t) => t.status === "completed", [{ col: "status" }, { col: "completed_at", time: true }]),
    await check("Sprint assignments", "tasks", (t) => !!t.sprint, [{ col: "sprint" }]),
    await check("Recurring task templates", "recurrence_templates", () => true, [{ col: "frequency" }, { col: "start_date" }, { col: "project_id" }]),
    await check("Micro-commitment history", "micro_commitment_completions", () => true, [{ col: "commitment_id" }, { col: "date_key" }]),
    await check("Daily Highlight links", "daily_highlights", () => true, [{ col: "task_id" }, { col: "date_key" }]),
    await check("Brain Dump → task links", "brain_dump_entries", (c) => !!c.converted_task_id, [{ col: "converted_task_id" }]),
    await check("Weekly priority links", "weekly_priorities", () => true, [{ col: "weekly_review_id" }, { col: "task_id" }, { col: "project_id" }]),
  ];

  const imported = TABLE_ORDER.reduce((n, t) => n + result[t].inserted + result[t].filled, 0);
  return { ok: checks.every((c) => c.problems.length === 0), imported, checks };
}

/* ---------------- verification ---------------- */

export interface VerifyResult {
  /** True only when every local record is in the account and nothing was skipped. */
  ok: boolean;
  /** Records the import had to skip (e.g. their parent wasn't imported). */
  skipped: { table: TableName; id: string; reason: string }[];
  /** Local records not found in the cloud (excluding ones kept from the cloud by date). */
  missing: { table: TableName; id: string }[];
  /** Imported tasks whose project/milestone/template link didn't arrive intact. */
  brokenLinks: number;
}

export async function verifyImport(client: AppSupabaseClient, rows: RowSet, preview: PreviewRow[], result: ImportResult): Promise<VerifyResult> {
  const missing: { table: TableName; id: string }[] = [];
  for (const table of TABLE_ORDER) {
    const ids = [...rows[table].keys()];
    const found = await existingIds(client, table, ids);
    const skipped = new Set(result[table].skipped.map((s) => s.id));
    const dayDupes = preview.find((p) => p.table === table)?.sameDay ?? 0;
    const notFound = ids.filter((id) => !found.has(id) && !skipped.has(id));
    // Records for a day the cloud already had were intentionally kept from the cloud.
    if (notFound.length > dayDupes) for (const id of notFound) missing.push({ table, id });
  }
  let brokenLinks = 0;
  const tasks = [...rows.tasks.values()];
  for (let i = 0; i < tasks.length; i += CHUNK) {
    const ids = tasks.slice(i, i + CHUNK).map((t) => t.id);
    const { data, error } = await client.from("tasks").select("id, project_id, milestone_id, recurrence_template_id, created_at").in("id", ids);
    if (error) throw new Error(error.message);
    for (const c of data as { id: string; project_id: string | null; milestone_id: string | null; recurrence_template_id: string | null }[]) {
      const l = rows.tasks.get(c.id)!;
      if (c.project_id !== l.project_id || c.milestone_id !== l.milestone_id || c.recurrence_template_id !== l.recurrence_template_id) brokenLinks++;
    }
  }
  const skipped = TABLE_ORDER.flatMap((table) => result[table].skipped.map((s) => ({ table, ...s })));
  return { ok: missing.length === 0 && brokenLinks === 0 && skipped.length === 0, skipped, missing, brokenLinks };
}

/* ---------------- after migration ---------------- */

export interface MigrationMarker {
  userId: string;
  completedAt: string;
  imported: number;
}

export function readMarker(): MigrationMarker | null {
  try {
    return JSON.parse(readRaw(MIGRATION_MARKER_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function writeMarker(marker: MigrationMarker) {
  writeRaw(MIGRATION_MARKER_KEY, JSON.stringify(marker));
}

/** Only on explicit request, after a verified migration: remove the browser copy and its backups. */
export function clearLegacyLocalData() {
  removeRaw(STORAGE_KEY);
  for (const k of listKeys(`${STORAGE_KEY}:backup:`)) removeRaw(k);
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
