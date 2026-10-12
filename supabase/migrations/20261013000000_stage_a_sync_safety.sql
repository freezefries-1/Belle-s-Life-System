-- =====================================================================
-- Stage A - sync safety and security hardening
--
-- Adds new versions of the two app functions. Nothing here changes or
-- deletes stored data, and no tables change.
-- * apply_changes(changes, p_user) and import_rows(target, rows, p_user)
--   refuse to run unless p_user is the signed-in account, so a change
--   queued for one account can never be saved into another.
-- * Conflicts are judged against the data as it was before the batch
--   started, so effects of earlier steps in the same batch (for example
--   tasks unlinked by deleting their project) are never reported as
--   changes made on another device.
-- * Foreign key, check and not-null failures come back as rejected items
--   instead of an error that blocks every later save.
-- * Same-day duplicates come back with the existing row so the app can
--   merge them instead of losing text.
-- * Input is validated and batch sizes are capped.
-- * The older function versions stay but can no longer be called.
-- Safe to run more than once. Runs as one transaction.
-- Comments in this file avoid quote, semicolon and dollar characters
-- because the Supabase SQL editor reads comments when splitting scripts.
-- =====================================================================

begin;

create or replace function public.apply_changes(changes jsonb, p_user uuid)
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
  pre jsonb := '{}'::jsonb;
  pre_version integer;
  live_version integer;
  cols text[];
  set_list text;
  col_list text;
  sel_list text;
  same_data boolean;
  new_version integer;
  results jsonb := '[]'::jsonb;
  conflicts jsonb := '[]'::jsonb;
  server_row jsonb;
  date_col text;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_user is null or p_user <> uid then
    raise exception 'account mismatch' using errcode = '28000', hint = 'These changes belong to a different account.';
  end if;
  if changes is null or jsonb_typeof(changes) <> 'array' then
    raise exception 'changes must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(changes) > 5000 then
    raise exception 'too many changes in one batch' using errcode = '22023';
  end if;

  -- Validate every item and remember each row version before anything is written.
  for c in select value from jsonb_array_elements(changes)
  loop
    tbl := c->>'table';
    op := c->>'op';
    rid := c->>'id';
    if tbl is null or not (tbl = any (private.synced_tables())) then
      raise exception 'unknown table %', coalesce(tbl, 'null') using errcode = '22023';
    end if;
    if op is null or op not in ('upsert', 'delete') then
      raise exception 'unknown op %', coalesce(op, 'null') using errcode = '22023';
    end if;
    if rid is null or length(rid) = 0 or length(rid) > 200 then
      raise exception 'missing or invalid id' using errcode = '22023';
    end if;
    if op = 'upsert' and (c->'row' is null or jsonb_typeof(c->'row') <> 'object') then
      raise exception 'missing row for %', rid using errcode = '22023';
    end if;
    execute format('select t.version from public.%I t where t.user_id = $1 and t.id = $2', tbl)
      into pre_version using uid, rid;
    pre := pre || jsonb_build_object(tbl || ':' || rid, pre_version);
  end loop;

  begin
    for c in select value from jsonb_array_elements(changes)
    loop
      tbl := c->>'table';
      op := c->>'op';
      rid := c->>'id';
      expected := (c->>'expected_version')::integer;
      pre_version := (pre->>(tbl || ':' || rid))::integer;
      execute format('select t.version, to_jsonb(t) from public.%I t where t.user_id = $1 and t.id = $2', tbl)
        into live_version, server_row using uid, rid;

      if op = 'delete' then
        if expected is not null and pre_version is not null and pre_version <> expected then
          conflicts := conflicts || jsonb_build_object('table', tbl, 'id', rid, 'reason', 'changed', 'server', server_row);
          continue;
        end if;
        if live_version is not null then
          execute format('delete from public.%I where user_id = $1 and id = $2', tbl) using uid, rid;
        end if;
        results := results || jsonb_build_object('table', tbl, 'id', rid, 'version', null);
        continue;
      end if;

      -- Only the columns the client sent are written.
      cols := array(select x from unnest(private.data_columns(tbl)) x where (c->'row') ? x);
      if coalesce(array_length(cols, 1), 0) = 0 then
        raise exception 'row for % has no known columns', rid using errcode = '22023';
      end if;

      same_data := false;
      if live_version is not null then
        execute format(
          'select (select jsonb_object_agg(k, v) from jsonb_each(to_jsonb(t)) e(k, v) where k = any($2))
              = (select jsonb_object_agg(k, v) from jsonb_each(to_jsonb(r)) e(k, v) where k = any($2))
             from public.%1$I t, jsonb_populate_record(null::public.%1$I, $1) r
            where t.user_id = $3 and t.id = $4', tbl)
          into same_data using c->'row', cols, uid, rid;
        same_data := coalesce(same_data, false);
      end if;

      if pre_version is null and expected is not null then
        -- Edited here, deleted elsewhere before this batch.
        conflicts := conflicts || jsonb_build_object('table', tbl, 'id', rid, 'reason', 'deleted', 'server', null);
        continue;
      end if;

      if pre_version is not null and (expected is null or pre_version <> expected) then
        if same_data then
          results := results || jsonb_build_object('table', tbl, 'id', rid, 'version', live_version);
        elsif c->>'if_exists' = 'ignore' then
          results := results || jsonb_build_object('table', tbl, 'id', rid, 'version', live_version, 'adopted', server_row);
        else
          conflicts := conflicts || jsonb_build_object('table', tbl, 'id', rid, 'reason', 'changed', 'server', server_row);
        end if;
        continue;
      end if;

      if live_version is null then
        select string_agg(quote_ident(x), ', '), string_agg('r.' || quote_ident(x), ', ') into col_list, sel_list from unnest(cols) x;
        execute format('insert into public.%1$I (user_id, id, %2$s) select $1, $2, %3$s from jsonb_populate_record(null::public.%1$I, $3) r returning version',
          tbl, col_list, sel_list)
          into new_version using uid, rid, c->'row';
      else
        select string_agg(format('%1$I = r.%1$I', x), ', ') into set_list from unnest(cols) x;
        execute format('update public.%1$I t set %2$s from jsonb_populate_record(null::public.%1$I, $1) r where t.user_id = $2 and t.id = $3 returning t.version',
          tbl, set_list)
          into new_version using c->'row', uid, rid;
      end if;
      results := results || jsonb_build_object('table', tbl, 'id', rid, 'version', new_version);
    end loop;

    if jsonb_array_length(conflicts) > 0 then
      raise exception using errcode = 'P0409', message = 'conflict';
    end if;
    -- Check deferred links now so a failure is reported, not raised at commit.
    set constraints all immediate;
  exception
    when sqlstate 'P0409' then
      return jsonb_build_object('ok', false, 'conflicts', conflicts);
    when unique_violation then
      -- Another record already holds this day or week (or the one open session).
      server_row := null;
      date_col := case tbl when 'kaizen_logs' then 'date_key' when 'daily_highlights' then 'date_key' when 'weekly_reviews' then 'week_start_date' else null end;
      if date_col is not null then
        execute format('select to_jsonb(t) from public.%I t where t.user_id = $1 and t.%I = $2::date', tbl, date_col)
          into server_row using uid, c->'row'->>date_col;
      elsif tbl = 'micro_commitment_completions' then
        select to_jsonb(t) into server_row from public.micro_commitment_completions t
         where t.user_id = uid and t.commitment_id = c->'row'->>'commitment_id' and t.date_key = (c->'row'->>'date_key')::date;
      elsif tbl = 'sprint_sessions' then
        select to_jsonb(t) into server_row from public.sprint_sessions t where t.user_id = uid and t.status <> 'ended' limit 1;
      elsif tbl = 'tasks' then
        select to_jsonb(t) into server_row from public.tasks t
         where t.user_id = uid and t.recurrence_template_id = c->'row'->>'recurrence_template_id'
           and t.occurrence_date = (c->'row'->>'occurrence_date')::date;
      end if;
      return jsonb_build_object('ok', false, 'conflicts',
        conflicts || jsonb_build_object('table', tbl, 'id', rid, 'reason', 'duplicate', 'server', server_row));
    when foreign_key_violation or check_violation or not_null_violation then
      return jsonb_build_object('ok', false, 'conflicts',
        conflicts || jsonb_build_object('table', tbl, 'id', rid, 'reason', 'rejected', 'server', null, 'message', sqlerrm));
  end;

  return jsonb_build_object('ok', true, 'results', results, 'synced_at', clock_timestamp());
end;
$fn$;

create or replace function public.import_rows(target text, rows jsonb, p_user uuid)
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
  if p_user is null or p_user <> uid then
    raise exception 'account mismatch' using errcode = '28000';
  end if;
  if target is null or not (target = any (private.synced_tables())) then
    raise exception 'unknown table %', coalesce(target, 'null') using errcode = '22023';
  end if;
  if rows is null or jsonb_typeof(rows) <> 'array' then
    raise exception 'rows must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(rows) > 2000 then
    raise exception 'too many rows in one call' using errcode = '22023';
  end if;

  for r in select value from jsonb_array_elements(rows)
  loop
    begin
      if jsonb_typeof(r) <> 'object' or coalesce(length(r->>'id'), 0) not between 1 and 200 then
        skipped := skipped || jsonb_build_object('id', r->>'id', 'reason', 'invalid record');
        continue;
      end if;
      cols := array(select x from unnest(private.data_columns(target)) x where r ? x);
      if coalesce(array_length(cols, 1), 0) = 0 then
        skipped := skipped || jsonb_build_object('id', r->>'id', 'reason', 'no known columns');
        continue;
      end if;
      select string_agg(quote_ident(x), ', '), string_agg('x.' || quote_ident(x), ', ') into col_list, sel_list from unnest(cols) x;
      execute format('insert into public.%1$I (user_id, id, %2$s) select $1, $2, %3$s from jsonb_populate_record(null::public.%1$I, $3) x on conflict do nothing',
        target, col_list, sel_list)
        using uid, r->>'id', r;
      get diagnostics n = row_count;
      if n = 1 then
        inserted := inserted + 1;
      elsif target = 'brain_dump_entries' and r->>'converted_task_id' is not null then
        -- Second pass - fill a missing conversion link, never overwrite one.
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
    exception when foreign_key_violation or check_violation or not_null_violation or invalid_text_representation or datetime_field_overflow or invalid_datetime_format then
      skipped := skipped || jsonb_build_object('id', r->>'id', 'reason', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('inserted', inserted, 'existing', existing, 'filled', filled, 'skipped', skipped);
end;
$fn$;

revoke all on function public.apply_changes(jsonb, uuid) from public, anon;
grant execute on function public.apply_changes(jsonb, uuid) to authenticated;
revoke all on function public.import_rows(text, jsonb, uuid) from public, anon;
grant execute on function public.import_rows(text, jsonb, uuid) to authenticated;

-- The earlier versions, without the account check, can no longer be called.
revoke execute on function public.apply_changes(jsonb) from public, anon, authenticated;
revoke execute on function public.import_rows(text, jsonb) from public, anon, authenticated;

-- Only the two helper functions the app functions need are callable.
-- Trigger functions run without an execute grant.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.synced_tables() to authenticated;
grant execute on function private.data_columns(text) to authenticated;

-- Profiles - only the display name can be changed.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

commit;
