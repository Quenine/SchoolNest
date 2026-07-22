-- SchoolNest initial PostgreSQL schema for Supabase.
-- All tenant-owned queries MUST include school_id, even when RLS is enabled.

create extension if not exists "pgcrypto";

DO $schoolnest$
begin
  create type public.subscription_billing_type as enum ('free', 'one_time', 'recurring');
exception when duplicate_object then null;
END $schoolnest$;
DO $schoolnest$
begin
  create type public.subscription_billing_cycle as enum ('none', 'session', 'term');
exception when duplicate_object then null;
END $schoolnest$;
DO $schoolnest$
begin
  create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'cancelled', 'expired');
exception when duplicate_object then null;
END $schoolnest$;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  email text,
  phone text,
  address text,
  state text,
  city_lga text,
  school_type text,
  country_code char(2) not null default 'NG',
  logo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_branches (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  code text not null,
  address text,
  phone text,
  is_main_branch boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, code),
  unique (school_id, id)
);

create table if not exists public.academic_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_on > starts_on),
  unique (school_id, name),
  unique (school_id, id)
);

create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_session_id uuid not null,
  name text not null check (name in ('first', 'second', 'third')),
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_on > starts_on),
  unique (school_id, academic_session_id, name),
  unique (school_id, id),
  foreign key (school_id, academic_session_id)
    references public.academic_sessions(school_id, id) on delete cascade
);

create table if not exists public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text,
  avatar_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_platform_role boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  user_id uuid not null references public.users_profile(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  branch_id uuid,
  created_at timestamptz not null default now(),
  unique (school_id, user_id, role_id, branch_id),
  foreign key (school_id, branch_id)
    references public.school_branches(school_id, id) on delete cascade,
  check (
    (school_id is null and branch_id is null)
    or school_id is not null
  )
);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  billing_type public.subscription_billing_type not null,
  allowed_billing_cycles public.subscription_billing_cycle[] not null default '{}',
  max_students integer,
  max_staff integer,
  max_classes integer,
  watermarked_report_cards boolean not null default false,
  enabled_feature_keys text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  check (max_students is null or max_students >= 0),
  check (max_staff is null or max_staff >= 0),
  check (max_classes is null or max_classes >= 0)
);

create table if not exists public.school_subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  status public.subscription_status not null default 'active',
  billing_cycle public.subscription_billing_cycle not null default 'none',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  external_customer_id text,
  external_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id),
  check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.school_feature_overrides (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  feature_flag_id uuid not null references public.feature_flags(id) on delete cascade,
  is_enabled boolean not null,
  reason text,
  expires_at timestamptz,
  created_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (school_id, feature_flag_id)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  school_id uuid references public.schools(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists school_branches_school_id_idx on public.school_branches(school_id);
create index if not exists academic_sessions_school_id_idx on public.academic_sessions(school_id);
create index if not exists terms_school_id_idx on public.terms(school_id);
create index if not exists users_profile_school_id_idx on public.users_profile(school_id);
create index if not exists user_roles_school_user_idx on public.user_roles(school_id, user_id);
create index if not exists school_subscriptions_school_id_idx on public.school_subscriptions(school_id);
create index if not exists school_feature_overrides_school_id_idx on public.school_feature_overrides(school_id);
create index if not exists audit_logs_school_created_idx on public.audit_logs(school_id, created_at desc);


-- Tenant-scoped composite foreign keys require matching unique constraints on referenced tables.
DO $schoolnest$
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
END $schoolnest$;

-- Optional nullable composite references are allowed: PostgreSQL does not enforce
-- the composite FK when the nullable referenced id column is null. When present,
-- the (school_id, referenced_id) pair must match the same tenant.
-- RLS for foundation tables is provided in database/migrations/step-2-foundation-reconciliation.sql.
-- 1. Enable RLS on every public table above.
-- 2. Platform lookup tables (roles, subscription_plans, feature_flags) may allow
--    authenticated reads but only platform administrators may write.
-- 3. Tenant policies must derive allowed school IDs from the authenticated
--    user's user_roles records. Never trust a school_id supplied by the client.
-- 4. Platform super admins require a separate, explicit policy path.
-- 5. audit_logs should be append-only for approved server-side functions and
--    readable only by authorised school/platform administrators.
-- 6. Storage buckets must mirror these tenant boundaries in their object paths.

-- Step 3: School setup and core records.
DO $schoolnest$
begin
  create type public.subject_type as enum ('core', 'elective', 'vocational', 'language', 'co_curricular');
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create type public.employment_status as enum ('active', 'inactive', 'suspended', 'resigned', 'terminated');
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create type public.staff_category as enum ('academic', 'non_academic', 'management', 'support');
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create type public.student_status as enum ('active', 'graduated', 'withdrawn', 'suspended', 'transferred');
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create type public.enrollment_status as enum ('active', 'promoted', 'repeated', 'withdrawn', 'transferred', 'graduated');
exception when duplicate_object then null;
END $schoolnest$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.school_profile_settings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null unique references public.schools(id) on delete cascade,
  display_name text,
  motto text,
  logo_url text,
  primary_color text,
  secondary_color text,
  address text,
  city text,
  state text,
  country text not null default 'Nigeria',
  contact_email text,
  contact_phone text,
  website text,
  principal_name text,
  head_teacher_name text,
  report_card_signature_url text,
  default_currency text not null default 'NGN',
  timezone text not null default 'Africa/Lagos',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id)
);

