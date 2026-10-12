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
 *   changed (server `synced_at` + tombstones) when the tab regains focus,
 *   comes back online, or every 30 s while visible;
 * - turns each local change into row-level upserts/deletes and sends them
 *   through `apply_changes` — one database transaction per batch — naming
 *   the account they belong to, so they can never land in another account;
 * - sends the version each change was based on, so a stale device can
 *   never silently overwrite a newer edit (conflicts are reported);
 * - never reports a change as saved until the server confirms it, and keeps
 *   unsaved changes on this device (per account) until they are, so an
 *   expired session or a closed tab doesn't lose them;
 * - settles routine multi-device cases itself (merging same-day logs and
 *   reviews instead of losing text) and asks only when a real choice is needed.
 */

export type SyncState = "synced" | "saving" | "offline" | "error" | "conflict";

export interface SyncConflict {
  table: TableName;
  id: string;
  /**
   * changed / deleted — edited or removed on another device since you loaded it.
   * duplicate — another record already holds that day (or the one open session).
   * rejected — depends on something that no longer exists.
   */
  reason: "changed" | "deleted" | "duplicate" | "rejected";
  /** The server copy involved (null when deleted / unknown). */
  server: (AnyRow & { version?: number }) | null;
  message?: string;
}

export interface SyncStatus {
  state: SyncState;
  /** Changes not yet confirmed by the server. */
  pending: number;
  message: string | null;
  conflicts: SyncConflict[];
  lastSyncedAt: string | null;
}

export type Op = {
  table: TableName;
  op: "upsert" | "delete";
  id: string;
  row?: AnyRow;
  if_exists?: "ignore";
  /** The server version this change was based on, fixed when the change was kept on this device. */
  base?: number | null;
};

type ApplyResult =
  | { ok: true; results: { table: TableName; id: string; version: number | null; adopted?: AnyRow & { version: number } }[]; synced_at: string }
  | { ok: false; conflicts: SyncConflict[] };

const PAGE = 1000;
const OVERLAP_MS = 10_000; // re-read a little before the cursor so late commits aren't missed
const POLL_MS = 30_000;
const PENDING_KEY_PREFIX = "belles-life-system:cloud-pending:";
const key = (table: TableName, id: string) => `${table}\u0000${id}`;

/** Links that make a row depend on another (used to set dependants aside with their parent). */
const PARENT_LINKS: Partial<Record<TableName, { col: string; parent: TableName }[]>> = {
  project_milestones: [{ col: "project_id", parent: "projects" }],
  recurrence_templates: [{ col: "project_id", parent: "projects" }],
  tasks: [
    { col: "project_id", parent: "projects" },
    { col: "milestone_id", parent: "project_milestones" },
    { col: "recurrence_template_id", parent: "recurrence_templates" },
    { col: "source_capture_id", parent: "brain_dump_entries" },
  ],
  brain_dump_entries: [{ col: "converted_task_id", parent: "tasks" }],
  sprint_session_tasks: [
    { col: "session_id", parent: "sprint_sessions" },
    { col: "task_id", parent: "tasks" },
  ],
  micro_commitment_completions: [{ col: "commitment_id", parent: "micro_commitments" }],
  daily_highlights: [{ col: "task_id", parent: "tasks" }],
  weekly_priorities: [
    { col: "weekly_review_id", parent: "weekly_reviews" },
    { col: "task_id", parent: "tasks" },
    { col: "project_id", parent: "projects" },
  ],
};

export class NetworkError extends Error {}
export class AuthExpiredError extends Error {}
export class AccountMismatchError extends Error {}

