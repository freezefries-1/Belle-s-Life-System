-- =====================================================================
-- Students, stage 3: match results and benchmark results.
--
-- Only adds: two new tables with the same protections as every other
-- table (owner-only Row Level Security, versions, sync time, deletion
-- markers), and adds them to the list the save and import functions
-- accept. No existing table or row is changed. Safe to run more than once.
-- Run it before deploying the app version that has matches and benchmarks.
-- =====================================================================

begin;

-- One match a student played. Serve counts are optional; percentages are worked out by the app.
create table if not exists public.student_matches (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  student_id text not null,
  played_on date not null,
  kind text not null check (kind in ('tournament', 'club', 'practice')),
  event text not null default '',
  opponent text not null default '',
  result text not null check (result in ('win', 'loss')),
  score text not null default '',
  first_in integer check (first_in >= 0),
  first_total integer check (first_total >= 0),
  second_in integer check (second_in >= 0),
  second_total integer check (second_total >= 0),
  double_faults integer check (double_faults >= 0),
  unforced_errors integer check (unforced_errors >= 0),
  winners integer check (winners >= 0),
  notes text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  check (first_in is null or first_total is null or first_in <= first_total),
  check (second_in is null or second_total is null or second_in <= second_total),
  foreign key (user_id, student_id) references public.students (user_id, id) on delete cascade
);

-- One benchmark result: a built-in test (e.g. "first_serves") or one you named ("custom:..."),
-- recorded with its name, unit and direction so a custom test needs no separate setup.
create table if not exists public.student_benchmarks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  student_id text not null,
  test text not null check (length(test) between 1 and 120),
  name text not null check (length(trim(name)) > 0),
  unit text not null check (unit in ('balls', 'out_of_10', 'count', 'seconds')),
  higher_is_better boolean not null default true,
  value numeric not null check (value >= 0 and value <= 100000),
  measured_on date not null,
  note text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  check (unit <> 'out_of_10' or value <= 10),
  foreign key (user_id, student_id) references public.students (user_id, id) on delete cascade
);

create index if not exists student_matches_user_student_idx on public.student_matches (user_id, student_id, played_on);
create index if not exists student_benchmarks_user_student_idx on public.student_benchmarks (user_id, student_id, test);

do $do$
declare t text;
begin
  foreach t in array array['student_matches', 'student_benchmarks']
  loop
    execute format('create index if not exists %I on public.%I (user_id, synced_at)', t || '_user_synced_idx', t);
    execute format('create or replace trigger stamp_row before insert or update on public.%I for each row execute function private.stamp_row()', t);
    execute format('create or replace trigger record_tombstone after delete on public.%I for each row execute function private.record_tombstone()', t);
    execute format('create or replace trigger clear_tombstone after insert on public.%I for each row execute function private.clear_tombstone()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Owner can read" on public.%I', t);
    execute format('drop policy if exists "Owner can insert" on public.%I', t);
    execute format('drop policy if exists "Owner can update" on public.%I', t);
    execute format('drop policy if exists "Owner can delete" on public.%I', t);
    execute format('create policy "Owner can read" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "Owner can insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "Owner can update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "Owner can delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $do$;

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
    'ladder_stages', 'student_checks', 'student_matches', 'student_benchmarks']
$fn$;

commit;