create table if not exists public.school_sections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  code text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, code),
  unique (school_id, id)
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  section_id uuid,
  name text not null,
  code text not null,
  level_order integer not null default 0,
  is_graduating_class boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, code),
  unique (school_id, id),
  foreign key (school_id, section_id) references public.school_sections(school_id, id) on delete set null
);

create table if not exists public.class_arms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null,
  name text not null,
  code text not null,
  capacity integer,
  class_teacher_user_id uuid references public.users_profile(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, class_id, code),
  unique (school_id, id),
  check (capacity is null or capacity > 0),
  foreign key (school_id, class_id) references public.classes(school_id, id) on delete cascade
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  section_id uuid,
  name text not null,
  code text not null,
  subject_type public.subject_type not null default 'core',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, code),
  unique (school_id, id),
  foreign key (school_id, section_id) references public.school_sections(school_id, id) on delete set null
);

create table if not exists public.class_subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null,
  subject_id uuid not null,
  teacher_user_id uuid references public.users_profile(id) on delete set null,
  is_compulsory boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, class_id, subject_id),
  foreign key (school_id, class_id) references public.classes(school_id, id) on delete cascade,
  foreign key (school_id, subject_id) references public.subjects(school_id, id) on delete cascade
);

create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_profile_id uuid references public.users_profile(id) on delete set null,
  staff_number text not null,
  first_name text not null,
  last_name text not null,
  other_names text,
  gender text,
  phone text,
  email text,
  address text,
  state_of_origin text,
  date_of_birth date,
  employment_date date,
  employment_status public.employment_status not null default 'active',
  staff_category public.staff_category not null default 'academic',
  job_title text,
  department text,
  qualification text,
  emergency_contact_name text,
  emergency_contact_phone text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, staff_number),
  unique (school_id, id)
);

create table if not exists public.parent_guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_profile_id uuid references public.users_profile(id) on delete set null,
  first_name text not null,
  last_name text not null,
  other_names text,
  relationship_label text,
  phone text not null,
  alternate_phone text,
  email text,
  occupation text,
  address text,
  city text,
  state text,
  is_primary_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  admission_number text not null,
  first_name text not null,
  last_name text not null,
  other_names text,
  preferred_name text,
  gender text,
  date_of_birth date,
  photo_url text,
  blood_group text,
  genotype text,
  allergies text,
  medical_notes text,
  religion text,
  nationality text not null default 'Nigerian',
  state_of_origin text,
  lga text,
  home_address text,
  previous_school text,
  admission_date date,
  student_status public.student_status not null default 'active',
  current_class_id uuid,
  current_arm_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, admission_number),
  unique (school_id, id),
  foreign key (school_id, current_class_id) references public.classes(school_id, id) on delete set null,
  foreign key (school_id, current_arm_id) references public.class_arms(school_id, id) on delete set null
);

