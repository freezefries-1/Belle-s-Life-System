import type { SupabaseClient } from "@supabase/supabase-js";

import type { PersistedData } from "@/types";
import { TABLE_ORDER, type AnyRow, type TableName, type TombstoneRow } from "@/types/database";

import { dataToRows, emptyRowSet, rowsToData, sameRow, stripManaged, type RowSet } from "./mappers";

/**
 * Cloud sync for the workspace.
 *
 * The app keeps working on an in-memory copy of the user's data (so every
 * existing feature and calculation is unchanged). This engine:
 *
 * - loads everything once at sign-in (paged), then only fetches what
 *   changed (`synced_at` + tombstones) when the tab regains focus, comes
 *   back online, or every 30 s while visible;
 * - turns each local change into row-level upserts/deletes and sends them
 *   through `apply_changes` — one database transaction per batch;
 * - sends the version each change was based on, so a stale device can
 *   never silently overwrite a newer edit (conflicts are reported);
 * - never reports a change as saved until the server confirms it, and
 *   keeps failed changes for an explicit retry.
 */

export type SyncState = "synced" | "saving" | "offline" | "error" | "conflict";

export interface SyncConflict {
  table: TableName;
  id: string;
  reason: "changed" | "deleted" | "duplicate";
  /** The newer server copy (null when deleted / unknown). */
  server: (AnyRow & { version?: number }) | null;
}

export interface SyncStatus {
  state: SyncState;
  /** Changes not yet confirmed by the server. */
  pending: number;
  message: string | null;
  conflicts: SyncConflict[];
  lastSyncedAt: string | null;
}

type Op = {
  table: TableName;
  op: "upsert" | "delete";
  id: string;
  row?: AnyRow;
  if_exists?: "ignore";
};

type ApplyResult =
  | { ok: true; results: { table: TableName; id: string; version: number | null; adopted?: AnyRow & { version: number } }[]; synced_at: string }
  | { ok: false; conflicts: SyncConflict[] };

const PAGE = 1000;
const OVERLAP_MS = 10_000; // re-read a little before the cursor so late commits aren't missed
const POLL_MS = 30_000;
const key = (table: TableName, id: string) => `${table}\u0000${id}`;

export class NetworkError extends Error {}
export class AuthExpiredError extends Error {}

export class CloudSync {
  private server: RowSet = emptyRowSet(); // last confirmed server rows
  private versions = new Map<string, number>();
  private queue: Op[][] = [];
  private flushing = false;
  private pulling = false;
  private disposed = false;
  private cursor: string | null = null;
  private localEpoch = 0; // bumps on every local change; a pull started earlier is discarded
  private status: SyncStatus = { state: "synced", pending: 0, message: null, conflicts: [], lastSyncedAt: null };
  private listeners = new Set<(s: SyncStatus) => void>();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private retryDelay = 4000;
  private blockedOps: Op[] = [];
  /** Server copies were adopted locally; refresh the app once everything is saved. */
  private needsRefresh = false;

  /** Called with fresh data when changes arrive from another device. */
  onRemoteData: ((data: PersistedData) => void) | null = null;

  constructor(
    private readonly client: SupabaseClient,
    readonly userId: string,
  ) {}

  /* ---------------- status ---------------- */

  getStatus = () => this.status;

  subscribe = (listener: (s: SyncStatus) => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private setStatus(patch: Partial<SyncStatus>) {
    this.status = { ...this.status, ...patch, pending: this.pendingCount() };
    this.listeners.forEach((l) => l(this.status));
  }

  private pendingCount() {
    return this.queue.reduce((n, b) => n + b.length, 0) + this.blockedOps.length;
  }

  hasUnsavedChanges = () => this.pendingCount() > 0 || this.flushing;

  /* ---------------- loading ---------------- */

  /** Full, paged load of every table. Throws NetworkError / Error so the UI can offer a retry. */
  async loadAll(): Promise<PersistedData> {
    const rows = emptyRowSet();
    const started = new Date().toISOString();
    await Promise.all(
      TABLE_ORDER.map(async (table) => {
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await this.client.from(table).select("*").order("id").range(from, from + PAGE - 1);
          if (error) throw toError(error);
          for (const r of data as AnyRow[]) (rows[table] as Map<string, AnyRow>).set(r.id, r);
          if (data.length < PAGE) break;
        }
      }),
    );
    this.server = rows;
    this.versions.clear();
    for (const table of TABLE_ORDER) for (const r of rows[table].values()) this.versions.set(key(table, r.id), r.version ?? 1);
    this.cursor = started;
    this.setStatus({ state: "synced", lastSyncedAt: new Date().toISOString(), message: null, conflicts: [] });
    return rowsToData(rows);
  }

