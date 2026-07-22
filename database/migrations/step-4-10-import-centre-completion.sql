-- Step 4.10: repair only the Import Centre grants and RLS policies.
-- Apply this only where Step 4.9 already created both import tables.

do $schoolnest$
begin
  if to_regclass('public.data_import_jobs') is null then
    raise exception 'Step 4.10 requires public.data_import_jobs; apply corrected Step 4.9 instead';
  end if;
  if to_regclass('public.data_import_errors') is null then
    raise exception 'Step 4.10 requires public.data_import_errors; apply corrected Step 4.9 instead';
  end if;
  if to_regprocedure('public.is_platform_super_admin()') is null
     or to_regprocedure('public.has_school_role(uuid,text[])') is null then
    raise exception 'Step 4.10 requires the canonical Step 2 RLS helpers';
  end if;
end
$schoolnest$;

alter table public.data_import_jobs enable row level security;
alter table public.data_import_errors enable row level security;

revoke all on table public.data_import_jobs from authenticated;
revoke all on table public.data_import_errors from authenticated;
grant select, insert, update on table public.data_import_jobs to authenticated;
grant select, insert on table public.data_import_errors to authenticated;

drop policy if exists data_import_jobs_tenant_select on public.data_import_jobs;
drop policy if exists data_import_jobs_tenant_insert on public.data_import_jobs;
drop policy if exists data_import_jobs_tenant_update on public.data_import_jobs;
drop policy if exists data_import_jobs_tenant_write on public.data_import_jobs;
drop policy if exists data_import_errors_tenant_select on public.data_import_errors;
drop policy if exists data_import_errors_tenant_insert on public.data_import_errors;
drop policy if exists data_import_errors_tenant_write on public.data_import_errors;

create policy data_import_jobs_tenant_select
  on public.data_import_jobs for select to authenticated
  using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner', 'principal', 'head_teacher', 'school_admin']::text[]));
create policy data_import_jobs_tenant_insert
  on public.data_import_jobs for insert to authenticated
  with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner', 'principal', 'head_teacher', 'school_admin']::text[]));
create policy data_import_jobs_tenant_update
  on public.data_import_jobs for update to authenticated
  using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner', 'principal', 'head_teacher', 'school_admin']::text[]))
  with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner', 'principal', 'head_teacher', 'school_admin']::text[]));
create policy data_import_errors_tenant_select
  on public.data_import_errors for select to authenticated
  using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner', 'principal', 'head_teacher', 'school_admin']::text[]));
create policy data_import_errors_tenant_insert
  on public.data_import_errors for insert to authenticated
  with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner', 'principal', 'head_teacher', 'school_admin']::text[]));