create table if not exists public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null,
  guardian_id uuid not null,
  relationship_to_student text not null,
  is_primary boolean not null default false,
  can_pick_up boolean not null default false,
  receives_sms boolean not null default true,
  receives_email boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_id, guardian_id),
  foreign key (school_id, student_id) references public.students(school_id, id) on delete cascade,
  foreign key (school_id, guardian_id) references public.parent_guardians(school_id, id) on delete cascade
);

create table if not exists public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null,
  academic_session_id uuid not null,
  term_id uuid,
  class_id uuid not null,
  arm_id uuid,
  enrollment_status public.enrollment_status not null default 'active',
  enrolled_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (school_id, student_id) references public.students(school_id, id) on delete cascade,
  foreign key (school_id, academic_session_id) references public.academic_sessions(school_id, id) on delete cascade,
  foreign key (school_id, term_id) references public.terms(school_id, id) on delete set null,
  foreign key (school_id, class_id) references public.classes(school_id, id) on delete restrict,
  foreign key (school_id, arm_id) references public.class_arms(school_id, id) on delete set null
);

create index if not exists school_profile_settings_school_id_idx on public.school_profile_settings(school_id);
create index if not exists school_sections_school_id_idx on public.school_sections(school_id);
create index if not exists classes_school_id_idx on public.classes(school_id);
create index if not exists classes_section_id_idx on public.classes(section_id);
create index if not exists class_arms_school_id_idx on public.class_arms(school_id);
create index if not exists class_arms_class_id_idx on public.class_arms(class_id);
create index if not exists subjects_school_id_idx on public.subjects(school_id);
create index if not exists subjects_section_id_idx on public.subjects(section_id);
create index if not exists class_subjects_school_id_idx on public.class_subjects(school_id);
create index if not exists class_subjects_class_id_idx on public.class_subjects(class_id);
create index if not exists class_subjects_subject_id_idx on public.class_subjects(subject_id);
create index if not exists staff_profiles_school_id_idx on public.staff_profiles(school_id);
create index if not exists parent_guardians_school_id_idx on public.parent_guardians(school_id);
create index if not exists students_school_id_idx on public.students(school_id);
create index if not exists students_current_class_id_idx on public.students(current_class_id);
create index if not exists students_current_arm_id_idx on public.students(current_arm_id);
create index if not exists student_guardians_school_id_idx on public.student_guardians(school_id);
create index if not exists student_guardians_student_id_idx on public.student_guardians(student_id);
create index if not exists student_guardians_guardian_id_idx on public.student_guardians(guardian_id);
create index if not exists student_enrollments_school_id_idx on public.student_enrollments(school_id);
create index if not exists student_enrollments_student_id_idx on public.student_enrollments(student_id);
create index if not exists student_enrollments_class_id_idx on public.student_enrollments(class_id);
create index if not exists student_enrollments_arm_id_idx on public.student_enrollments(arm_id);

DO $schoolnest$
begin
  create trigger schools_set_updated_at before update on public.schools for each row execute function public.set_updated_at();
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create trigger users_profile_set_updated_at before update on public.users_profile for each row execute function public.set_updated_at();
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create trigger school_subscriptions_set_updated_at before update on public.school_subscriptions for each row execute function public.set_updated_at();
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create trigger school_profile_settings_set_updated_at before update on public.school_profile_settings for each row execute function public.set_updated_at();
  create trigger school_sections_set_updated_at before update on public.school_sections for each row execute function public.set_updated_at();
  create trigger classes_set_updated_at before update on public.classes for each row execute function public.set_updated_at();
  create trigger class_arms_set_updated_at before update on public.class_arms for each row execute function public.set_updated_at();
  create trigger subjects_set_updated_at before update on public.subjects for each row execute function public.set_updated_at();
  create trigger class_subjects_set_updated_at before update on public.class_subjects for each row execute function public.set_updated_at();
  create trigger staff_profiles_set_updated_at before update on public.staff_profiles for each row execute function public.set_updated_at();
  create trigger parent_guardians_set_updated_at before update on public.parent_guardians for each row execute function public.set_updated_at();
  create trigger students_set_updated_at before update on public.students for each row execute function public.set_updated_at();
  create trigger student_guardians_set_updated_at before update on public.student_guardians for each row execute function public.set_updated_at();
  create trigger student_enrollments_set_updated_at before update on public.student_enrollments for each row execute function public.set_updated_at();