  /* ---------------- pushing local changes ---------------- */

  /** Queue the difference between two versions of the local data. */
  push(prev: PersistedData, next: PersistedData) {
    if (this.disposed) return;
    this.localEpoch++;
    const ops = diff(dataToRows(prev), dataToRows(next));
    if (!ops.length) return;
    this.queue.push(ops);
    this.setStatus({});
    void this.flush();
  }

  private async flush(): Promise<void> {
    if (this.flushing || this.disposed) return;
    if (this.status.state === "conflict" || this.status.state === "error") return;
    if (!this.queue.length) return;
    this.flushing = true;
    // Coalesce everything waiting into one ordered batch (last change per row wins).
    const batch = coalesce(this.queue.splice(0));
    this.setStatus({ state: "saving", message: null });
    try {
      const payload = batch
        .map((op) => ({ ...op, row: op.row ? stripManaged(op.row) : undefined, expected_version: this.versions.get(key(op.table, op.id)) ?? null }))
        // Deleting something the server never had needs no request.
        .filter((op) => !(op.op === "delete" && op.expected_version === null));
      if (payload.length) {
        const { data, error } = await this.client.rpc("apply_changes", { changes: payload });
        if (error) throw toError(error);
        const result = data as ApplyResult;
        if (!result.ok) {
          this.handleConflicts(batch, result.conflicts);
          return;
        }
        for (const r of result.results) this.confirm(r.table, r.id, r.version, batch, r.adopted);
        if (result.results.some((r) => r.adopted)) this.needsRefresh = true;
      }
      this.retryDelay = 4000;
      this.setStatus({ state: "synced", lastSyncedAt: new Date().toISOString(), message: null });
    } catch (e) {
      // Put the batch back at the front: nothing is reported as saved.
      this.queue.unshift(batch);
      if (e instanceof AuthExpiredError) {
        // Try once to refresh the session; if that fails, sign-in is needed (handled by the auth listener).
        const { error } = await this.client.auth.refreshSession();
        this.flushing = false;
        if (!error) return this.flush();
        this.setStatus({ state: "error", message: "Your session has expired. Sign in again to save changes." });
        return;
      }
      const offline = e instanceof NetworkError || (typeof navigator !== "undefined" && !navigator.onLine);
      this.setStatus({
        state: offline ? "offline" : "error",
        message: offline ? "Unable to save changes. Check your connection and try again." : `Unable to save changes. ${(e as Error).message}`,
      });
      if (offline) this.scheduleRetry();
    } finally {
      this.flushing = false;
    }
    if (this.queue.length && this.status.state === "synced") return this.flush();
    if (!this.queue.length && this.needsRefresh && this.status.state === "synced") {
      this.needsRefresh = false;
      await this.pull(true, true);
    }
  }

  private confirm(table: TableName, id: string, version: number | null, batch: Op[], adopted?: AnyRow & { version: number }) {
    const k = key(table, id);
    const map = this.server[table] as Map<string, AnyRow>;
    if (version === null) {
      this.versions.delete(k);
      map.delete(id);
      return;
    }
    this.versions.set(k, version);
    const sent = adopted ?? batch.find((op) => op.table === table && op.id === id)?.row;
    if (sent) map.set(id, { ...sent, version } as AnyRow);
  }

