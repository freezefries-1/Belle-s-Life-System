-- =====================================================================
-- Belle's Life System — initial cloud schema (Phase 7)
--
-- Design notes (see docs/cloud-architecture.md for the full write-up):
-- * Every user-owned table has a composite primary key (user_id, id).
--   Ids are text so existing local ids (UUIDs, legacy ids such as
--   "p_ladder", deterministic recurring ids "rec_<template>_<date>") are
--   preserved exactly during migration.
-- * Foreign keys include user_id, so a row can only ever point at rows
--   owned by the same user — cross-account links are impossible at the
--   database level, independent of Row Level Security.
-- * Calendar dates are `date`; real events are `timestamptz`.
-- * `version` (bumped on every update) gives optimistic concurrency;
--   `synced_at` (server time) drives incremental sync; deletions leave a
--   row in sync_tombstones so other devices can catch up.
-- * Nothing here deletes or rewrites existing data.
-- * Safe to run again (e.g. after a partial run): every statement is
--   "if not exists" / "or replace", and it runs as one transaction.
--   Function bodies use named delimiters ($fn$, $do$).
-- =====================================================================

begin;

create schema if not exists private;

-- ---------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(split_part(new.email, '@', 1), ''))
  on conflict (id) do nothing;
  return new;
end;
$fn$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------
-- Productivity tables
-- ---------------------------------------------------------------------
create table if not exists public.projects (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  status text not null check (status in ('planning', 'active', 'on_hold', 'completed', 'archived')),
  priority text check (priority in ('low', 'medium', 'high')),
  category text not null default '',
  start_date date,
  target_date date,
  preparation_date date,
  icon text not null default 'folder',
  colour text not null default 'blue',
  notes text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  archived_at timestamptz,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.project_milestones (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  project_id text not null,
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  target_date date,
  preparation_date date,
  status text not null check (status in ('upcoming', 'in_progress', 'completed')),
  sort_order double precision not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  completed_at timestamptz,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  -- Lets tasks reference (project, milestone) together so a task's milestone
  -- always belongs to the task's own project.
  unique (user_id, project_id, id),
  -- Milestones belong to their project; deleting the project removes them
  -- (tasks are only unlinked — see tasks below).
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.recurrence_templates (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  frequency text not null check (frequency in ('daily', 'weekdays', 'weekly', 'biweekly', 'monthly', 'custom')),
  interval integer not null default 1 check (interval between 1 and 365),
  interval_unit text not null default 'days' check (interval_unit in ('days', 'weeks')),
  selected_weekdays smallint[] not null default '{}',
  start_date date not null,
  end_date date,
  sprint text check (sprint in ('urgent', 'deadlines', 'admin', 'build')),
  project_id text,
  priority text check (priority in ('low', 'medium', 'high')),
  estimated_minutes integer check (estimated_minutes >= 0),
  status text not null check (status in ('active', 'paused', 'ended')),
  generated_through date,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  check (end_date is null or end_date >= start_date),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete set null (project_id)
);

create table if not exists public.brain_dump_entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  title text not null check (length(trim(title)) > 0),
  note text not null default '',
  kind text not null check (kind in ('task', 'idea', 'reminder', 'note')),
  status text not null check (status in ('inbox', 'converted')),
  converted_task_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.tasks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  status text not null check (status in ('todo', 'in_progress', 'completed', 'skipped')),
  priority text check (priority in ('low', 'medium', 'high')),
  sprint text check (sprint in ('urgent', 'deadlines', 'admin', 'build')),
  project_id text,
  milestone_id text,
  recurrence_template_id text,
  occurrence_date date,
  due_date date,
  estimated_minutes integer check (estimated_minutes >= 0),
  actual_minutes integer check (actual_minutes >= 0),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  completed_at timestamptz,
  source_capture_id text,
  captured_at timestamptz,
  sort_order double precision not null default 0,
  project_sort_order double precision not null default 0,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  -- Deleting a project, milestone, template or Brain Dump entry never deletes tasks.
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete set null (project_id),
  foreign key (user_id, project_id, milestone_id) references public.project_milestones (user_id, project_id, id) on delete set null (milestone_id),
  foreign key (user_id, recurrence_template_id) references public.recurrence_templates (user_id, id) on delete set null (recurrence_template_id),
  foreign key (user_id, source_capture_id) references public.brain_dump_entries (user_id, id) on delete set null (source_capture_id)
  -- (A milestone link is cleared with its milestone; deleting a project
  -- deletes its milestones, which unlinks their tasks.)
);

-- A milestone link only makes sense within a project: when the project link
-- is cleared (including by deleting the project), clear the milestone too.
create or replace function private.clear_orphan_milestone()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  if new.project_id is null then
    new.milestone_id := null;
  end if;
  return new;
end;
$fn$;

create or replace trigger clear_orphan_milestone
  before insert or update on public.tasks
  for each row execute function private.clear_orphan_milestone();

-- One occurrence per template per date, whichever device generates it.
create unique index if not exists tasks_one_occurrence_per_date
  on public.tasks (user_id, recurrence_template_id, occurrence_date)
  where recurrence_template_id is not null and occurrence_date is not null;

-- Brain Dump entry ↔ converted task point at each other; checked at commit so
-- both can be written in one transaction.
alter table public.brain_dump_entries drop constraint if exists brain_dump_entries_converted_task_fkey;
alter table public.brain_dump_entries
  add constraint brain_dump_entries_converted_task_fkey
  foreign key (user_id, converted_task_id) references public.tasks (user_id, id)
  on delete set null (converted_task_id) deferrable initially deferred;

create table if not exists public.sprint_sessions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  sprint text not null check (sprint in ('urgent', 'deadlines', 'admin', 'build')),
  planned_minutes integer not null check (planned_minutes >= 0),
  energy_level text check (energy_level in ('low', 'moderate', 'high')),
  status text not null check (status in ('ready', 'running', 'paused', 'ended')),
  created_at timestamptz not null,
  started_at timestamptz,
  ended_at timestamptz,
  accumulated_elapsed_seconds integer not null default 0 check (accumulated_elapsed_seconds >= 0),
  last_resumed_at timestamptz,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Only one planned/running/paused session at a time.
create unique index if not exists sprint_sessions_one_open
  on public.sprint_sessions (user_id) where status <> 'ended';

-- Which tasks a session covered — references, never copies.
create table if not exists public.sprint_session_tasks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null, -- "<session_id>:<task_id>"
  session_id text not null,
  task_id text not null,
  position integer not null default 0,
  completed_in_session boolean not null default false,
  allocated_minutes integer check (allocated_minutes > 0),
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, session_id, task_id),
  foreign key (user_id, session_id) references public.sprint_sessions (user_id, id) on delete cascade,
  foreign key (user_id, task_id) references public.tasks (user_id, id) on delete cascade
);

