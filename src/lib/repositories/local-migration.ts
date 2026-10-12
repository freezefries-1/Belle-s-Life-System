import type { SupabaseClient } from "@supabase/supabase-js";

import { listKeys, readRaw, removeRaw, writeRaw } from "@/lib/storage/local-storage";
import { STORAGE_KEY, parseEnvelope, type ParseResult } from "@/lib/storage/schema";
import type { PersistedData } from "@/types";
import { TABLE_ORDER, type AnyRow, type TableName } from "@/types/database";

import { dataToRows, stripManaged, type RowSet } from "./mappers";

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
};

/** Tables where one record per day/week is allowed, so a different id can still be a duplicate. */
const DATE_KEYS: Partial<Record<TableName, string>> = {
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
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { error: "The data saved in this browser isn’t readable JSON, so it can’t be imported. Download it to keep a copy." };
  }
  const parsed = parseEnvelope(json);
  if (!parsed) return { error: "The data saved in this browser is in an unknown format, so it can’t be imported. Download it to keep a copy." };
  const env = json as { schemaVersion?: number; savedAt?: string; data?: Record<string, unknown> };
  return {
    raw,
    parsed,
    rows: dataToRows(parsed.data),
    schemaVersion: env.schemaVersion ?? 0,
    savedAt: env.savedAt ?? null,
    invalid: parsed.dropped,
    missingReferences: findMissingReferences(env.data ?? {}, parsed.data),
  };
}

function findMissingReferences(raw: Record<string, unknown>, clean: PersistedData) {
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
  count("Milestone → missing project (skipped)", list("milestones").length - clean.milestones.length);
  count("Commitment history → missing commitment (skipped)", list("commitmentCompletions").length - clean.commitmentCompletions.length);
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

async function existingIds(client: SupabaseClient, table: TableName, ids: string[]) {
  const found = new Set<string>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await client.from(table).select("id").in("id", ids.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
    for (const r of data as { id: string }[]) found.add(r.id);
  }
  return found;
}

export async function previewImport(client: SupabaseClient, rows: RowSet): Promise<PreviewRow[]> {
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
  client: SupabaseClient,
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
      const r = data as TableImportResult;
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

export async function verifyImport(client: SupabaseClient, rows: RowSet, preview: PreviewRow[], result: ImportResult): Promise<VerifyResult> {
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
