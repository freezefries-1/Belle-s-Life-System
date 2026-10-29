-- =====================================================================
-- Students (tennis coaching): profiles, the stages each student has
-- reached on each track, and lesson notes.
--
-- Only adds: three new tables with the same protections as every other
-- table (owner-only Row Level Security, versions, sync time, deletion
-- markers), and adds them to the list the save and import functions
-- accept. No existing table or row is changed. Safe to run more than once.
-- Run it before deploying the app version that has Students.
-- =====================================================================

begin;

create table if not exists public.students (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  name text not null check (length(trim(name)) > 0),
  player_group text not null default 'adult' check (player_group in ('junior', 'adult')),
  ball text not null default 'yellow' check (ball in ('red', 'orange', 'green', 'yellow')),
  hand text check (hand in ('right', 'left')),
  backhand text check (backhand in ('one', 'two')),
  started_on date,
  goals text not null default '',
  notes text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'finished')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- One row each time a student reaches a stage on a track (rally, serve, net, match).
create table if not exists public.student_stages (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  student_id text not null,
  track text not null check (track in ('rally', 'serve', 'net', 'match')),
  stage text not null check (length(stage) between 1 and 20),
  reached_on date not null,
  note text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, student_id) references public.students (user_id, id) on delete cascade
);

create table if not exists public.student_lessons (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  student_id text not null,
  lesson_date date not null,
  focus text not null default '',
  went_well text not null default '',
  work_on text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, student_id) references public.students (user_id, id) on delete cascade
);

create index if not exists student_stages_user_student_idx on public.student_stages (user_id, student_id);
create index if not exists student_lessons_user_student_idx on public.student_lessons (user_id, student_id, lesson_date);

do $do$
declare t text;
begin
  foreach t in array array['students', 'student_stages', 'student_lessons']
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
    'kaizen_logs', 'weekly_reviews', 'weekly_priorities', 'students', 'student_stages', 'student_lessons']
$fn$;

commit;