exception when duplicate_object then null;
END $schoolnest$;


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

create or replace function public.can_read_student(target_school_id uuid, target_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_super_admin()
    or public.has_school_role(target_school_id, array['school_owner','principal','head_teacher','school_admin','exam_officer','bursar','teacher','class_teacher'])
    or exists (
      select 1
      from public.student_guardians sg
      join public.parent_guardians pg on pg.id = sg.guardian_id
      where sg.school_id = target_school_id
        and sg.student_id = target_student_id
        and pg.user_profile_id = auth.uid()
    );
$$;

alter table public.school_profile_settings enable row level security;
alter table public.school_sections enable row level security;
alter table public.classes enable row level security;
alter table public.class_arms enable row level security;
alter table public.subjects enable row level security;
alter table public.class_subjects enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.parent_guardians enable row level security;
alter table public.students enable row level security;
alter table public.student_guardians enable row level security;
alter table public.student_enrollments enable row level security;

DO $schoolnest$
begin
  create policy school_profile_settings_read on public.school_profile_settings for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(school_id));
  create policy school_profile_settings_manage on public.school_profile_settings for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));

  create policy school_sections_read on public.school_sections for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(school_id));
  create policy school_sections_manage on public.school_sections for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));

  create policy classes_read on public.classes for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(school_id));
  create policy classes_manage on public.classes for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));

  create policy class_arms_read on public.class_arms for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(school_id));
  create policy class_arms_manage on public.class_arms for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));

  create policy subjects_read on public.subjects for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(school_id));
  create policy subjects_manage on public.subjects for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));

  create policy class_subjects_read on public.class_subjects for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(school_id));
  create policy class_subjects_manage on public.class_subjects for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));

  create policy staff_profiles_read on public.staff_profiles for select to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']));
  create policy staff_profiles_manage on public.staff_profiles for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));

  create policy parent_guardians_read on public.parent_guardians for select to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar','teacher','class_teacher']) or user_profile_id = auth.uid());
  create policy parent_guardians_manage on public.parent_guardians for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));

  create policy students_read on public.students for select to authenticated using (public.can_read_student(school_id, id));
  create policy students_manage on public.students for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));

  create policy student_guardians_read on public.student_guardians for select to authenticated using (public.is_platform_super_admin() or public.can_read_student(school_id, student_id));
  create policy student_guardians_manage on public.student_guardians for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));

  create policy student_enrollments_read on public.student_enrollments for select to authenticated using (public.is_platform_super_admin() or public.can_read_student(school_id, student_id));
  create policy student_enrollments_manage on public.student_enrollments for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));
exception when duplicate_object then null;
END $schoolnest$;

-- Step 4: Fees and Finance.
DO $schoolnest$
begin
  create type public.fee_billing_frequency as enum ('termly', 'session', 'one_time', 'monthly', 'custom');
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create type public.fee_applies_to as enum ('all_students', 'section', 'class', 'arm', 'individual');
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create type public.fee_adjustment_type as enum ('discount', 'scholarship', 'waiver', 'surcharge', 'sibling_discount', 'correction');
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create type public.adjustment_amount_type as enum ('fixed', 'percentage');
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create type public.finance_approval_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create type public.invoice_status as enum ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled', 'void');
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create type public.payment_method as enum ('cash', 'bank_transfer', 'pos', 'cheque', 'mobile_money', 'online', 'other');
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create type public.payment_status as enum ('pending', 'confirmed', 'rejected', 'reversed');
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create type public.receipt_status as enum ('issued', 'void');
exception when duplicate_object then null;
END $schoolnest$;

DO $schoolnest$
begin
  create type public.finance_note_type as enum ('general', 'correction', 'follow_up', 'dispute', 'approval');
exception when duplicate_object then null;
END $schoolnest$;

