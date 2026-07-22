-- Step 4.10: repair/import-centre policy completion for databases where Step 4.9 was attempted.
alter table if exists public.data_import_jobs enable row level security;
alter table if exists public.data_import_errors enable row level security;
drop policy if exists data_import_jobs_tenant_select on public.data_import_jobs;
create policy data_import_jobs_tenant_select on public.data_import_jobs for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(school_id));
drop policy if exists data_import_jobs_tenant_write on public.data_import_jobs;
create policy data_import_jobs_tenant_write on public.data_import_jobs for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']));
drop policy if exists data_import_errors_tenant_select on public.data_import_errors;
create policy data_import_errors_tenant_select on public.data_import_errors for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(school_id));
drop policy if exists data_import_errors_tenant_write on public.data_import_errors;
create policy data_import_errors_tenant_write on public.data_import_errors for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']));