export class CloudSync {
  private server: RowSet = emptyRowSet(); // last confirmed server rows
  private versions = new Map<string, number>();
  private queue: Op[][] = [];
  private flushing = false;
  private pulling = false;
  private disposed = false;
  /** Latest server time seen (rows or tombstones); null = nothing seen yet. */
  private cursor: string | null = null;
  private loaded = false;
  private localEpoch = 0; // bumps on every local change; a pull/reload started earlier is discarded
  private status: SyncStatus = { state: "synced", pending: 0, message: null, conflicts: [], lastSyncedAt: null };
  private listeners = new Set<(s: SyncStatus) => void>();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private retryDelay = 4000;
  private blockedOps: Op[] = [];
  /** Changes currently being sent (still unsaved until confirmed). */
  private inFlight = 0;
  /** Server copies were adopted locally; refresh the app once everything is saved. */
  private needsRefresh = false;

  /** Called with fresh data when changes arrive from another device. */
  onRemoteData: ((data: PersistedData) => void) | null = null;
  /** Short, friendly notes about things settled automatically (shown as toasts). */
  onNotice: ((message: string) => void) | null = null;

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
    return this.queue.reduce((n, b) => n + b.length, 0) + this.blockedOps.length + this.inFlight;
  }

  hasUnsavedChanges = () => this.pendingCount() > 0 || this.flushing;

  /* ---------------- unsaved changes kept on this device ---------------- */

  private get pendingKey() {
    return PENDING_KEY_PREFIX + this.userId;
  }

  /** Keep unsaved changes (with the versions they were based on) until the server confirms them. */
  private persistPending() {
    if (typeof localStorage === "undefined") return;
    try {
      const ops = [...this.blockedOps, ...this.queue.flat()].map((op) => ({ ...op, base: this.baseFor(op) }));
      if (ops.length) localStorage.setItem(this.pendingKey, JSON.stringify({ savedAt: new Date().toISOString(), ops }));
      else localStorage.removeItem(this.pendingKey);
    } catch {
      // Storage full or blocked: changes still live in memory, and the banner says they're unsaved.
    }
  }

  private readPending(): Op[] {
    if (typeof localStorage === "undefined") return [];
    try {
      const parsed = JSON.parse(localStorage.getItem(this.pendingKey) ?? "null") as { ops?: Op[] } | null;
      return Array.isArray(parsed?.ops) ? parsed.ops.filter((o) => o && TABLE_ORDER.includes(o.table) && typeof o.id === "string") : [];
    } catch {
      return [];
    }
  }

  /** Forget unsaved changes kept on this device (only after the person chose to). */
  discardPending() {
    this.queue = [];
    this.blockedOps = [];
    this.persistPending();
    this.setStatus({});
  }

  private baseFor(op: Op) {
    return op.base !== undefined ? op.base : (this.versions.get(key(op.table, op.id)) ?? null);
  }

  /* ---------------- loading ---------------- */

  /** Full, paged read of every table. Changes nothing locally. */
  private async fetchAll(): Promise<RowSet> {
    const rows = emptyRowSet();
    await Promise.all(
      TABLE_ORDER.map(async (table) => {
        let last = "";
        // Keyset paging (by id) so rows deleted mid-scan can't make another row be skipped.
        for (;;) {
          let q = this.client.from(table).select("*").order("id").limit(PAGE);
          if (last) q = q.gt("id", last);
          const { data, error } = await q;
          if (error) throw toError(error);
          for (const r of data as AnyRow[]) (rows[table] as Map<string, AnyRow>).set(r.id, r);
          if (data.length < PAGE) break;
          last = (data as AnyRow[])[data.length - 1].id;
        }
      }),
    );
    return rows;
  }

  private adoptAll(rows: RowSet) {
    this.server = rows;
    this.versions.clear();
    let newest: string | null = null;
    for (const table of TABLE_ORDER)
      for (const r of rows[table].values()) {
        this.versions.set(key(table, r.id), r.version ?? 1);
        if (r.synced_at && (!newest || r.synced_at > newest)) newest = r.synced_at;
      }
    if (newest && (!this.cursor || newest > this.cursor)) this.cursor = newest;
    this.loaded = true;
  }

  /**
   * Load the account. Any changes still waiting on this device from an
   * earlier visit are re-applied on top and queued to be saved (with the
   * versions they were based on, so stale ones are reported as conflicts).
   */
  async loadAll(): Promise<PersistedData> {
    await this.ensureAccount();
    const rows = await this.fetchAll();
    this.adoptAll(rows);
    const pending = this.readPending();
    if (pending.length) {
      this.queue = [pending];
      this.setStatus({ state: "synced", message: null, conflicts: [] });
      setTimeout(() => void this.flush(), 0);
      return rowsToData(applyOps(this.server, pending));
    }
    this.setStatus({ state: "synced", lastSyncedAt: new Date().toISOString(), message: null, conflicts: [] });
    return rowsToData(rows);
  }

  /** The browser must still be signed in as the account this engine belongs to. */
  private async ensureAccount() {
    const { data } = await this.client.auth.getSession();
    const sessionUser = data.session?.user.id ?? null;
    if (!sessionUser) throw new AuthExpiredError("Not signed in");
    if (sessionUser !== this.userId) throw new AccountMismatchError("Signed in as a different account");
  }

  /* ---------------- pushing local changes ---------------- */

  /** Queue the difference between two versions of the local data. */
  push(prev: PersistedData, next: PersistedData) {
    if (this.disposed) return;
    this.localEpoch++;
    const ops = diff(dataToRows(prev), dataToRows(next));
    if (!ops.length) return;
    this.queue.push(ops);
    this.persistPending();
    this.setStatus({});
    void this.flush();
  }

  private async flush(): Promise<void> {
    if (this.flushing || this.disposed) return;
    this.flushing = true;
    try {
      let refreshedSession = false;
      while (this.queue.length && !this.disposed && this.status.state !== "conflict" && this.status.state !== "error") {
        // Coalesce everything waiting into one ordered batch (last change per row wins).
        const batch = coalesce(this.queue.splice(0));
        this.inFlight = batch.length;
        this.setStatus({ state: "saving", message: null });
        try {
          await this.ensureAccount();
          const payload = batch
            .map((op) => ({ table: op.table, op: op.op, id: op.id, if_exists: op.if_exists, row: op.row ? stripManaged(op.row) : undefined, expected_version: this.baseFor(op) }))
            // Deleting something the server never had needs no request.
            .filter((op) => !(op.op === "delete" && op.expected_version === null));
          if (payload.length) {
            const { data, error } = await this.client.rpc("apply_changes", { changes: payload, p_user: this.userId });
            if (error) throw toError(error);
            const result = data as ApplyResult;
            this.inFlight = 0;
            if (!result.ok) {
              await this.handleConflicts(batch, result.conflicts);
              this.persistPending();
              continue;
            }
            for (const r of result.results) this.confirm(r.table, r.id, r.version, batch, result.synced_at, r.adopted);
            if (result.results.some((r) => r.adopted)) this.needsRefresh = true;
          }
          this.inFlight = 0;
          this.retryDelay = 4000;
          this.persistPending();
          this.setStatus({ state: "synced", lastSyncedAt: new Date().toISOString(), message: null });
        } catch (e) {
          // Put the batch back at the front: nothing is reported as saved, and it stays on this device.
          this.inFlight = 0;
          this.queue.unshift(batch);
          this.persistPending();
          if (e instanceof AuthExpiredError && !refreshedSession) {
            refreshedSession = true;
            const { error } = await this.client.auth.refreshSession();
            if (!error) continue;
          }
          if (e instanceof AuthExpiredError) {
            this.setStatus({
              state: "error",
              message: "Your session has expired. Sign in again — your unsaved changes are kept on this device and will be saved then.",
            });
          } else if (e instanceof AccountMismatchError) {
            this.setStatus({
              state: "error",
              message: "This browser is now signed in to a different account. Reload the page to continue — these changes stay on this device for the original account.",
            });
          } else {
            const offline = e instanceof NetworkError || (typeof navigator !== "undefined" && !navigator.onLine);
            this.setStatus({
              state: offline ? "offline" : "error",
              message: offline ? "Unable to save changes. Check your connection and try again." : `Unable to save changes. ${(e as Error).message}`,
            });
            if (offline) this.scheduleRetry();
          }
        }
      }
    } finally {
      this.flushing = false;
      this.inFlight = 0;
    }
    if (!this.queue.length && this.needsRefresh && this.status.state === "synced") {
      this.needsRefresh = false;
      await this.pull(true, true);
    }
  }

  private confirm(table: TableName, id: string, version: number | null, batch: Op[], syncedAt: string, adopted?: AnyRow & { version: number }) {
    const k = key(table, id);
    const map = this.server[table] as Map<string, AnyRow>;
    if (version === null) {
      this.versions.delete(k);
      map.delete(id);
      return;
    }
    this.versions.set(k, version);
    const sent = adopted ?? batch.find((op) => op.table === table && op.id === id)?.row;
    if (sent) map.set(id, { ...sent, version, synced_at: adopted?.synced_at ?? syncedAt } as AnyRow);
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

  private async handleConflicts(batch: Op[], conflicts: SyncConflict[]) {
    const settled = new Set<string>();
    const extra: Op[] = [];
    let rest = batch;

    for (const c of conflicts) {
      const op = batch.find((o) => o.table === c.table && o.id === c.id);
      const k = key(c.table, c.id);
      // Same-day duplicates: merge or keep the other device's copy, never lose text.
      if (c.reason === "duplicate" && c.server && op?.row) {
        const merged = await this.settleDuplicate(c, op, rest);
        if (merged) {
          settled.add(k);
          rest = merged.rest;
          extra.push(...merged.extra);
          continue;
        }
      }
      if (this.isRoutine(c, op)) {
        this.adoptServer(c);
        settled.add(k);
      }
    }

    if (settled.size === conflicts.length) {
      rest = rest.filter((op) => !settled.has(key(op.table, op.id)));
      const next = [...rest, ...extra];
      if (next.length) this.queue.unshift(next);
      this.needsRefresh = true;
      this.setStatus({ state: "synced" });
      return;
    }
    // A real choice is needed; everything else waits (and stays kept on this device).
    this.blockedOps = rest.filter((op) => !settled.has(key(op.table, op.id))).concat(extra);
    const open = conflicts.filter((c) => !settled.has(key(c.table, c.id)));
    this.setStatus({
      state: "conflict",
      conflicts: open,
      message: open.some((c) => c.reason === "rejected")
        ? "Some changes depend on something that was removed on another device."
        : "Some of your changes clash with newer changes from another device.",
    });
  }

  /**
   * Another device already has a record for that day (or an open focus
   * session). Returns the adjusted batch, or null if it needs a person.
   */
  private async settleDuplicate(c: SyncConflict, op: Op, batch: Op[]): Promise<{ rest: Op[]; extra: Op[] } | null> {
    const server = c.server!;
    const local = op.row as unknown as Record<string, unknown>;
    const theirs = server as unknown as Record<string, unknown>;
    const without = (ops: Op[], k: string) => ops.filter((o) => key(o.table, o.id) !== k);
    this.rememberServerRow(c.table, server);

    if (c.table === "kaizen_logs" || c.table === "weekly_reviews") {
      const fields =
        c.table === "kaizen_logs"
          ? ["reflection_went_well", "reflection_improve", "reflection_learned", "notes"]
          : ["went_well", "challenges", "improvements", "lessons_learned", "next_week_focus"];
      const mergedRow: Record<string, unknown> = { ...stripManaged(server) };
      let changed = false;
      for (const f of fields) {
        const m = mergeText(String(theirs[f] ?? ""), String(local[f] ?? ""));
        if (m !== theirs[f]) changed = true;
        mergedRow[f] = m;
      }
      if (c.table === "weekly_reviews" && local.status === "completed" && theirs.status !== "completed") {
        mergedRow.status = "completed";
        mergedRow.completed_at = local.completed_at;
        changed = true;
      }
      mergedRow.updated_at = new Date().toISOString();
      let rest = without(batch, key(c.table, c.id));
      const extra: Op[] = changed ? [{ table: c.table, op: "upsert", id: server.id, row: mergedRow as unknown as AnyRow, base: server.version ?? 1 }] : [];
      if (c.table === "weekly_reviews") {
        // Move this device's priorities onto the existing review, into any free slots.
        const { data } = await this.client.from("weekly_priorities").select("id, sort_order").eq("weekly_review_id", server.id);
        const used = new Set(((data ?? []) as { sort_order: number }[]).map((p) => p.sort_order));
        const free = [0, 1, 2].filter((n) => !used.has(n));
        const mine = rest.filter((o) => o.table === "weekly_priorities" && o.row && (o.row as unknown as Record<string, unknown>).weekly_review_id === c.id);
        rest = rest.filter((o) => !mine.includes(o));
        mine.forEach((o, i) => {
          if (i < free.length) extra.push({ ...o, row: { ...(o.row as AnyRow), weekly_review_id: server.id, sort_order: free[i] } as AnyRow });
        });
        if (mine.length > free.length) this.notice("Your other device already chose this week’s priorities — kept those.");
      }
      if (changed)
        this.notice(
          c.table === "kaizen_logs"
            ? "Merged today’s Kaizen Log with the one from your other device — nothing was lost."
            : "Merged this weekly review with the one from your other device — nothing was lost.",
        );
      return { rest, extra };
    }

    if (c.table === "daily_highlights") {
      this.notice("Today’s Highlight was already chosen on another device — kept that one.");
      return { rest: without(batch, key(c.table, c.id)), extra: [] };
    }
    if (c.table === "micro_commitment_completions" || c.table === "tasks") {
      return { rest: without(batch, key(c.table, c.id)), extra: [] };
    }
    if (c.table === "sprint_sessions") {
      this.notice("A focus session is already open on another device — kept that one.");
      return { rest: dropWithDependents(batch, new Set([key(c.table, c.id)]), this.versions), extra: [] };
    }
    return null;
  }

  private rememberServerRow(table: TableName, row: AnyRow & { version?: number }) {
    (this.server[table] as Map<string, AnyRow>).set(row.id, row);
    this.versions.set(key(table, row.id), row.version ?? 1);
  }

  private notice(message: string) {
    this.onNotice?.(message);
  }

  private isRoutine(c: SyncConflict, op: Op | undefined) {
    if (!op?.row) return false;
    if (c.table === "kaizen_logs" && c.reason !== "rejected") {
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
    return false;
  }

  private adoptServer(c: SyncConflict) {
    const map = this.server[c.table] as Map<string, AnyRow>;
    const k = key(c.table, c.id);
    if (c.server && c.server.id === c.id && c.server.version) {
      map.set(c.id, c.server);
      this.versions.set(k, c.server.version);
    } else {
      if (c.server) this.rememberServerRow(c.table, c.server);
      map.delete(c.id);
      this.versions.delete(k);
    }
  }

  /**
   * Resolve a conflict.
   * - "theirs": keep the newer server copies of the clashing records (and set
   *   aside anything that depended on a record that can't be saved); your
   *   other changes are still saved. The workspace then reloads.
   * - "mine": save your version over the newer one. Changes that can't be
   *   forced (a second record for the same day, or one that depends on
   *   something removed) are set aside like "theirs".
   */
  async resolve(choice: "theirs" | "mine") {
    const conflicts = this.status.conflicts;
    let batch = this.blockedOps;
    this.blockedOps = [];
    const unforceable = new Set(
      conflicts.filter((c) => choice === "theirs" || c.reason === "duplicate" || c.reason === "rejected").map((c) => key(c.table, c.id)),
    );
    for (const c of conflicts) {
      const k = key(c.table, c.id);
      if (unforceable.has(k)) {
        // A rejected change leaves the server copy as it is; nothing to adopt.
        if (c.reason !== "rejected") this.adoptServer(c);
      } else if (c.reason === "deleted") this.versions.delete(k); // re-create it
      else if (c.server?.version) this.versions.set(k, c.server.version);
    }
    const forced = new Set(conflicts.map((c) => key(c.table, c.id)).filter((k) => !unforceable.has(k)));
    // Forced changes are now based on the server's version.
    batch = batch.map((op) => (forced.has(key(op.table, op.id)) ? { ...op, base: undefined } : op));
    batch = dropWithDependents(batch, unforceable, this.versions);
    if (batch.length) this.queue.unshift(batch);
    this.persistPending();
    this.setStatus({ state: "synced", conflicts: [], message: null });
    await this.flush();
    if (this.status.state === "synced" && !this.hasUnsavedChanges()) await this.reload();
  }

  /** Throw away unsaved changes and load the latest from the server. */
  async discardAndReload() {
    this.discardPending();
    this.setStatus({ state: "synced", conflicts: [], message: null });
    await this.reload();
  }

  private async reload() {
    const epoch = this.localEpoch;
    const rows = await this.fetchAll();
    // A local change happened while loading: keep it; the next pull catches up.
    if (epoch !== this.localEpoch || this.hasUnsavedChanges()) return;
    this.adoptAll(rows);
    this.onRemoteData?.(rowsToData(rows));
  }

  /** Reload everything from the server (e.g. after importing data). Refuses while changes are unsaved. */
  async refreshAll() {
    if (this.hasUnsavedChanges()) throw new Error("Some changes are still saving. Try again in a moment.");
    await this.reload();
  }

  /* ---------------- pulling remote changes ---------------- */

  /** Fetch rows changed since the last sync and merge them in (only when nothing local is unsaved). */
  async pull(force = false, emitAlways = false): Promise<void> {
    if (this.disposed || this.pulling || !this.loaded) return;
    if (this.hasUnsavedChanges() || this.status.state === "conflict") return;
    if (!force && typeof document !== "undefined" && document.visibilityState !== "visible") return;
    this.pulling = true;
    const epoch = this.localEpoch;
    // The cursor is server time (from rows we've seen), so a wrong clock on this device can't hide changes.
    const since = this.cursor ? new Date(Date.parse(this.cursor) - OVERLAP_MS).toISOString() : "1970-01-01T00:00:00Z";
    try {
      const changed = await Promise.all(
        TABLE_ORDER.map(async (table) => {
          const out: AnyRow[] = [];
          let last = "";
          for (;;) {
            let q = this.client.from(table).select("*").gt("synced_at", since).order("id").limit(PAGE);
            if (last) q = q.gt("id", last);
            const { data, error } = await q;
            if (error) throw toError(error);
            out.push(...(data as AnyRow[]));
            if (data.length < PAGE) break;
            last = (data as AnyRow[])[data.length - 1].id;
          }
          return [table, out] as const;
        }),
      );
      const { data: tombs, error } = await this.client.from("sync_tombstones").select("table_name, id, deleted_at").gt("deleted_at", since);
      if (error) throw toError(error);
      // A local change happened meanwhile: drop this pull; the next one catches up.
      if (epoch !== this.localEpoch || this.hasUnsavedChanges()) return;

      let touched = false;
      let newest = this.cursor;
      const seen = (t: string | undefined) => {
        if (t && (!newest || t > newest)) newest = t;
      };
      for (const [table, rows] of changed) {
        const map = this.server[table] as Map<string, AnyRow>;
        for (const r of rows) {
          seen(r.synced_at);
          const mine = map.get(r.id);
          // Same row we already have? (A restored-after-delete row restarts at version 1, so compare times too.)
          if (mine && mine.version === r.version && (mine.synced_at ?? "") >= (r.synced_at ?? "")) continue;
          map.set(r.id, r);
          this.versions.set(key(table, r.id), r.version ?? 1);
          touched = true;
        }
      }
      for (const t of tombs as TombstoneRow[]) {
        seen(t.deleted_at);
        const map = this.server[t.table_name] as Map<string, AnyRow> | undefined;
        const row = map?.get(t.id);
        if (!map || !row || (row.synced_at && row.synced_at > t.deleted_at)) continue;
        map.delete(t.id);
        this.versions.delete(key(t.table_name, t.id));
        touched = true;
      }
      this.cursor = newest;
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
    this.onNotice = null;
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

/**
 * Merge queued batches: the last change per row wins, then re-order safely.
 * A row keeps the base version of its earliest kept change, so a change
 * restored from an earlier visit is still checked against what it was based on.
 */
export function coalesce(batches: Op[][]): Op[] {
  const last = new Map<string, Op>();
  for (const batch of batches)
    for (const op of batch) {
      const k = key(op.table, op.id);
      const prev = last.get(k);
      last.set(k, prev && prev.base !== undefined && op.base === undefined ? { ...op, base: prev.base } : op);
    }
  const ops = [...last.values()];
  const deletes = orderDeletes(ops.filter((o) => o.op === "delete"));
  const upserts = ops.filter((o) => o.op === "upsert").sort((x, y) => TABLE_ORDER.indexOf(x.table) - TABLE_ORDER.indexOf(y.table));
  return [...deletes, ...upserts];
}

/**
 * Remove the given changes and, for parents that don't exist on the server,
 * anything that depends on them (it couldn't be saved without its parent).
 */
export function dropWithDependents(batch: Op[], dropped: Set<string>, versions: Map<string, number>): Op[] {
  const gone = new Set(dropped);
  let changed = true;
  let rest = batch.filter((o) => !gone.has(key(o.table, o.id)));
  while (changed) {
    changed = false;
    rest = rest.filter((o) => {
      if (!o.row) return true;
      const row = o.row as unknown as Record<string, unknown>;
      const dependsOnMissing = (PARENT_LINKS[o.table] ?? []).some(({ col, parent }) => {
        const v = row[col];
        if (typeof v !== "string") return false;
        const pk = key(parent, v);
        return gone.has(pk) && !versions.has(pk);
      });
      if (dependsOnMissing) {
        gone.add(key(o.table, o.id));
        changed = true;
        return false;
      }
      return true;
    });
  }
  return rest;
}

/** Apply saved-but-unconfirmed changes on top of server rows (for showing them after a reload). */
export function applyOps(rows: RowSet, ops: Op[]): RowSet {
  const out = emptyRowSet();
  for (const t of TABLE_ORDER) for (const [id, r] of rows[t] as Map<string, AnyRow>) (out[t] as Map<string, AnyRow>).set(id, r);
  for (const op of coalesce([ops])) {
    const map = out[op.table] as Map<string, AnyRow>;
    if (op.op === "delete") map.delete(op.id);
    else if (op.row) map.set(op.id, op.row);
  }
  return out;
}

/** Keep both texts when two devices wrote different words for the same day. */
export function mergeText(theirs: string, mine: string) {
  if (!mine || mine === theirs) return theirs;
  if (!theirs) return mine;
  if (theirs.includes(mine)) return theirs;
  return `${theirs}\n\n${mine}`;
}

function toError(error: { message?: string; code?: string; details?: string | null; hint?: string | null }): Error {
  const msg = error.message ?? "Request failed";
  if (/account mismatch/i.test(msg)) return new AccountMismatchError(msg);
  if (error.code === "PGRST301" || error.code === "PGRST303" || /JWT expired|invalid JWT|not authenticated/i.test(msg)) return new AuthExpiredError(msg);
  if (/fetch|network|Failed to fetch|NetworkError|Load failed/i.test(msg) || error.code === "" || error.code === undefined) {
    return new NetworkError(msg);
  }
  return new Error(msg);
}