create table if not exists public.fee_categories (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, code),
  unique (school_id, id)
);

create table if not exists public.fee_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  category_id uuid,
  name text not null,
  code text not null,
  description text,
  amount numeric(12,2) not null default 0,
  billing_frequency public.fee_billing_frequency not null default 'termly',
  applies_to public.fee_applies_to not null default 'class',
  is_mandatory boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, code),
  unique (school_id, id),
  check (amount >= 0),
  foreign key (school_id, category_id) references public.fee_categories(school_id, id) on delete set null
);

create table if not exists public.class_fee_structures (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_session_id uuid not null,
  term_id uuid,
  class_id uuid not null,
  arm_id uuid,
  fee_item_id uuid not null,
  amount numeric(12,2) not null,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, academic_session_id, term_id, class_id, arm_id, fee_item_id),
  unique (school_id, id),
  check (amount >= 0),
  foreign key (school_id, academic_session_id) references public.academic_sessions(school_id, id) on delete cascade,
  foreign key (school_id, term_id) references public.terms(school_id, id) on delete cascade,
  foreign key (school_id, class_id) references public.classes(school_id, id) on delete cascade,
  foreign key (school_id, arm_id) references public.class_arms(school_id, id) on delete cascade,
  foreign key (school_id, fee_item_id) references public.fee_items(school_id, id) on delete cascade
);


create table if not exists public.student_optional_fees (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null,
  academic_session_id uuid not null,
  term_id uuid,
  class_fee_structure_id uuid not null,
  amount numeric(12,2) not null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  notes text,
  created_by_user_profile_id uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_id, academic_session_id, term_id, class_fee_structure_id),
  unique (school_id, id),
  check (amount >= 0),
  foreign key (school_id, student_id) references public.students(school_id, id) on delete cascade,
  foreign key (school_id, academic_session_id) references public.academic_sessions(school_id, id) on delete cascade,
  foreign key (school_id, term_id) references public.terms(school_id, id) on delete cascade,
  foreign key (school_id, class_fee_structure_id) references public.class_fee_structures(school_id, id) on delete cascade
);
create table if not exists public.student_fee_adjustments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null,
  academic_session_id uuid not null,
  term_id uuid,
  adjustment_type public.fee_adjustment_type not null,
  title text not null,
  description text,
  amount numeric(12,2) not null,
  amount_type public.adjustment_amount_type not null default 'fixed',
  applies_to_fee_item_id uuid,
  approved_by_user_profile_id uuid references public.users_profile(id) on delete set null,
  status public.finance_approval_status not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id),
  check ((amount_type = 'percentage' and amount between 0 and 100) or (amount_type = 'fixed' and amount >= 0)),
  foreign key (school_id, student_id) references public.students(school_id, id) on delete cascade,
  foreign key (school_id, academic_session_id) references public.academic_sessions(school_id, id) on delete cascade,
  foreign key (school_id, term_id) references public.terms(school_id, id) on delete cascade,
  foreign key (school_id, applies_to_fee_item_id) references public.fee_items(school_id, id) on delete set null
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null,
  academic_session_id uuid not null,
  term_id uuid,
  invoice_number text not null,
  title text not null,
  subtotal_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  adjustment_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  balance_amount numeric(12,2) not null default 0,
  status public.invoice_status not null default 'draft',
  due_date date,
  issued_at timestamptz,
  notes text,
  created_by_user_profile_id uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, invoice_number),
  unique (school_id, id),
  check (subtotal_amount >= 0 and discount_amount >= 0 and total_amount >= 0 and paid_amount >= 0 and balance_amount >= 0),
  foreign key (school_id, student_id) references public.students(school_id, id) on delete cascade,
  foreign key (school_id, academic_session_id) references public.academic_sessions(school_id, id) on delete cascade,
  foreign key (school_id, term_id) references public.terms(school_id, id) on delete cascade
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  invoice_id uuid not null,
  fee_item_id uuid,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_amount numeric(12,2) not null,
  line_amount numeric(12,2) not null,
  is_adjustment boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quantity > 0 and unit_amount >= 0 and line_amount >= 0),
  foreign key (school_id, invoice_id) references public.invoices(school_id, id) on delete cascade,
  foreign key (school_id, fee_item_id) references public.fee_items(school_id, id) on delete set null
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null,
  invoice_id uuid,
  payment_reference text not null,
  amount numeric(12,2) not null,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'confirmed',
  paid_at timestamptz not null default now(),
  received_by_user_profile_id uuid references public.users_profile(id) on delete set null,
  payer_name text,
  payer_phone text,
  bank_name text,
  transaction_note text,
  evidence_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, payment_reference),
  unique (school_id, id),
  check (amount > 0),
  foreign key (school_id, student_id) references public.students(school_id, id) on delete cascade,
  foreign key (school_id, invoice_id) references public.invoices(school_id, id) on delete set null
);

