# Cloud architecture (Phase 7)

This page records how Belle's Life System stores data in Supabase and why.

## Two modes, one codebase

| Mode | When | Storage | Sign-in |
| --- | --- | --- | --- |
| **Browser-only** | `NEXT_PUBLIC_SUPABASE_URL` / key are **not** set | localStorage (Phases 2–6, unchanged) | None |
| **Cloud** | Both env vars are set | Supabase Postgres | Email + password |

Deploying this code without the env vars keeps the app exactly as before, so the switch is incremental and reversible. Remove the env vars to go back.

## One source of truth

In cloud mode the **database is the source of truth**. The app keeps an in-memory copy of the signed-in user's data, so every existing feature, calculation and analytic works unchanged. localStorage is **not** used for cloud data. The only time the app reads the old local data is when you choose to migrate it in Settings.

```
UI → store actions (unchanged business rules) → in-memory workspace
                         │
                         ▼ diff (row-level upserts/deletes)
                CloudSync engine ──► apply_changes() RPC ──► Postgres (RLS)
                         ▲
        incremental pull (synced_at + tombstones) on focus / online / 30 s
```

- `src/lib/repositories/mappers.ts` is the only place app records and database rows meet. Incoming rows go through the same validation and integrity rules as local data (`parseEnvelope`), so the rules exist once.
- `src/lib/repositories/cloud-sync.ts` is the sync engine. It loads, queues, pushes, pulls, and handles conflicts and status.
- `src/lib/repositories/cloud-repository.ts` gives the store the same `WorkspaceRepository` interface as localStorage, so no component talks to the database directly.

## Database types

`src/types/supabase.ts` is generated from the schema; don't edit it by hand. After adding a migration, regenerate it:

- locally: `supabase/local/gen-types.sh` (needs the local test stack from `supabase/local/start.sh`);
- or against your Supabase project: `npx supabase gen types typescript --project-id <project-ref> --schema public > src/types/supabase.ts`.

The app's row types in `src/types/database.ts` are derived from it, and the Supabase client is typed with it. So if a column is renamed or removed, `tsc` points at every place in the mappers, sync engine and import code that needs to change.

## Schema decisions (`supabase/migrations/`)

- **Composite keys `(user_id, id)` with text ids.** Existing ids are preserved exactly during migration:
  - UUIDs;
  - legacy project ids such as `p_ladder`;
  - deterministic recurring ids, `rec_<template>_<date>`.

  Two people can have the same id without clashing.
- **Ownership-aware foreign keys.** Every foreign key includes `user_id`, so a row can only reference rows owned by the same user. "Attach my task to someone else's project" is impossible at the database level, independently of RLS. This is tested.
- **No cascading task deletion.**
  - Deleting a project, milestone, recurring template or Brain Dump entry unlinks tasks (`ON DELETE SET NULL (column)`); it never deletes them.
  - Deleting a project deletes its milestones.
  - Highlights and weekly priorities keep their title snapshot when the linked task goes.
- **Dates vs times.** Calendar dates (due dates, date keys, week starts, targets) are `date`. Real events (created, completed, started) are `timestamptz`.
- **Uniqueness in the database:**
  - one highlight per user per day;
  - one completion per commitment per day;
  - one weekly review per user per week (which must start on a Monday);
  - one recurring occurrence per template per date;
  - one open focus session at a time;
  - at most three priorities per review (`sort_order` 0–2).
- **Sessions.** Which tasks a session covered is a join table (`sprint_session_tasks`), with the "completed in session" flag and allocated minutes per task. Tasks are never copied.
- **Small value lists stay with their parent.** Commitment pause periods are a `jsonb` array, and selected weekdays a `smallint[]`.
- **No `task_time_entries` table.** The app keeps actual time on the task plus per-session allocations, so a separate table would duplicate data.
- **`profiles`** is created automatically for each new auth user (`display_name` from the email).

## Security

- **RLS everywhere:**
  - RLS is enabled on every user-owned table, with separate select, insert, update and delete policies, all using `(select auth.uid()) = user_id`.
  - Anonymous users have no table privileges.
  - Tombstones are readable by their owner and written only by a trigger.