create table if not exists public.daily_highlights (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  date_key date not null,
  task_id text,
  title_snapshot text not null default '',
  selected_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, date_key),
  -- The title snapshot keeps history readable if the task is deleted.
  foreign key (user_id, task_id) references public.tasks (user_id, id) on delete set null (task_id)
);

create table if not exists public.micro_commitments (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  target_minutes integer check (target_minutes >= 0),
  frequency text not null check (frequency in ('daily', 'weekdays', 'weekly')),
  selected_weekdays smallint[] not null default '{}',
  start_date date not null,
  status text not null check (status in ('active', 'paused', 'archived')),
  -- [{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" | null }] — a small value list, read with the commitment.
  paused_periods jsonb not null default '[]'::jsonb check (jsonb_typeof(paused_periods) = 'array'),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  archived_at timestamptz,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.micro_commitment_completions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  commitment_id text not null,
  date_key date not null,
  completed_at timestamptz not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, commitment_id, date_key),
  foreign key (user_id, commitment_id) references public.micro_commitments (user_id, id) on delete cascade
);

create table if not exists public.kaizen_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  date_key date not null,
  reflection_went_well text not null default '',
  reflection_improve text not null default '',
  reflection_learned text not null default '',
  notes text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, date_key)
);

create table if not exists public.weekly_reviews (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  week_start_date date not null check (extract(isodow from week_start_date) = 1),
  week_end_date date not null,
  status text not null check (status in ('in_progress', 'completed')),
  went_well text not null default '',
  challenges text not null default '',
  improvements text not null default '',
  lessons_learned text not null default '',
  next_week_focus text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  completed_at timestamptz,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, week_start_date),
  check (week_end_date = week_start_date + 6)
);