create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  payment_id uuid not null,
  invoice_id uuid not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payment_id, invoice_id),
  check (amount > 0),
  foreign key (school_id, payment_id) references public.payments(school_id, id) on delete cascade,
  foreign key (school_id, invoice_id) references public.invoices(school_id, id) on delete cascade
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  payment_id uuid not null,
  receipt_number text not null,
  student_id uuid not null,
  invoice_id uuid,
  amount numeric(12,2) not null,
  issued_at timestamptz not null default now(),
  issued_by_user_profile_id uuid references public.users_profile(id) on delete set null,
  receipt_status public.receipt_status not null default 'issued',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, receipt_number),
  unique (school_id, id),
  check (amount > 0),
  foreign key (school_id, payment_id) references public.payments(school_id, id) on delete cascade,
  foreign key (school_id, student_id) references public.students(school_id, id) on delete cascade,
  foreign key (school_id, invoice_id) references public.invoices(school_id, id) on delete set null
);

create table if not exists public.finance_audit_notes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid,
  invoice_id uuid,
  payment_id uuid,
  note text not null,
  note_type public.finance_note_type not null default 'general',
  created_by_user_profile_id uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (school_id, student_id) references public.students(school_id, id) on delete cascade,
  foreign key (school_id, invoice_id) references public.invoices(school_id, id) on delete cascade,
  foreign key (school_id, payment_id) references public.payments(school_id, id) on delete cascade
);

create index if not exists fee_categories_school_id_idx on public.fee_categories(school_id);
create index if not exists fee_items_school_id_idx on public.fee_items(school_id);
create index if not exists class_fee_structures_school_class_idx on public.class_fee_structures(school_id, class_id, arm_id);
create index if not exists student_optional_fees_student_idx on public.student_optional_fees(school_id, student_id, status);
create index if not exists student_optional_fees_class_fee_idx on public.student_optional_fees(class_fee_structure_id);
create unique index if not exists student_optional_fees_session_unique_idx on public.student_optional_fees(school_id, student_id, academic_session_id, class_fee_structure_id) where term_id is null;
create unique index if not exists student_optional_fees_term_unique_idx on public.student_optional_fees(school_id, student_id, academic_session_id, term_id, class_fee_structure_id) where term_id is not null;
create index if not exists student_fee_adjustments_student_idx on public.student_fee_adjustments(school_id, student_id);
create index if not exists invoices_school_status_idx on public.invoices(school_id, status);
create index if not exists invoices_student_idx on public.invoices(student_id);
create index if not exists invoice_items_invoice_idx on public.invoice_items(invoice_id);
create index if not exists payments_school_status_idx on public.payments(school_id, payment_status, paid_at desc);
create index if not exists payments_student_idx on public.payments(student_id);
create index if not exists payment_allocations_invoice_idx on public.payment_allocations(invoice_id);
create index if not exists receipts_school_issued_idx on public.receipts(school_id, issued_at desc);
create index if not exists finance_audit_notes_school_idx on public.finance_audit_notes(school_id, created_at desc);

