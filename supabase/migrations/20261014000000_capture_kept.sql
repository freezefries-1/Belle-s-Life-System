-- Brain Dump: allow a third status, 'kept' (an entry kept as a note, out of the inbox).
--
-- Only widens the list of allowed values: no rows are changed, nothing is
-- deleted, and it's safe to run more than once. Run it before deploying the
-- app version that offers "Keep as note".

begin;

alter table public.brain_dump_entries drop constraint if exists brain_dump_entries_status_check;
alter table public.brain_dump_entries
  add constraint brain_dump_entries_status_check check (status in ('inbox', 'converted', 'kept'));

commit;
