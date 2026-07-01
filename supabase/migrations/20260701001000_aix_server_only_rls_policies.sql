-- AiX uses Supabase as a server-side database.
-- Browser API roles are denied explicitly; the Node server connects through Postgres.

do $$
declare
  table_name text;
  table_names text[] := array[
    'courses',
    'leads',
    'users',
    'members',
    'packages',
    'sms_verifications',
    'course_replays',
    'member_resources',
    'class_schedules',
    'notifications',
    'learning_progress',
    'payment_records'
  ];
begin
  foreach table_name in array table_names loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = 'server_only_no_browser_access'
    ) then
      execute format(
        'create policy server_only_no_browser_access on public.%I for all to anon, authenticated using (false) with check (false)',
        table_name
      );
    end if;
  end loop;
end $$;