create table if not exists public.weekly_priorities (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  weekly_review_id text not null,
  task_id text,
  project_id text,
  title text not null check (length(trim(title)) > 0),
  sort_order integer not null check (sort_order between 0 and 2),
  created_at timestamptz not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, weekly_review_id, sort_order),
  foreign key (user_id, weekly_review_id) references public.weekly_reviews (user_id, id) on delete cascade,
  foreign key (user_id, task_id) references public.tasks (user_id, id) on delete set null (task_id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete set null (project_id)
);

-- Deleted rows, so other devices can remove them during incremental sync.
create table if not exists public.sync_tombstones (
  user_id uuid not null references auth.users (id) on delete cascade,
  table_name text not null,
  id text not null,
  deleted_at timestamptz not null default now(),
  primary key (user_id, table_name, id)
);

-- ---------------------------------------------------------------------
-- Indexes for common filters (every table is also indexed by its PK,
-- which starts with user_id).
-- ---------------------------------------------------------------------
create index if not exists tasks_user_status_idx on public.tasks (user_id, status);
create index if not exists tasks_user_due_idx on public.tasks (user_id, due_date) where due_date is not null;
create index if not exists tasks_user_completed_idx on public.tasks (user_id, completed_at) where completed_at is not null;
create index if not exists tasks_user_project_idx on public.tasks (user_id, project_id) where project_id is not null;
create index if not exists tasks_user_milestone_idx on public.tasks (user_id, project_id, milestone_id) where milestone_id is not null;
create index if not exists tasks_user_template_idx on public.tasks (user_id, recurrence_template_id) where recurrence_template_id is not null;
create index if not exists tasks_user_capture_idx on public.tasks (user_id, source_capture_id) where source_capture_id is not null;
create index if not exists milestones_user_project_idx on public.project_milestones (user_id, project_id);
create index if not exists recurrence_user_project_idx on public.recurrence_templates (user_id, project_id) where project_id is not null;
create index if not exists captures_user_task_idx on public.brain_dump_entries (user_id, converted_task_id) where converted_task_id is not null;
create index if not exists sessions_user_ended_idx on public.sprint_sessions (user_id, ended_at);
create index if not exists session_tasks_user_task_idx on public.sprint_session_tasks (user_id, task_id);
create index if not exists session_tasks_user_session_idx on public.sprint_session_tasks (user_id, session_id);
create index if not exists highlights_user_task_idx on public.daily_highlights (user_id, task_id) where task_id is not null;
create index if not exists completions_user_date_idx on public.micro_commitment_completions (user_id, date_key);
create index if not exists priorities_user_review_idx on public.weekly_priorities (user_id, weekly_review_id);
create index if not exists priorities_user_task_idx on public.weekly_priorities (user_id, task_id) where task_id is not null;
create index if not exists priorities_user_project_idx on public.weekly_priorities (user_id, project_id) where project_id is not null;
create index if not exists tombstones_user_deleted_idx on public.sync_tombstones (user_id, deleted_at);

-- Incremental sync reads "what changed since" per table.
do $do$
declare t text;
begin
  foreach t in array array['projects', 'project_milestones', 'recurrence_templates', 'brain_dump_entries', 'tasks',
    'sprint_sessions', 'sprint_session_tasks', 'daily_highlights', 'micro_commitments', 'micro_commitment_completions',
    'kaizen_logs', 'weekly_reviews', 'weekly_priorities']
  loop
    execute format('create index if not exists %I on public.%I (user_id, synced_at)', t || '_user_synced_idx', t);
  end loop;
end $do$;

-- ---------------------------------------------------------------------
-- Triggers: ownership, versions, sync time, tombstones
-- ---------------------------------------------------------------------
create or replace function private.stamp_row()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  if tg_op = 'INSERT' then
    -- Rows created through the API always belong to the caller.
    if auth.uid() is not null then
      new.user_id := auth.uid();
    end if;
    new.version := 1;
  else
    new.user_id := old.user_id; -- ownership can never be moved
    new.id := old.id;
    new.version := old.version + 1;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end;