  private scheduleRetry() {
    if (this.retryTimer || this.disposed) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.retry();
    }, this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, 60_000);
  }

  /** Try failed changes again (button, coming back online, timer). */
  async retry() {
    if (this.status.state === "offline" || this.status.state === "error") this.setStatus({ state: "synced", message: null });
    await this.flush();
  }

  /* ---------------- conflicts ---------------- */

  private handleConflicts(batch: Op[], conflicts: SyncConflict[]) {
    // Some conflicts are routine and safe to settle automatically:
    // another device already created today's (empty) Kaizen Log, or moved
    // a recurring template's "generated through" date. Take theirs.
    const auto = conflicts.every((c) => this.isRoutine(c, batch));
    if (auto) {
      for (const c of conflicts) this.adoptServer(c);
      const conflicted = new Set(conflicts.map((c) => key(c.table, c.id)));
      const rest = batch.filter((op) => !conflicted.has(key(op.table, op.id)));
      if (rest.length) this.queue.unshift(rest);
      this.needsRefresh = true;
      this.setStatus({ state: "synced" });
      setTimeout(() => void this.flushOrRefresh(), 0);
      return;
    }
    this.blockedOps = batch;
    this.setStatus({
      state: "conflict",
      conflicts,
      message: "Some of your changes clash with newer changes from another device.",
    });
  }

  private async flushOrRefresh() {
    if (this.queue.length) return this.flush();
    if (this.needsRefresh) {
      this.needsRefresh = false;
      await this.pull(true, true);
    }
  }

  private isRoutine(c: SyncConflict, batch: Op[]) {
    const op = batch.find((o) => o.table === c.table && o.id === c.id);
    if (!op?.row) return false;
    if (c.table === "kaizen_logs") {
      const r = op.row as { reflection_went_well: string; reflection_improve: string; reflection_learned: string; notes: string };
      return !r.reflection_went_well && !r.reflection_improve && !r.reflection_learned && !r.notes;
    }
    if (c.table === "recurrence_templates" && c.reason === "changed") {
      const before = this.server.recurrence_templates.get(c.id);
      if (!before) return false;
      const { generated_through: _a, updated_at: _b, ...x } = stripManaged(before);
      const { generated_through: _c, updated_at: _d, ...y } = stripManaged(op.row as typeof before);
      void _a;
      void _b;
      void _c;
      void _d;
      return JSON.stringify(x) === JSON.stringify(y);
    }
    if (c.table === "tasks" && c.reason === "duplicate") return !!(op.row as { recurrence_template_id: string | null }).recurrence_template_id;
    return false;
  }

  private adoptServer(c: SyncConflict) {
    const map = this.server[c.table] as Map<string, AnyRow>;
    const k = key(c.table, c.id);
    if (c.server && c.server.version) {
      map.set(c.id, c.server);
      this.versions.set(k, c.server.version);
    } else {
      map.delete(c.id);
      this.versions.delete(k);
    }
  }

  /**
   * Resolve a conflict.
   * - "theirs": keep the newer server copies of the clashing records; your
   *   other changes are still saved. The workspace then reloads.
   * - "mine": save your version over the newer one (it was shown first).
   */
  async resolve(choice: "theirs" | "mine") {
    const conflicts = this.status.conflicts;
    const batch = this.blockedOps;
    this.blockedOps = [];
    const conflicted = new Set(conflicts.map((c) => key(c.table, c.id)));
    if (choice === "theirs") {
      for (const c of conflicts) this.adoptServer(c);
      const rest = batch.filter((op) => !conflicted.has(key(op.table, op.id)));
      if (rest.length) this.queue.unshift(rest);
    } else {
      for (const c of conflicts) {
        const k = key(c.table, c.id);
        if (c.reason === "deleted") this.versions.delete(k); // re-create it
        else if (c.server?.version) this.versions.set(k, c.server.version);
      }
      // A same-day duplicate can't be forced; keep the server's for those.
      const dupes = conflicts.filter((c) => c.reason === "duplicate");
      const dupeKeys = new Set(dupes.map((c) => key(c.table, c.id)));
      const keep = batch.filter((op) => !dupeKeys.has(key(op.table, op.id)));
      if (keep.length) this.queue.unshift(keep);
    }
    this.setStatus({ state: "synced", conflicts: [], message: null });
    await this.flush();
    if (this.status.state === "synced") await this.reload();
  }

  /** Throw away unsaved changes and load the latest from the server. */
  async discardAndReload() {
    this.queue = [];
    this.blockedOps = [];
    this.setStatus({ state: "synced", conflicts: [], message: null });
    await this.reload();
  }

  private async reload() {
    const data = await this.loadAll();
    this.onRemoteData?.(data);
  }

  /** Reload everything from the server (e.g. after importing data). Refuses while changes are unsaved. */
  async refreshAll() {
    if (this.hasUnsavedChanges()) throw new Error("Some changes are still saving. Try again in a moment.");
    await this.reload();
  }

  /* ---------------- pulling remote changes ---------------- */

  /** Fetch rows changed since the last sync and merge them in (only when nothing local is unsaved). */
  async pull(force = false, emitAlways = false): Promise<void> {
    if (this.disposed || this.pulling || !this.cursor) return;
    if (this.hasUnsavedChanges() || this.status.state === "conflict") return;
    if (!force && typeof document !== "undefined" && document.visibilityState !== "visible") return;
    this.pulling = true;
    const epoch = this.localEpoch;
    const since = new Date(Date.parse(this.cursor) - OVERLAP_MS).toISOString();
    const started = new Date().toISOString();
    try {
      const changed = await Promise.all(
        TABLE_ORDER.map(async (table) => {
          const out: AnyRow[] = [];
          for (let from = 0; ; from += PAGE) {
            const { data, error } = await this.client.from(table).select("*").gt("synced_at", since).order("id").range(from, from + PAGE - 1);
            if (error) throw toError(error);
            out.push(...(data as AnyRow[]));
            if (data.length < PAGE) break;
          }
          return [table, out] as const;
        }),
      );
      const { data: tombs, error } = await this.client.from("sync_tombstones").select("table_name, id, deleted_at").gt("deleted_at", since);
      if (error) throw toError(error);
      // A local change happened meanwhile: drop this pull; the next one catches up.
      if (epoch !== this.localEpoch || this.hasUnsavedChanges()) return;

      let touched = false;
      for (const [table, rows] of changed) {
        const map = this.server[table] as Map<string, AnyRow>;
        for (const r of rows) {
          const k = key(table, r.id);
          if ((this.versions.get(k) ?? 0) >= (r.version ?? 1) && map.has(r.id)) continue;
          map.set(r.id, r);
          this.versions.set(k, r.version ?? 1);
          touched = true;
        }
      }
      for (const t of tombs as TombstoneRow[]) {
        const map = this.server[t.table_name] as Map<string, AnyRow> | undefined;
        const row = map?.get(t.id);
        if (!map || !row || (row.synced_at && row.synced_at > t.deleted_at)) continue;
        map.delete(t.id);
        this.versions.delete(key(t.table_name, t.id));
        touched = true;
      }
      this.cursor = started;
      this.setStatus({ lastSyncedAt: new Date().toISOString(), ...(this.status.state === "offline" ? { state: "synced", message: null } : {}) });
      if (touched || emitAlways) this.onRemoteData?.(rowsToData(this.server));
    } catch {
      // Quietly try again later; pulling never loses anything.
    } finally {
      this.pulling = false;
    }
  }

  /** Start background catch-up: focus, visibility, back online, and a gentle poll. */
  start() {
    if (typeof window === "undefined") return;
    window.addEventListener("focus", this.onWake);
    window.addEventListener("online", this.onOnline);
    document.addEventListener("visibilitychange", this.onWake);
    this.pollTimer = setInterval(() => void this.pull(), POLL_MS);
  }

  private onWake = () => {
    if (document.visibilityState === "visible") void this.pull();
  };

  private onOnline = () => {
    void this.retry().then(() => this.pull());
  };

  dispose() {
    this.disposed = true;
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", this.onWake);
      window.removeEventListener("online", this.onOnline);
      document.removeEventListener("visibilitychange", this.onWake);
    }
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.listeners.clear();
    this.onRemoteData = null;
  }
}

