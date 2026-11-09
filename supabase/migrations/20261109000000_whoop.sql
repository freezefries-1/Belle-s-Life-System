-- =====================================================================
-- Recovery & sleep: your daily WHOOP recovery % and sleep %, typed in by you.
--
-- * whoop_days: one row per day (its id is the date), with recovery and sleep
--   as whole percentages from 0 to 100. Either can be left empty, not both.
--
-- Only adds: one new table with the same protections as every other table
-- (owner-only Row Level Security, sync stamps, deletion records). No existing
-- row is changed or deleted. Safe to run more than once. Run it before
-- deploying the app version that has Recovery & sleep.
-- =====================================================================

begin;

create table if not exists public.whoop_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The day itself ("2026-11-09"), so there is one entry per day.
  id text not null check (id ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  day date not null,
  recovery smallint check (recovery between 0 and 100),
  sleep smallint check (sleep between 0 and 100),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint whoop_days_id_day_check check (id = to_char(day, 'YYYY-MM-DD')),
  constraint whoop_days_something_check check (recovery is not null or sleep is not null)
);

create index if not exists whoop_days_user_synced_idx on public.whoop_days (user_id, synced_at);

create or replace trigger stamp_row before insert or update on public.whoop_days for each row execute function private.stamp_row();
create or replace trigger record_tombstone after delete on public.whoop_days for each row execute function private.record_tombstone();
create or replace trigger clear_tombstone after insert on public.whoop_days for each row execute function private.clear_tombstone();
alter table public.whoop_days enable row level security;
drop policy if exists "Owner can read" on public.whoop_days;
drop policy if exists "Owner can insert" on public.whoop_days;
drop policy if exists "Owner can update" on public.whoop_days;
drop policy if exists "Owner can delete" on public.whoop_days;
create policy "Owner can read" on public.whoop_days for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can insert" on public.whoop_days for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can update" on public.whoop_days for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete" on public.whoop_days for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.whoop_days from anon;
grant select, insert, update, delete on public.whoop_days to authenticated;

-- The save (apply_changes) and import (import_rows) functions only accept tables on this list.
create or replace function private.synced_tables()
returns text[]
language sql
immutable
set search_path = ''
as $fn$
  select array['projects', 'project_milestones', 'recurrence_templates', 'brain_dump_entries', 'tasks',
    'sprint_sessions', 'sprint_session_tasks', 'daily_highlights', 'micro_commitments', 'micro_commitment_completions',
    'kaizen_logs', 'weekly_reviews', 'weekly_priorities', 'students', 'student_stages', 'student_lessons',
    'ladder_stages', 'student_checks', 'student_matches', 'student_benchmarks', 'student_ratings',
    'books', 'reading_goals', 'whoop_days']
$fn$;

commit;
