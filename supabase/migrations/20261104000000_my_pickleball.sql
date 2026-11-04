-- =====================================================================
-- My Pickleball: your own progress, built on the Students tables.
--
-- * students: a sport (tennis or pickleball) and an "is_self" marker for
--   your own profile (kept out of the Students list).
-- * Stage, ladder and milestone tables accept the pickleball tracks too.
-- * student_matches: doubles or singles, partner, rated, optional tallies
--   of how points were lost, and optional kitchen-arrival (KAP) tallies.
-- * student_ratings: rating history (e.g. DUPR singles and doubles).
--
-- Only adds: new columns have defaults that match today's data (tennis,
-- not you, singles, not rated, no tallies), allowed values are widened, and
-- one new table gets the same protections as every other table. No row is
-- changed or deleted. Safe to run more than once. Run it before deploying
-- the app version that has My Pickleball.
-- =====================================================================

begin;

alter table public.students add column if not exists sport text not null default 'tennis';
alter table public.students add column if not exists is_self boolean not null default false;
alter table public.students drop constraint if exists students_sport_check;
alter table public.students add constraint students_sport_check check (sport in ('tennis', 'pickleball'));

-- Tracks: the four tennis tracks plus the five pickleball ones.
do $do$
declare t text;
begin
  foreach t in array array['student_stages', 'ladder_stages', 'student_checks']
  loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_track_check');
    execute format($c$alter table public.%I add constraint %I check (track in (
      'rally', 'serve', 'net', 'match', 'kitchen', 'transition', 'serve_return', 'hands', 'play'))$c$, t, t || '_track_check');
  end loop;
end $do$;

alter table public.student_matches add column if not exists format text not null default 'singles';
alter table public.student_matches add column if not exists partner text not null default '';
alter table public.student_matches add column if not exists rated boolean not null default false;
alter table public.student_matches add column if not exists point_losses jsonb not null default '{}'::jsonb;
alter table public.student_matches add column if not exists kap_stats jsonb not null default '{}'::jsonb;
alter table public.student_matches drop constraint if exists student_matches_format_check;
alter table public.student_matches add constraint student_matches_format_check check (format in ('singles', 'doubles'));
alter table public.student_matches drop constraint if exists student_matches_point_losses_check;
alter table public.student_matches add constraint student_matches_point_losses_check check (jsonb_typeof(point_losses) = 'object');
alter table public.student_matches drop constraint if exists student_matches_kap_stats_check;
alter table public.student_matches add constraint student_matches_kap_stats_check check (jsonb_typeof(kap_stats) = 'object');

create table if not exists public.student_ratings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  student_id text not null,
  kind text not null check (kind in ('singles', 'doubles')),
  rating numeric not null check (rating >= 1 and rating <= 9),
  rated_on date not null,
  note text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, student_id) references public.students (user_id, id) on delete cascade
);

create index if not exists student_ratings_user_student_idx on public.student_ratings (user_id, student_id, kind, rated_on);
create index if not exists student_ratings_user_synced_idx on public.student_ratings (user_id, synced_at);
create or replace trigger stamp_row before insert or update on public.student_ratings for each row execute function private.stamp_row();
create or replace trigger record_tombstone after delete on public.student_ratings for each row execute function private.record_tombstone();
create or replace trigger clear_tombstone after insert on public.student_ratings for each row execute function private.clear_tombstone();
alter table public.student_ratings enable row level security;
drop policy if exists "Owner can read" on public.student_ratings;
drop policy if exists "Owner can insert" on public.student_ratings;
drop policy if exists "Owner can update" on public.student_ratings;
drop policy if exists "Owner can delete" on public.student_ratings;
create policy "Owner can read" on public.student_ratings for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can insert" on public.student_ratings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can update" on public.student_ratings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete" on public.student_ratings for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.student_ratings from anon;
grant select, insert, update, delete on public.student_ratings to authenticated;

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
    'ladder_stages', 'student_checks', 'student_matches', 'student_benchmarks', 'student_ratings']
$fn$;

commit;
