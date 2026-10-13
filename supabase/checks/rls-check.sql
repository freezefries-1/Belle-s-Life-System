-- Read-only security check: safe to run any time in the Supabase SQL editor.
-- Expect every row: rls_on = true, policy_roles = authenticated, anon_can_select = false.
select c.relname as table_name,
       c.relrowsecurity as rls_on,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies,
       (select string_agg(distinct r, ',') from pg_policies p, unnest(p.roles) r where p.schemaname = 'public' and p.tablename = c.relname) as policy_roles,
       has_table_privilege('anon', c.oid, 'select') as anon_can_select
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;