- **Server-side ownership.** A trigger forces `user_id = auth.uid()` on insert and prevents changing `user_id` or `id` on update.
- **Functions run as the caller.** The RPCs (`apply_changes`, `import_rows`) are `SECURITY INVOKER`, so RLS still applies. Helper functions live in a `private` schema that the API doesn't expose.
- **Public keys only.** The browser uses only the public URL and the publishable/anon key. No service-role or secret key exists anywhere in the app.
- **Auth with `@supabase/ssr`:**
  - sessions live in cookies;
  - `src/proxy.ts` (Next 16's replacement for middleware) refreshes the session with `getClaims()` and redirects signed-out requests to `/login` before any page renders;
  - signing out does a full page load, so no one's data stays in memory;
  - the workspace is keyed by account id.
- **Tests.** `supabase/tests/db-security.test.mjs` uses two real accounts and checks:
  - cross-account reads, updates and deletes are blocked;
  - cross-account foreign keys are blocked;
  - anonymous access is denied;
  - every constraint above.

## Saving, sync and conflicts

- **Saving:**
  - Each local change becomes row-level upserts and deletes. Queued changes are coalesced (last change per row wins), then sent in dependency order.
  - Each batch is **one transaction** (`apply_changes`).
  - The sync indicator shows *Saving…* until the server confirms, and never "Saved" before then.
- **Optimistic concurrency.** Every row has a `version` (bumped by a trigger). Updates and deletes send the version they were based on.
  - If the row changed elsewhere, the **whole batch is rolled back** and a conflict is reported. Nothing is silently overwritten.
  - The banner offers **Load the latest version** or **Keep my changes** (an explicit overwrite).
- **Routine conflicts are settled automatically**, because both sides are the app's own bookkeeping:
  - another device already created today's empty Kaizen Log;
  - another device advanced a recurring template's "generated through" date;
  - another device already generated the same recurring occurrence (deterministic id plus the unique index; the server keeps the first copy).
- **Retries are idempotent.** If a request reached the server but the response was lost, re-sending identical data counts as success.
- **Pulling** fetches only rows whose server-side `synced_at` is newer than the last pull (with a 10-second overlap), plus deletion tombstones. It runs:
  - when the tab regains focus;
  - when the browser comes back online;
  - every 30 seconds while the tab is visible.

  A pull is dropped if local changes are waiting, so stale server data can't overwrite newer local edits.
- **Offline and errors:**
  - Failed saves stay queued in memory, with a banner and Retry, plus automatic retry with backoff and on `online`.
  - Closing the tab with unsaved changes asks first.
  - If the first load fails, an error page with "Try again" is shown, never an empty workspace.
- **Realtime.** Supabase Realtime isn't used yet. Focus/online/visible-polling pulls cover the cross-device case without a subscription per table. Realtime could later replace the 30-second poll.

## Stage A safety rules (Oct 2026)

- **Saves name their account.** `apply_changes(changes, p_user)` and `import_rows(target, rows, p_user)` refuse to run unless `p_user` is the signed-in account. The client also checks the browser's session before every save. A change queued for one account can never land in another, even if someone signs into a different account in another tab. The older function versions can no longer be called.
- **Conflicts are judged against the state before the batch.** The function records every target row's version before writing anything. Side effects of earlier steps in the same batch (such as tasks unlinked when their project is deleted) never count as edits from another device.
- **Rejected changes don't block saving.** Foreign-key, check and not-null failures come back as a `rejected` item, and deferred links are checked inside the function. The banner explains it and offers to set it aside. Anything that depended on it (for example a new milestone of a project that couldn't be saved) is set aside with it. Everything else keeps saving.
- **Same-day duplicates are settled without losing words:**
  - Kaizen Logs and weekly reviews: the existing record gets both devices' text, and this device's priorities move into free slots.
  - Highlights, commitment ticks and a second open focus session: the other device's record is kept, with a short notice.
- **Unsaved changes are kept on the device.** They're stored in localStorage under `belles-life-system:cloud-pending:<account id>`, together with the version each one was based on. Closing the tab or having the session expire therefore doesn't lose them: they're re-applied and saved after the next sign-in, and stale ones are reported as conflicts. Signing out on purpose (after the warning) discards them.
- **Server time only.** The "changed since" cursor is the newest server `synced_at`/`deleted_at` seen, never the device clock. Pages are read with keyset paging (by id).
- **Browser-only mode** never writes over saved data it couldn't read, couldn't back up, or that came from a newer app version. It stays read-only for that visit and says why.

