-- Step 2 foundation reconciliation for existing SchoolNest databases.
-- Run after database/schema.sql and database/seed.sql. This migration is additive.

alter table public.schools add column if not exists school_type text;
alter table public.schools add column if not exists city_lga text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'school_branches_school_id_id_key') then
    alter table public.school_branches add constraint school_branches_school_id_id_key unique (school_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'academic_sessions_school_id_id_key') then
    alter table public.academic_sessions add constraint academic_sessions_school_id_id_key unique (school_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'terms_school_id_id_key') then
    alter table public.terms add constraint terms_school_id_id_key unique (school_id, id);
  end if;
end $$;

create or replace function public.current_auth_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function public.is_platform_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.school_id is null
      and r.code = 'platform_super_admin'
  );
$$;

create or replace function public.is_school_member(target_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.school_id = target_school_id
  );
$$;

create or replace function public.has_school_role(target_school_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.school_id = target_school_id
      and r.code = any(allowed_roles)
  );
$$;

create or replace function public.is_guardian_of_student(target_school_id uuid, target_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.student_guardians sg
    join public.parent_guardians pg on pg.id = sg.guardian_id
    where sg.school_id = target_school_id
      and sg.student_id = target_student_id
      and pg.user_profile_id = auth.uid()
  );
$$;

alter table public.schools enable row level security;
alter table public.school_branches enable row level security;
alter table public.academic_sessions enable row level security;
alter table public.terms enable row level security;
alter table public.users_profile enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.school_subscriptions enable row level security;
alter table public.feature_flags enable row level security;
alter table public.school_feature_overrides enable row level security;
alter table public.audit_logs enable row level security;

do $$
begin
  create policy schools_read on public.schools for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(id));
  create policy schools_manage on public.schools for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(id, array['school_owner','principal','head_teacher','school_admin'])) with check (public.is_platform_super_admin() or public.has_school_role(id, array['school_owner','principal','head_teacher','school_admin']));

  create policy school_branches_read on public.school_branches for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(school_id));
  create policy school_branches_manage on public.school_branches for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']));

  create policy academic_sessions_read on public.academic_sessions for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(school_id));
  create policy academic_sessions_manage on public.academic_sessions for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']));

  create policy terms_read on public.terms for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(school_id));
  create policy terms_manage on public.terms for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']));

  create policy users_profile_read on public.users_profile for select to authenticated using (public.is_platform_super_admin() or id = auth.uid() or (school_id is not null and public.is_school_member(school_id)));
  create policy users_profile_manage_self on public.users_profile for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
  create policy users_profile_manage_school on public.users_profile for all to authenticated using (public.is_platform_super_admin() or (school_id is not null and public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']))) with check (public.is_platform_super_admin() or (school_id is not null and public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin'])));

  create policy roles_read on public.roles for select to authenticated using (true);
  create policy roles_manage_platform on public.roles for all to authenticated using (public.is_platform_super_admin()) with check (public.is_platform_super_admin());

  create policy user_roles_read on public.user_roles for select to authenticated using (public.is_platform_super_admin() or user_id = auth.uid() or (school_id is not null and public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin'])));
  create policy user_roles_manage on public.user_roles for all to authenticated using (public.is_platform_super_admin() or (school_id is not null and public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']))) with check (public.is_platform_super_admin() or (school_id is not null and public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin'])));

  create policy subscription_plans_read on public.subscription_plans for select to authenticated using (is_active or public.is_platform_super_admin());
  create policy subscription_plans_manage on public.subscription_plans for all to authenticated using (public.is_platform_super_admin()) with check (public.is_platform_super_admin());

  create policy school_subscriptions_read on public.school_subscriptions for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(school_id));
  create policy school_subscriptions_manage on public.school_subscriptions for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']));

  create policy feature_flags_read on public.feature_flags for select to authenticated using (is_active or public.is_platform_super_admin());
  create policy feature_flags_manage on public.feature_flags for all to authenticated using (public.is_platform_super_admin()) with check (public.is_platform_super_admin());

  create policy school_feature_overrides_read on public.school_feature_overrides for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(school_id));
  create policy school_feature_overrides_manage on public.school_feature_overrides for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']));

  create policy audit_logs_read on public.audit_logs for select to authenticated using (public.is_platform_super_admin() or (school_id is not null and public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar'])));
  create policy audit_logs_insert on public.audit_logs for insert to authenticated with check (actor_user_id = auth.uid() and (school_id is null or public.is_school_member(school_id) or public.is_platform_super_admin()));
exception when duplicate_object then null;
end $$;

-- Manual Supabase Auth configuration still required:
-- 1. Configure Site URL and redirect URLs for your deployed domain and localhost.
-- 2. Decide whether email confirmation is required before first login.
-- 3. Keep SUPABASE_SERVICE_ROLE_KEY server-only.