/* ---------------- helpers ---------------- */

/** Row-level differences between two snapshots, in a safe order (deletes children-first, upserts parents-first). */
export function diff(before: RowSet, after: RowSet): Op[] {
  const deletes: Op[] = [];
  const upserts: Op[] = [];
  for (const table of TABLE_ORDER) {
    const a = before[table] as Map<string, AnyRow>;
    const b = after[table] as Map<string, AnyRow>;
    for (const [id, row] of b) {
      if (sameRow(a.get(id), row)) continue;
      const op: Op = { table, op: "upsert", id, row };
      // Recurring occurrences are deterministic: if another device made it first, keep theirs.
      if (table === "tasks" && !a.has(id) && (row as { recurrence_template_id: string | null }).recurrence_template_id) op.if_exists = "ignore";
      upserts.push(op);
    }
    for (const id of a.keys()) if (!b.has(id)) deletes.push({ table, op: "delete", id });
  }
  return [...orderDeletes(deletes), ...upserts];
}

function orderDeletes(ops: Op[]) {
  return [...ops].sort((x, y) => TABLE_ORDER.indexOf(y.table) - TABLE_ORDER.indexOf(x.table));
}

/** Merge queued batches: the last change per row wins, then re-order safely. */
function coalesce(batches: Op[][]): Op[] {
  const last = new Map<string, Op>();
  for (const batch of batches) for (const op of batch) last.set(key(op.table, op.id), op);
  const ops = [...last.values()];
  const deletes = orderDeletes(ops.filter((o) => o.op === "delete"));
  const upserts = ops.filter((o) => o.op === "upsert").sort((x, y) => TABLE_ORDER.indexOf(x.table) - TABLE_ORDER.indexOf(y.table));
  return [...deletes, ...upserts];
}

function toError(error: { message?: string; code?: string; details?: string | null }): Error {
  const msg = error.message ?? "Request failed";
  if (error.code === "PGRST301" || error.code === "PGRST303" || /JWT expired|invalid JWT/i.test(msg)) return new AuthExpiredError(msg);
  if (/fetch|network|Failed to fetch|NetworkError|Load failed/i.test(msg) || error.code === "" || error.code === undefined) {
    return new NetworkError(msg);
  }
  return new Error(msg);
}
