-- Step 4.9: tenant-scoped CSV import history (additive and idempotent)
create table if not exists public.data_import_jobs (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade,
 module text not null, original_filename text not null, status text not null check (status in ('validating','ready','processing','completed','completed_with_errors','failed')),
 total_rows integer not null default 0, valid_rows integer not null default 0, imported_rows integer not null default 0, skipped_rows integer not null default 0, failed_rows integer not null default 0,
 created_by_user_profile_id uuid references public.users_profile(id) on delete set null, started_at timestamptz not null default now(), completed_at timestamptz, created_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb,
 unique (school_id, id)
);
create table if not exists public.data_import_errors (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade,
 import_job_id uuid not null, row_number integer not null, field_name text, error_code text, error_message text not null, row_data jsonb, created_at timestamptz not null default now(),
 foreign key (school_id, import_job_id) references public.data_import_jobs(school_id, id) on delete cascade
);
create index if not exists data_import_jobs_school_created_idx on public.data_import_jobs(school_id, created_at desc);
create index if not exists data_import_errors_job_idx on public.data_import_errors(school_id, import_job_id);
alter table public.data_import_jobs enable row level security;
alter table public.data_import_errors enable row level security;
drop policy if exists data_import_jobs_tenant_select on public.data_import_jobs;
create policy data_import_jobs_tenant_select on public.data_import_jobs for select to authenticated using (public.is_platform_super_admin() or public.user_has_school_access(school_id));
drop policy if exists data_import_jobs_tenant_write on public.data_import_jobs;
create policy data_import_jobs_tenant_write on public.data_import_jobs for all to authenticated using (public.is_platform_super_admin() or public.user_has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin'])) with check (public.is_platform_super_admin() or public.user_has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']));
drop policy if exists data_import_errors_tenant_select on public.data_import_errors;
create policy data_import_errors_tenant_select on public.data_import_errors for select to authenticated using (public.is_platform_super_admin() or public.user_has_school_access(school_id));
drop policy if exists data_import_errors_tenant_write on public.data_import_errors;
create policy data_import_errors_tenant_write on public.data_import_errors for all to authenticated using (public.is_platform_super_admin() or public.user_has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin'])) with check (public.is_platform_super_admin() or public.user_has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']));