$fn$;

create or replace function private.record_tombstone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  insert into public.sync_tombstones (user_id, table_name, id, deleted_at)
  values (old.user_id, tg_table_name, old.id, clock_timestamp())
  on conflict (user_id, table_name, id) do update set deleted_at = excluded.deleted_at;
  return old;
end;
$fn$;

-- A row re-created with an id that was deleted earlier is no longer deleted.
create or replace function private.clear_tombstone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  delete from public.sync_tombstones where user_id = new.user_id and table_name = tg_table_name and id = new.id;
  return new;
end;
$fn$;

do $do$
declare t text;
begin
  foreach t in array array['projects', 'project_milestones', 'recurrence_templates', 'brain_dump_entries', 'tasks',
    'sprint_sessions', 'sprint_session_tasks', 'daily_highlights', 'micro_commitments', 'micro_commitment_completions',
    'kaizen_logs', 'weekly_reviews', 'weekly_priorities']
  loop
    execute format('create or replace trigger stamp_row before insert or update on public.%I for each row execute function private.stamp_row()', t);
    execute format('create or replace trigger record_tombstone after delete on public.%I for each row execute function private.record_tombstone()', t);
    execute format('create or replace trigger clear_tombstone after insert on public.%I for each row execute function private.clear_tombstone()', t);
  end loop;
end $do$;

-- ---------------------------------------------------------------------
-- Row Level Security: every user-owned table, every operation.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

