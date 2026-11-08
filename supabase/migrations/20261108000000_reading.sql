-- =====================================================================
-- Reading: the books you're reading and have finished, and a yearly goal.
--
-- * books: title, author, one or more genres, reading or finished, an
--   optional 1–5 star rating, start and finish dates, and a note.
-- * reading_goals: how many books you want to finish in a year (one per year).
--
-- Only adds: two new tables with the same protections as every other table
-- (owner-only Row Level Security, sync stamps, deletion records). No existing
-- row is changed or deleted. Safe to run more than once. Run it before
-- deploying the app version that has Reading.
-- =====================================================================

begin;

create table if not exists public.books (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  title text not null check (length(btrim(title)) between 1 and 300),
  author text not null default '' check (length(author) <= 200),
  genres jsonb not null default '[]'::jsonb check (jsonb_typeof(genres) = 'array' and jsonb_array_length(genres) <= 20),
  status text not null check (status in ('reading', 'finished')),
  rating smallint check (rating between 1 and 5),
  started_on date,
  finished_on date,
  note text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  -- A finished book has a finish date; a book you're reading doesn't yet.
  constraint books_finished_date_check check ((status = 'finished') = (finished_on is not null))
);

create table if not exists public.reading_goals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The year itself ("2026"), so there is one goal per year.
  id text not null check (id ~ '^[0-9]{4}$'),
  year integer not null check (year between 1900 and 2200),
  target integer not null check (target between 1 and 1000),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint reading_goals_id_year_check check (id = year::text)
);

create index if not exists books_user_finished_idx on public.books (user_id, status, finished_on);
create index if not exists books_user_synced_idx on public.books (user_id, synced_at);
create index if not exists reading_goals_user_synced_idx on public.reading_goals (user_id, synced_at);

do $do$
declare t text;
begin
  foreach t in array array['books', 'reading_goals']
  loop
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
    'ladder_stages', 'student_checks', 'student_matches', 'student_benchmarks', 'student_ratings',
    'books', 'reading_goals']
$fn$;

commit;