## Recurring tasks

Generation still runs when the app opens or the day changes, with the same 14-day window, cap and missed-date policy as before. There is **no background scheduler**; adding one (for example a scheduled Edge Function) would be new infrastructure and needs approval first.

Duplicates across devices are prevented by:
- deterministic occurrence ids;
- the database unique index on (template, date);
- `if_exists: "ignore"` on occurrence inserts.

## Migrating browser data (Settings → Your data)

1. **Review:**
   - reads the old local data without changing it;
   - shows counts per record type, unreadable records and missing links;
   - offers a **download of the exact original JSON**.
2. **Preview:**
   - compares with the account and shows what will be imported;
   - shows what's already there (same id, or another entry for the same day or week, which keeps the cloud copy);
   - shows the account totals.
3. **Confirm:** importing requires ticking a confirmation.
4. **Test import first:**
   - a small sample of real records is chosen so that, between them, they use every kind of link: a task with a project and milestone, a completed task, a sprint task, a recurring task and its template, a converted Brain Dump entry, a Daily Highlight's task, a commitment's history and a weekly priority — plus every parent they need;
   - the sample is imported the same insert-only way, then read back and compared: task relationships, project associations, completed task history, sprint assignments, recurrence templates, commitment completions, Highlight and priority links;
   - a checklist shows the result. The full import is offered only after a passing test; if the test finds problems, the page recommends stopping (an "Import everything anyway" button remains);
   - the sampled records are real, so they simply stay in the account, and the preview is refreshed;
   - when nothing in the browser links to anything else, there's nothing to test and the import is offered directly.
5. **Import:**
   - `import_rows` is insert-only (`ON CONFLICT DO NOTHING`), in dependency order, in chunks;
   - historical timestamps and ids are preserved;
   - a row whose parent is missing is skipped and reported;
   - an *empty* same-day cloud Kaizen Log is filled with the local words instead of losing them;
   - Brain Dump ↔ converted-task links are filled in a final pass.

   Re-running after a failure continues without duplicates.
6. **Verify:**
   - every local record is checked in the cloud;
   - every task's project, milestone and template link is checked;
   - the workspace then reloads from the cloud.
7. **Local data is kept.** "Clear browser copy" appears only after a verified import, and only on request.

## Performance

- **Indexes:**
  - every table is indexed by its `(user_id, …)` primary key;
  - `(user_id, synced_at)` for incremental sync;
  - the common filters: status, due date, completed date, project, milestone, template, session and task links, completion dates.
- **Loading — a copy on the device, then only changes:**
  - after loading, the engine saves its copy of the account's *confirmed* server rows in this browser (IndexedDB, `src/lib/repositories/device-cache.ts`), together with the sync cursor. Unsaved changes are never in it; they're kept separately until the server confirms them;
  - opening the app again loads that copy and fetches only the rows and deletions changed since the cursor (deletions come from `sync_tombstones`, which are kept permanently, so a copy can't miss one);
  - safety net: after catching up, each table's record count is compared with the server's, and any difference means a full download. A full download also happens on first sign-in on a device, when the copy is over 7 days old, when it can't be read, or when `DEVICE_COPY_FORMAT` is bumped (do that whenever a migration changes columns);
  - the full download is paged (1,000 rows per request, tables in parallel). Navigating between pages makes no requests;
  - only one account's copy is kept per browser. Signing out deletes it first; so does the app noticing it has been signed out (including from another tab, or an expired session).
- **Privacy trade-off:** while signed in, the account's data is stored in the browser on each device used. Sign out on shared computers.
- **Rendering:** long task lists render 100 at a time.
- **Known trade-off:** analytics are calculated in the browser from the loaded workspace, which is the same logic as Phases 4–6. For one person's data (years of tasks is still tens of thousands of rows) this is fast. If it ever isn't, the next step is loading older completed history on demand and moving analytics to SQL views (considered and not done: every streak, review and progress figure reads full history).