DO $schoolnest$
begin
  create trigger fee_categories_set_updated_at before update on public.fee_categories for each row execute function public.set_updated_at();
  create trigger fee_items_set_updated_at before update on public.fee_items for each row execute function public.set_updated_at();
  create trigger class_fee_structures_set_updated_at before update on public.class_fee_structures for each row execute function public.set_updated_at();
  create trigger student_optional_fees_set_updated_at before update on public.student_optional_fees for each row execute function public.set_updated_at();
  create trigger student_fee_adjustments_set_updated_at before update on public.student_fee_adjustments for each row execute function public.set_updated_at();
  create trigger invoices_set_updated_at before update on public.invoices for each row execute function public.set_updated_at();
  create trigger invoice_items_set_updated_at before update on public.invoice_items for each row execute function public.set_updated_at();
  create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
  create trigger payment_allocations_set_updated_at before update on public.payment_allocations for each row execute function public.set_updated_at();
  create trigger receipts_set_updated_at before update on public.receipts for each row execute function public.set_updated_at();
exception when duplicate_object then null;
END $schoolnest$;

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

create or replace function public.can_read_finance_student(target_school_id uuid, target_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_super_admin()
    or public.has_school_role(target_school_id, array['school_owner','principal','head_teacher','school_admin','bursar'])
    or public.is_guardian_of_student(target_school_id, target_student_id);
$$;

alter table public.fee_categories enable row level security;
alter table public.fee_items enable row level security;
alter table public.class_fee_structures enable row level security;
alter table public.student_optional_fees enable row level security;
alter table public.student_fee_adjustments enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.receipts enable row level security;
alter table public.finance_audit_notes enable row level security;

DO $schoolnest$
begin
  create policy fee_categories_read on public.fee_categories for select to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));
  create policy fee_categories_manage on public.fee_categories for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));

  create policy fee_items_read on public.fee_items for select to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));
  create policy fee_items_manage on public.fee_items for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));

  create policy class_fee_structures_read on public.class_fee_structures for select to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));
  create policy class_fee_structures_manage on public.class_fee_structures for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));

  create policy student_optional_fees_read on public.student_optional_fees for select to authenticated using (public.can_read_finance_student(school_id, student_id));
  create policy student_optional_fees_manage on public.student_optional_fees for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));

  create policy student_fee_adjustments_read on public.student_fee_adjustments for select to authenticated using (public.can_read_finance_student(school_id, student_id));
  create policy student_fee_adjustments_manage on public.student_fee_adjustments for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));

  create policy invoices_read on public.invoices for select to authenticated using (public.can_read_finance_student(school_id, student_id));
  create policy invoices_manage on public.invoices for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));

  create policy invoice_items_read on public.invoice_items for select to authenticated using (public.is_platform_super_admin() or exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and public.can_read_finance_student(i.school_id, i.student_id)));
  create policy invoice_items_manage on public.invoice_items for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));

  create policy payments_read on public.payments for select to authenticated using (public.can_read_finance_student(school_id, student_id));
  create policy payments_manage on public.payments for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));

  create policy payment_allocations_read on public.payment_allocations for select to authenticated using (public.is_platform_super_admin() or exists (select 1 from public.invoices i where i.id = payment_allocations.invoice_id and public.can_read_finance_student(i.school_id, i.student_id)));
  create policy payment_allocations_manage on public.payment_allocations for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));

  create policy receipts_read on public.receipts for select to authenticated using (public.can_read_finance_student(school_id, student_id));
  create policy receipts_manage on public.receipts for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));

  create policy finance_audit_notes_read on public.finance_audit_notes for select to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));
  create policy finance_audit_notes_manage on public.finance_audit_notes for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));
exception when duplicate_object then null;
END $schoolnest$;











-- Import history is defined in database/migrations/step-4-9-data-imports.sql.
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
create policy data_import_jobs_tenant_select on public.data_import_jobs for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(school_id));
drop policy if exists data_import_jobs_tenant_write on public.data_import_jobs;
create policy data_import_jobs_tenant_write on public.data_import_jobs for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));
drop policy if exists data_import_errors_tenant_select on public.data_import_errors;
create policy data_import_errors_tenant_select on public.data_import_errors for select to authenticated using (public.is_platform_super_admin() or public.is_school_member(school_id));
drop policy if exists data_import_errors_tenant_write on public.data_import_errors;
create policy data_import_errors_tenant_write on public.data_import_errors for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));



