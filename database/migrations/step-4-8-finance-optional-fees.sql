-- Step 4.8 finance optional fees.
-- Run after database/schema.sql, database/seed.sql, and step-2 foundation reconciliation.
-- This migration is additive and supports Student Add-ons for optional fees.

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

create index if not exists student_optional_fees_student_idx on public.student_optional_fees(school_id, student_id, status);
create index if not exists student_optional_fees_class_fee_idx on public.student_optional_fees(class_fee_structure_id);
create unique index if not exists student_optional_fees_session_unique_idx on public.student_optional_fees(school_id, student_id, academic_session_id, class_fee_structure_id) where term_id is null;
create unique index if not exists student_optional_fees_term_unique_idx on public.student_optional_fees(school_id, student_id, academic_session_id, term_id, class_fee_structure_id) where term_id is not null;

DO $schoolnest$
begin
  create trigger student_optional_fees_set_updated_at before update on public.student_optional_fees for each row execute function public.set_updated_at();
exception when duplicate_object then null;
END $schoolnest$;

alter table public.student_optional_fees enable row level security;

DO $schoolnest$
begin
  create policy student_optional_fees_read on public.student_optional_fees for select to authenticated using (public.can_read_finance_student(school_id, student_id));
  create policy student_optional_fees_manage on public.student_optional_fees for all to authenticated using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar'])) with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin','bursar']));
exception when duplicate_object then null;
END $schoolnest$;