do $do$
declare t text;
begin
  foreach t in array array['projects', 'project_milestones', 'recurrence_templates', 'brain_dump_entries', 'tasks',
    'sprint_sessions', 'sprint_session_tasks', 'daily_highlights', 'micro_commitments', 'micro_commitment_completions',
    'kaizen_logs', 'weekly_reviews', 'weekly_priorities']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Owner can read" on public.%I', t);
    execute format('drop policy if exists "Owner can insert" on public.%I', t);
    execute format('drop policy if exists "Owner can update" on public.%I', t);
    execute format('drop policy if exists "Owner can delete" on public.%I', t);
    execute format('create policy "Owner can read" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "Owner can insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "Owner can update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "Owner can delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $do$;

alter table public.sync_tombstones enable row level security;
drop policy if exists "Owner can read" on public.sync_tombstones;
create policy "Owner can read" on public.sync_tombstones for select to authenticated using ((select auth.uid()) = user_id);
-- Tombstones are written only by the trigger (security definer); clients can't insert or change them.

-- Anonymous users get nothing at all.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.sync_tombstones from authenticated;
revoke insert, delete on public.profiles from authenticated;

-- ---------------------------------------------------------------------
-- apply_changes: one transaction per batch of app changes.
--
-- changes: [{ "table": "...", "op": "upsert" | "delete", "id": "...",
--             "row": {...snake_case columns...}, "expected_version": int | null,
--             "if_exists": "conflict" | "ignore" }]
--
-- * expected_version null  → the client thinks the row is new (insert).
-- * expected_version n     → only update/delete if the row is still at n.
-- * A retry of a batch that already succeeded is recognised (same data)
--   and treated as success, so retries never duplicate or fail.
-- * Any conflict rolls back the whole batch and is reported, never
--   silently overwritten. Runs as the caller, so RLS still applies.
-- ---------------------------------------------------------------------
create or replace function private.synced_tables()
returns text[]
language sql
immutable
set search_path = ''
as $fn$
  select array['projects', 'project_milestones', 'recurrence_templates', 'brain_dump_entries', 'tasks',
    'sprint_sessions', 'sprint_session_tasks', 'daily_highlights', 'micro_commitments', 'micro_commitment_completions',
    'kaizen_logs', 'weekly_reviews', 'weekly_priorities']
$fn$;

create or replace function private.data_columns(tbl text)
returns text[]
language sql
stable
set search_path = ''
as $fn$
  select array_agg(a.attname::text order by a.attnum)
  from pg_catalog.pg_attribute a
  where a.attrelid = ('public.' || quote_ident(tbl))::regclass
    and a.attnum > 0 and not a.attisdropped
    and a.attname not in ('user_id', 'id', 'version', 'synced_at')
$fn$;

create or replace function public.apply_changes(changes jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  uid uuid := auth.uid();
  c jsonb;
  tbl text;
  op text;
  rid text;
  expected integer;
  cols text[];
  set_list text;
  col_list text;
  sel_list text;
  same_data boolean;
  current_version integer;
  new_version integer;
  results jsonb := '[]'::jsonb;
  conflicts jsonb := '[]'::jsonb;
  server_row jsonb;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if jsonb_typeof(changes) <> 'array' then
    raise exception 'changes must be an array' using errcode = '22023';
  end if;

  begin
    for c in select value from jsonb_array_elements(changes)
    loop
      tbl := c->>'table';
      op := c->>'op';
      rid := c->>'id';
      expected := (c->>'expected_version')::integer;
      if not (tbl = any (private.synced_tables())) then
        raise exception 'unknown table %', tbl using errcode = '22023';
      end if;
      if rid is null or length(rid) = 0 then
        raise exception 'missing id' using errcode = '22023';
      end if;

      execute format('select version, to_jsonb(t) from public.%I t where t.user_id = $1 and t.id = $2', tbl)
        into current_version, server_row using uid, rid;

      if op = 'delete' then
        if current_version is null then
          results := results || jsonb_build_object('table', tbl, 'id', rid, 'version', null);
          continue; -- already gone: deleting is idempotent
        end if;
        if expected is not null and current_version <> expected then
          conflicts := conflicts || jsonb_build_object('table', tbl, 'id', rid, 'reason', 'changed', 'server', server_row);
          continue;
        end if;
        execute format('delete from public.%I where user_id = $1 and id = $2', tbl) using uid, rid;
        results := results || jsonb_build_object('table', tbl, 'id', rid, 'version', null);
        continue;
      end if;

      if op <> 'upsert' then
        raise exception 'unknown op %', op using errcode = '22023';
      end if;

      cols := array(select x from unnest(private.data_columns(tbl)) x where (c->'row') ? x);
      -- Does the stored row already hold exactly this data? (A retried request.)
      if current_version is not null then
        execute format(
          'select (select jsonb_object_agg(k, v) from jsonb_each(to_jsonb(t)) e(k, v) where k = any($2))
              = (select jsonb_object_agg(k, v) from jsonb_each(to_jsonb(r)) e(k, v) where k = any($2))
             from public.%1$I t, jsonb_populate_record(null::public.%1$I, $1) r
            where t.user_id = $3 and t.id = $4', tbl)
          into same_data using c->'row', cols, uid, rid;
      end if;

      if current_version is null and expected is not null then
        -- Edited here, deleted elsewhere.
        conflicts := conflicts || jsonb_build_object('table', tbl, 'id', rid, 'reason', 'deleted', 'server', null);
        continue;
      end if;

      if current_version is not null and (expected is null or current_version <> expected) then
        if same_data then
          results := results || jsonb_build_object('table', tbl, 'id', rid, 'version', current_version);
        elsif c->>'if_exists' = 'ignore' then
          -- e.g. a recurring occurrence another device generated first: keep theirs.
          results := results || jsonb_build_object('table', tbl, 'id', rid, 'version', current_version, 'adopted', server_row);
        else
          conflicts := conflicts || jsonb_build_object('table', tbl, 'id', rid, 'reason', 'changed', 'server', server_row);
        end if;
        continue;
      end if;

      -- Only the columns the client sent are written; the rest keep their defaults / values.
      if current_version is null then
        select string_agg(quote_ident(x), ', '), string_agg('r.' || quote_ident(x), ', ') into col_list, sel_list from unnest(cols) x;
        execute format('insert into public.%1$I (user_id, id, %2$s) select $1, $2, %3$s from jsonb_populate_record(null::public.%1$I, $3) r returning version',
          tbl, col_list, sel_list)
          into new_version using uid, rid, c->'row';
      else
        select string_agg(format('%1$I = r.%1$I', x), ', ') into set_list from unnest(cols) x;
        execute format('update public.%1$I t set %2$s from jsonb_populate_record(null::public.%1$I, $1) r where t.user_id = $2 and t.id = $3 and t.version = $4 returning t.version',
          tbl, set_list)
          into new_version using c->'row', uid, rid, current_version;
      end if;
      results := results || jsonb_build_object('table', tbl, 'id', rid, 'version', new_version);
    end loop;

    if jsonb_array_length(conflicts) > 0 then
      raise exception using errcode = 'P0409', message = 'conflict';
    end if;
  exception
    when sqlstate 'P0409' then
      return jsonb_build_object('ok', false, 'conflicts', conflicts);
    when unique_violation then
      -- e.g. two devices created a highlight for the same day with different ids.
      return jsonb_build_object('ok', false, 'conflicts', conflicts || jsonb_build_object('table', tbl, 'id', rid, 'reason', 'duplicate', 'server', null));
  end;

  return jsonb_build_object('ok', true, 'results', results, 'synced_at', clock_timestamp());
end;
$fn$;

revoke all on function public.apply_changes(jsonb) from public, anon;
grant execute on function public.apply_changes(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- import_rows: idempotent, resumable import of local data.
-- Inserts rows that don't exist yet and never overwrites cloud data.
-- Returns per-row outcome counts. A row whose parent wasn't imported
-- (foreign key) is skipped and reported, not fatal.
-- Exception: an *empty* cloud Kaizen Log for the same day (auto-created
-- when the app opened) is filled with the local words.
-- ---------------------------------------------------------------------
create or replace function public.import_rows(target text, rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  uid uuid := auth.uid();
  r jsonb;
  cols text[];
  col_list text;
  sel_list text;
  n integer;
  inserted integer := 0;
  existing integer := 0;
  filled integer := 0;
  skipped jsonb := '[]'::jsonb;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not (target = any (private.synced_tables())) then
    raise exception 'unknown table %', target using errcode = '22023';
  end if;
  for r in select value from jsonb_array_elements(rows)
  loop
    begin
      cols := array(select x from unnest(private.data_columns(target)) x where r ? x);
      select string_agg(quote_ident(x), ', '), string_agg('x.' || quote_ident(x), ', ') into col_list, sel_list from unnest(cols) x;
      execute format('insert into public.%1$I (user_id, id, %2$s) select $1, $2, %3$s from jsonb_populate_record(null::public.%1$I, $3) x on conflict do nothing',
        target, col_list, sel_list)
        using uid, r->>'id', r;
      get diagnostics n = row_count;
      if n = 1 then
        inserted := inserted + 1;
      elsif target = 'brain_dump_entries' and r->>'converted_task_id' is not null then
        -- Second pass: fill a missing conversion link (never overwrite one),
        -- only when the task really exists.
        update public.brain_dump_entries b
           set converted_task_id = r->>'converted_task_id'
         where b.user_id = uid and b.id = r->>'id' and b.converted_task_id is null
           and exists (select 1 from public.tasks t where t.user_id = uid and t.id = r->>'converted_task_id');
        get diagnostics n = row_count;
        if n = 1 then filled := filled + 1; else existing := existing + 1; end if;
      elsif target = 'kaizen_logs' then
        update public.kaizen_logs k
           set reflection_went_well = r->>'reflection_went_well',
               reflection_improve = r->>'reflection_improve',
               reflection_learned = r->>'reflection_learned',
               notes = r->>'notes'
         where k.user_id = uid and k.date_key = (r->>'date_key')::date and k.id <> r->>'id'
           and k.reflection_went_well = '' and k.reflection_improve = '' and k.reflection_learned = '' and k.notes = '';
        get diagnostics n = row_count;
        if n = 1 then filled := filled + 1; else existing := existing + 1; end if;
      else
        existing := existing + 1;
      end if;
    exception when foreign_key_violation or check_violation or not_null_violation then
      skipped := skipped || jsonb_build_object('id', r->>'id', 'reason', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('inserted', inserted, 'existing', existing, 'filled', filled, 'skipped', skipped);
end;
$fn$;

revoke all on function public.import_rows(text, jsonb) from public, anon;
grant execute on function public.import_rows(text, jsonb) to authenticated;

-- Helper functions in the private schema are not reachable through the API.
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

commit;
