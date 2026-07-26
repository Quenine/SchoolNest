-- Step 5.2: Step 5 closure and database-contract correction
-- Prerequisite: Step 5.1 has already succeeded. Existing installations must not rerun Step 5.1.

begin;

do $schoolnest$
declare
  missing_objects text[];
begin
  select array_agg(required_object order by required_object)
  into missing_objects
  from unnest(array[
    'public.class_staff_assignments',
    'public.attendance_registers',
    'public.attendance_entries',
    'public.announcements',
    'public.announcement_targets',
    'public.announcement_reads',
    'public.staff_profiles',
    'public.student_enrollments',
    'public.students',
    'public.users_profile',
    'public.audit_logs'
  ]) required_object
  where to_regclass(required_object) is null;

  if missing_objects is not null then
    raise exception 'Step 5.2 missing prerequisite tables: %', array_to_string(missing_objects, ', ');
  end if;

  select array_agg(required_function order by required_function)
  into missing_objects
  from unnest(array[
    'public.is_platform_super_admin()',
    'public.is_school_member(uuid)',
    'public.has_school_role(uuid,text[])',
    'public.has_active_class_assignment(uuid,uuid,uuid,uuid)',
    'public.can_view_announcement(uuid)',
    'public.save_attendance_register(uuid,uuid,uuid,uuid,uuid,date,jsonb,boolean)',
    'public.transition_attendance_register(uuid,text,text)'
  ]) required_function
  where to_regprocedure(required_function) is null;

  if missing_objects is not null then
    raise exception 'Step 5.2 missing prerequisite functions: %', array_to_string(missing_objects, ', ');
  end if;
end $schoolnest$;

-- Composite relationships prevent an arm from being paired with a class from another tenant/context.
do $schoolnest$
begin
  if not exists (select 1 from pg_constraint where conname = 'class_arms_school_class_id_key') then
    alter table public.class_arms
      add constraint class_arms_school_class_id_key unique (school_id, class_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'class_staff_assignment_arm_matches_class_fkey') then
    alter table public.class_staff_assignments
      add constraint class_staff_assignment_arm_matches_class_fkey
      foreign key (school_id, class_id, arm_id)
      references public.class_arms(school_id, class_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'attendance_register_arm_matches_class_fkey') then
    alter table public.attendance_registers
      add constraint attendance_register_arm_matches_class_fkey
      foreign key (school_id, class_id, arm_id)
      references public.class_arms(school_id, class_id, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'announcement_target_arm_matches_class_fkey') then
    alter table public.announcement_targets
      add constraint announcement_target_arm_matches_class_fkey
      foreign key (school_id, class_id, arm_id)
      references public.class_arms(school_id, class_id, id) on delete cascade;
  end if;
end $schoolnest$;

create or replace function public.has_active_class_assignment(
  target_school_id uuid,
  target_session_id uuid,
  target_class_id uuid,
  target_arm_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $schoolnest$
  select auth.uid() is not null
    and exists (
      select 1
      from public.users_profile up
      join public.staff_profiles sp
        on sp.school_id = target_school_id
       and sp.user_profile_id = up.id
       and sp.employment_status = 'active'
      join public.class_staff_assignments csa
        on csa.school_id = sp.school_id
       and csa.staff_profile_id = sp.id
      where up.id = auth.uid()
        and up.school_id = target_school_id
        and up.is_active
        and csa.academic_session_id = target_session_id
        and csa.class_id = target_class_id
        and (csa.arm_id is null or csa.arm_id is not distinct from target_arm_id)
        and csa.is_active
        and (csa.starts_on is null or csa.starts_on <= current_date)
        and (csa.ends_on is null or csa.ends_on >= current_date)
    );
$schoolnest$;

create or replace function public.can_parent_view_attendance_register(
  target_school_id uuid,
  target_register_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $schoolnest$
  select auth.uid() is not null
    and exists (
      select 1
      from public.attendance_registers ar
      join public.attendance_entries ae
        on ae.school_id = ar.school_id
       and ae.attendance_register_id = ar.id
      join public.student_guardians sg
        on sg.school_id = ae.school_id
       and sg.student_id = ae.student_id
      join public.parent_guardians pg
        on pg.school_id = sg.school_id
       and pg.id = sg.guardian_id
      where ar.school_id = target_school_id
        and ar.id = target_register_id
        and pg.user_profile_id = auth.uid()
    );
$schoolnest$;

revoke all on function public.can_parent_view_attendance_register(uuid,uuid) from public;
revoke all on function public.can_parent_view_attendance_register(uuid,uuid) from anon;
grant execute on function public.can_parent_view_attendance_register(uuid,uuid) to authenticated;

create or replace function public.can_view_announcement(target_announcement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $schoolnest$
  select auth.uid() is not null and exists (
    select 1
    from public.announcements a
    where a.id = target_announcement_id
      and a.status in ('published', 'scheduled')
      and coalesce(a.publish_at, a.published_at, a.created_at) <= now()
      and (a.expires_at is null or a.expires_at > now())
      and a.archived_at is null
      and (
        public.is_platform_super_admin()
        or public.has_school_role(a.school_id, array['school_owner','principal','head_teacher','school_admin']::text[])
        or (a.audience_scope = 'school' and public.is_school_member(a.school_id))
        or (
          a.audience_scope = 'roles'
          and exists (
            select 1
            from public.announcement_targets at
            join public.roles r on r.code = at.target_role
            join public.user_roles ur
              on ur.role_id = r.id
             and ur.school_id = a.school_id
             and ur.user_id = auth.uid()
            where at.school_id = a.school_id
              and at.announcement_id = a.id
              and at.target_type = 'role'
          )
        )
        or (
          a.audience_scope = 'classes'
          and exists (
            select 1
            from public.announcement_targets at
            where at.school_id = a.school_id
              and at.announcement_id = a.id
              and at.target_type in ('class','arm')
              and (
                public.has_active_class_assignment(a.school_id, (
                  select csa.academic_session_id
                  from public.class_staff_assignments csa
                  join public.staff_profiles sp
                    on sp.school_id = csa.school_id
                   and sp.id = csa.staff_profile_id
                  join public.academic_sessions assignment_session
                    on assignment_session.school_id = csa.school_id
                   and assignment_session.id = csa.academic_session_id
                   and assignment_session.is_current = true
                  where csa.school_id = a.school_id
                    and csa.class_id = at.class_id
                    and sp.user_profile_id = auth.uid()
                    and sp.employment_status = 'active'
                    and csa.is_active
                    and (csa.starts_on is null or csa.starts_on <= current_date)
                    and (csa.ends_on is null or csa.ends_on >= current_date)
                    and (csa.arm_id is null or csa.arm_id is not distinct from at.arm_id)
                  order by csa.created_at desc
                  limit 1
                ), at.class_id, at.arm_id)
                or exists (
                  select 1
                  from public.parent_guardians pg
                  join public.student_guardians sg
                    on sg.school_id = pg.school_id
                   and sg.guardian_id = pg.id
                  join public.student_enrollments se
                    on se.school_id = sg.school_id
                   and se.student_id = sg.student_id
                  join public.academic_sessions current_session
                    on current_session.school_id = se.school_id
                   and current_session.id = se.academic_session_id
                   and current_session.is_current = true
                  where pg.school_id = a.school_id
                    and pg.user_profile_id = auth.uid()
                    and se.enrollment_status = 'active'
                    and se.class_id = at.class_id
                    and (at.arm_id is null or se.arm_id = at.arm_id)
                )
              )
          )
        )
      )
  );
$schoolnest$;

alter table public.class_staff_assignments enable row level security;
alter table public.attendance_registers enable row level security;
alter table public.attendance_entries enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_targets enable row level security;
alter table public.announcement_reads enable row level security;

revoke all on table public.class_staff_assignments from anon, public, authenticated;
revoke all on table public.attendance_registers from anon, public, authenticated;
revoke all on table public.attendance_entries from anon, public, authenticated;
revoke all on table public.announcements from anon, public, authenticated;
revoke all on table public.announcement_targets from anon, public, authenticated;
revoke all on table public.announcement_reads from anon, public, authenticated;

grant select, insert, update on table public.class_staff_assignments to authenticated;
grant select on table public.attendance_registers, public.attendance_entries to authenticated;
grant select, insert, update on table public.announcements to authenticated;
grant select, insert, update on table public.announcement_targets to authenticated;
grant select, insert, update on table public.announcement_reads to authenticated;

drop policy if exists class_staff_admin on public.class_staff_assignments;
drop policy if exists class_staff_admin_select on public.class_staff_assignments;
drop policy if exists class_staff_admin_insert on public.class_staff_assignments;
drop policy if exists class_staff_admin_update on public.class_staff_assignments;
drop policy if exists class_staff_teacher_read on public.class_staff_assignments;
create policy class_staff_admin_select on public.class_staff_assignments for select to authenticated
  using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));
create policy class_staff_admin_insert on public.class_staff_assignments for insert to authenticated
  with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));
create policy class_staff_admin_update on public.class_staff_assignments for update to authenticated
  using (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]))
  with check (public.is_platform_super_admin() or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[]));
create policy class_staff_teacher_read on public.class_staff_assignments for select to authenticated
  using (exists (
    select 1 from public.staff_profiles sp
    where sp.school_id = class_staff_assignments.school_id
      and sp.id = class_staff_assignments.staff_profile_id
      and sp.user_profile_id = auth.uid()
      and sp.employment_status = 'active'
  ));

drop policy if exists attendance_register_manage on public.attendance_registers;
drop policy if exists attendance_register_access on public.attendance_registers;
drop policy if exists attendance_register_parent_read on public.attendance_registers;
create policy attendance_register_staff_select on public.attendance_registers for select to authenticated
  using (
    public.is_platform_super_admin()
    or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])
    or public.has_active_class_assignment(school_id, academic_session_id, class_id, arm_id)
  );
create policy attendance_register_parent_read on public.attendance_registers for select to authenticated
  using (public.can_parent_view_attendance_register(school_id, id));

drop policy if exists attendance_entries_staff on public.attendance_entries;
drop policy if exists attendance_entries_staff_select on public.attendance_entries;
drop policy if exists attendance_entries_parent_read on public.attendance_entries;
create policy attendance_entries_staff_select on public.attendance_entries for select to authenticated
  using (exists (
    select 1 from public.attendance_registers ar
    where ar.school_id = attendance_entries.school_id
      and ar.id = attendance_entries.attendance_register_id
      and (
        public.is_platform_super_admin()
        or public.has_school_role(ar.school_id, array['school_owner','principal','head_teacher','school_admin']::text[])
        or public.has_active_class_assignment(ar.school_id, ar.academic_session_id, ar.class_id, ar.arm_id)
      )
  ));
create policy attendance_entries_parent_read on public.attendance_entries for select to authenticated
  using (exists (
    select 1
    from public.student_guardians sg
    join public.parent_guardians pg
      on pg.school_id = sg.school_id and pg.id = sg.guardian_id
    where sg.school_id = attendance_entries.school_id
      and sg.student_id = attendance_entries.student_id
      and pg.user_profile_id = auth.uid()
  ));

drop policy if exists announcements_member_read on public.announcements;
drop policy if exists announcements_admin_manage on public.announcements;
drop policy if exists announcements_manage_select on public.announcements;
drop policy if exists announcements_manage_insert on public.announcements;
drop policy if exists announcements_manage_update on public.announcements;
drop policy if exists announcements_visible_read on public.announcements;
create policy announcements_visible_read on public.announcements for select to authenticated
  using (
    public.can_view_announcement(id)
    or created_by_user_profile_id = auth.uid()
    or public.is_platform_super_admin()
    or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])
  );
create policy announcements_manage_insert on public.announcements for insert to authenticated
  with check (
    created_by_user_profile_id = auth.uid()
    and (
      public.is_platform_super_admin()
      or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])
      or (
        audience_scope = 'classes'
        and exists (
          select 1
          from public.users_profile up
          join public.staff_profiles sp on sp.school_id = up.school_id and sp.user_profile_id = up.id and sp.employment_status = 'active'
          join public.class_staff_assignments csa on csa.school_id = sp.school_id and csa.staff_profile_id = sp.id
          join public.academic_sessions assignment_session on assignment_session.school_id = csa.school_id and assignment_session.id = csa.academic_session_id and assignment_session.is_current = true
          where up.id = auth.uid() and up.school_id = announcements.school_id and up.is_active
            and csa.is_active
            and (csa.starts_on is null or csa.starts_on <= current_date)
            and (csa.ends_on is null or csa.ends_on >= current_date)
        )
      )
    )
  );
create policy announcements_manage_update on public.announcements for update to authenticated
  using (
    public.is_platform_super_admin()
    or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])
    or (
      created_by_user_profile_id = auth.uid() and audience_scope = 'classes'
      and exists (
        select 1 from public.users_profile up
        join public.staff_profiles sp on sp.school_id = up.school_id and sp.user_profile_id = up.id and sp.employment_status = 'active'
        join public.class_staff_assignments csa on csa.school_id = sp.school_id and csa.staff_profile_id = sp.id
          join public.academic_sessions assignment_session on assignment_session.school_id = csa.school_id and assignment_session.id = csa.academic_session_id and assignment_session.is_current = true
        where up.id = auth.uid() and up.school_id = announcements.school_id and up.is_active
          and csa.is_active
          and (csa.starts_on is null or csa.starts_on <= current_date)
          and (csa.ends_on is null or csa.ends_on >= current_date)
      )
    )
  )
  with check (
    public.is_platform_super_admin()
    or public.has_school_role(school_id, array['school_owner','principal','head_teacher','school_admin']::text[])
    or (
      created_by_user_profile_id = auth.uid() and audience_scope = 'classes'
      and exists (
        select 1 from public.users_profile up
        join public.staff_profiles sp on sp.school_id = up.school_id and sp.user_profile_id = up.id and sp.employment_status = 'active'
        join public.class_staff_assignments csa on csa.school_id = sp.school_id and csa.staff_profile_id = sp.id
          join public.academic_sessions assignment_session on assignment_session.school_id = csa.school_id and assignment_session.id = csa.academic_session_id and assignment_session.is_current = true
        where up.id = auth.uid() and up.school_id = announcements.school_id and up.is_active
          and csa.is_active
          and (csa.starts_on is null or csa.starts_on <= current_date)
          and (csa.ends_on is null or csa.ends_on >= current_date)
      )
    )
  );

drop policy if exists announcement_targets_member_read on public.announcement_targets;
drop policy if exists announcement_targets_manage on public.announcement_targets;
drop policy if exists announcement_targets_visible_read on public.announcement_targets;
drop policy if exists announcement_targets_manage_select on public.announcement_targets;
drop policy if exists announcement_targets_manage_insert on public.announcement_targets;
drop policy if exists announcement_targets_manage_update on public.announcement_targets;
create policy announcement_targets_visible_read on public.announcement_targets for select to authenticated
  using (
    public.can_view_announcement(announcement_id)
    or exists (
      select 1 from public.announcements a
      where a.school_id = announcement_targets.school_id
        and a.id = announcement_targets.announcement_id
        and (
          a.created_by_user_profile_id = auth.uid()
          or public.is_platform_super_admin()
          or public.has_school_role(a.school_id, array['school_owner','principal','head_teacher','school_admin']::text[])
        )
    )
  );
create policy announcement_targets_manage_insert on public.announcement_targets for insert to authenticated
  with check (exists (
    select 1
    from public.announcements a
    where a.school_id = announcement_targets.school_id
      and a.id = announcement_targets.announcement_id
      and (
        public.is_platform_super_admin()
        or public.has_school_role(a.school_id, array['school_owner','principal','head_teacher','school_admin']::text[])
        or (
          a.created_by_user_profile_id = auth.uid()
          and a.audience_scope = 'classes'
          and announcement_targets.target_type in ('class','arm')
          and exists (
            select 1
            from public.class_staff_assignments csa
            join public.staff_profiles sp
              on sp.school_id = csa.school_id and sp.id = csa.staff_profile_id
            join public.academic_sessions assignment_session
              on assignment_session.school_id = csa.school_id
             and assignment_session.id = csa.academic_session_id
             and assignment_session.is_current = true
            where csa.school_id = a.school_id
              and csa.class_id = announcement_targets.class_id
              and (csa.arm_id is null or csa.arm_id is not distinct from announcement_targets.arm_id)
              and csa.is_active
              and (csa.starts_on is null or csa.starts_on <= current_date)
              and (csa.ends_on is null or csa.ends_on >= current_date)
              and sp.user_profile_id = auth.uid()
              and sp.employment_status = 'active'
          )
        )
      )
  ));
create policy announcement_targets_manage_update on public.announcement_targets for update to authenticated
  using (exists (
    select 1 from public.announcements a
    where a.school_id = announcement_targets.school_id
      and a.id = announcement_targets.announcement_id
      and (
        public.is_platform_super_admin()
        or public.has_school_role(a.school_id, array['school_owner','principal','head_teacher','school_admin']::text[])
        or (
          a.created_by_user_profile_id = auth.uid()
          and a.audience_scope = 'classes'
          and announcement_targets.target_type in ('class','arm')
          and exists (
            select 1 from public.class_staff_assignments csa
            join public.staff_profiles sp on sp.school_id = csa.school_id and sp.id = csa.staff_profile_id
            join public.academic_sessions assignment_session on assignment_session.school_id = csa.school_id and assignment_session.id = csa.academic_session_id and assignment_session.is_current = true
            where csa.school_id = a.school_id
              and csa.class_id = announcement_targets.class_id
              and (csa.arm_id is null or csa.arm_id is not distinct from announcement_targets.arm_id)
              and csa.is_active
              and (csa.starts_on is null or csa.starts_on <= current_date)
              and (csa.ends_on is null or csa.ends_on >= current_date)
              and sp.user_profile_id = auth.uid()
              and sp.employment_status = 'active'
          )
        )
      )
  ))
  with check (exists (
    select 1 from public.announcements a
    where a.school_id = announcement_targets.school_id
      and a.id = announcement_targets.announcement_id
      and (
        public.is_platform_super_admin()
        or public.has_school_role(a.school_id, array['school_owner','principal','head_teacher','school_admin']::text[])
        or (
          a.created_by_user_profile_id = auth.uid()
          and a.audience_scope = 'classes'
          and announcement_targets.target_type in ('class','arm')
          and exists (
            select 1 from public.class_staff_assignments csa
            join public.staff_profiles sp on sp.school_id = csa.school_id and sp.id = csa.staff_profile_id
            join public.academic_sessions assignment_session on assignment_session.school_id = csa.school_id and assignment_session.id = csa.academic_session_id and assignment_session.is_current = true
            where csa.school_id = a.school_id
              and csa.class_id = announcement_targets.class_id
              and (csa.arm_id is null or csa.arm_id is not distinct from announcement_targets.arm_id)
              and csa.is_active
              and (csa.starts_on is null or csa.starts_on <= current_date)
              and (csa.ends_on is null or csa.ends_on >= current_date)
              and sp.user_profile_id = auth.uid()
              and sp.employment_status = 'active'
          )
        )
      )
  ));
drop policy if exists announcement_reads_self on public.announcement_reads;
drop policy if exists announcement_reads_self_select on public.announcement_reads;
drop policy if exists announcement_reads_self_insert on public.announcement_reads;
drop policy if exists announcement_reads_self_update on public.announcement_reads;
drop policy if exists announcement_reads_admin_select on public.announcement_reads;
create policy announcement_reads_self_select on public.announcement_reads for select to authenticated
  using (user_profile_id = auth.uid());
create policy announcement_reads_admin_select on public.announcement_reads for select to authenticated
  using (
    public.is_platform_super_admin()
    or public.has_school_role(
      school_id,
      array['school_owner','principal','head_teacher','school_admin']::text[]
    )
  );
create policy announcement_reads_self_insert on public.announcement_reads for insert to authenticated
  with check (
    user_profile_id = auth.uid()
    and public.is_school_member(school_id)
    and public.can_view_announcement(announcement_id)
  );
create policy announcement_reads_self_update on public.announcement_reads for update to authenticated
  using (user_profile_id = auth.uid())
  with check (
    user_profile_id = auth.uid()
    and public.is_school_member(school_id)
    and public.can_view_announcement(announcement_id)
  );

-- PostgreSQL cannot change a function's return type with CREATE OR REPLACE.
drop function public.save_attendance_register(uuid,uuid,uuid,uuid,uuid,date,jsonb,boolean);

create function public.save_attendance_register(
  target_school_id uuid,
  target_session_id uuid,
  target_term_id uuid,
  target_class_id uuid,
  target_arm_id uuid,
  target_date date,
  entry_changes jsonb default '[]'::jsonb,
  submit_register boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $schoolnest$
declare
  actor_profile_id uuid;
  register_id uuid;
  register_status text;
  is_admin boolean;
  unmarked_count integer;
  eligible_count integer;
  existing_snapshot_count integer;
  added_count integer;
  already_present_count integer;
  historical_preserved_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select up.id
  into actor_profile_id
  from public.users_profile up
  where up.id = auth.uid()
    and up.is_active;

  if actor_profile_id is null then
    raise exception 'An active authenticated profile is required';
  end if;
  if target_school_id is null or (not public.is_platform_super_admin() and not public.is_school_member(target_school_id)) then
    raise exception 'School membership is required';
  end if;
  if not exists (
    select 1 from public.users_profile up
    where up.id = actor_profile_id and up.school_id = target_school_id
  ) and not public.is_platform_super_admin() then
    raise exception 'Profile does not belong to the target school';
  end if;
  if target_date is null or target_date > current_date then
    raise exception 'Future or missing attendance dates are not allowed';
  end if;

  is_admin := public.is_platform_super_admin()
    or public.has_school_role(target_school_id, array['school_owner','principal','head_teacher','school_admin']::text[]);
  if not is_admin
    and not public.has_active_class_assignment(target_school_id, target_session_id, target_class_id, target_arm_id) then
    raise exception 'Not authorized for this class';
  end if;

  if not exists (
    select 1 from public.academic_sessions s
    where s.school_id = target_school_id and s.id = target_session_id
  ) then
    raise exception 'Invalid academic session';
  end if;
  if not exists (
    select 1 from public.terms t
    where t.school_id = target_school_id
      and t.id = target_term_id
      and t.academic_session_id = target_session_id
  ) then
    raise exception 'Invalid term and session';
  end if;
  if not exists (
    select 1 from public.classes c
    where c.school_id = target_school_id and c.id = target_class_id
  ) then
    raise exception 'Invalid class';
  end if;
  if target_arm_id is not null and not exists (
    select 1 from public.class_arms ca
    where ca.school_id = target_school_id
      and ca.id = target_arm_id
      and ca.class_id = target_class_id
  ) then
    raise exception 'Invalid class arm';
  end if;

  insert into public.attendance_registers (
    school_id, academic_session_id, term_id, class_id, arm_id, attendance_date,
    created_by_user_profile_id
  )
  values (
    target_school_id, target_session_id, target_term_id, target_class_id,
    target_arm_id, target_date, actor_profile_id
  )
  on conflict do nothing;

  select ar.id, ar.status
  into register_id, register_status
  from public.attendance_registers ar
  where ar.school_id = target_school_id
    and ar.academic_session_id = target_session_id
    and ar.term_id = target_term_id
    and ar.class_id = target_class_id
    and ar.arm_id is not distinct from target_arm_id
    and ar.attendance_date = target_date
  for update;

  if register_id is null then
    raise exception 'Attendance register identity could not be resolved';
  end if;
  if register_status <> 'draft' then
    raise exception 'Only draft registers can be changed';
  end if;

  select count(*)
  into existing_snapshot_count
  from public.attendance_entries ae
  where ae.school_id = target_school_id
    and ae.attendance_register_id = register_id;

  select count(distinct se.student_id)
  into eligible_count
  from public.student_enrollments se
  join public.students st
    on st.school_id = se.school_id
   and st.id = se.student_id
  where se.school_id = target_school_id
    and se.academic_session_id = target_session_id
    and se.class_id = target_class_id
    and se.enrollment_status = 'active'
    and st.student_status = 'active'
    and (target_arm_id is null or se.arm_id = target_arm_id);

  select count(distinct se.student_id)
  into already_present_count
  from public.student_enrollments se
  join public.students st
    on st.school_id = se.school_id
   and st.id = se.student_id
  join public.attendance_entries ae
    on ae.school_id = se.school_id
   and ae.student_id = se.student_id
   and ae.attendance_register_id = register_id
  where se.school_id = target_school_id
    and se.academic_session_id = target_session_id
    and se.class_id = target_class_id
    and se.enrollment_status = 'active'
    and st.student_status = 'active'
    and (target_arm_id is null or se.arm_id = target_arm_id);

  select count(*)
  into historical_preserved_count
  from public.attendance_entries ae
  where ae.school_id = target_school_id
    and ae.attendance_register_id = register_id
    and not exists (
      select 1
      from public.student_enrollments se
      join public.students st
        on st.school_id = se.school_id
       and st.id = se.student_id
      where se.school_id = target_school_id
        and se.student_id = ae.student_id
        and se.academic_session_id = target_session_id
        and se.class_id = target_class_id
        and se.enrollment_status = 'active'
        and st.student_status = 'active'
        and (target_arm_id is null or se.arm_id = target_arm_id)
    );

  insert into public.attendance_entries (school_id, attendance_register_id, student_id)
  select distinct target_school_id, register_id, se.student_id
  from public.student_enrollments se
  join public.students st
    on st.school_id = se.school_id
   and st.id = se.student_id
  where se.school_id = target_school_id
    and se.academic_session_id = target_session_id
    and se.class_id = target_class_id
    and se.enrollment_status = 'active'
    and st.student_status = 'active'
    and (target_arm_id is null or se.arm_id = target_arm_id)
  on conflict (school_id, attendance_register_id, student_id) do nothing;

  get diagnostics added_count = row_count;

  if jsonb_typeof(entry_changes) <> 'array' then
    raise exception 'Invalid attendance entries';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(entry_changes) change(student_id uuid, status text, remarks text)
    left join public.attendance_entries ae
      on ae.school_id = target_school_id
     and ae.attendance_register_id = register_id
     and ae.student_id = change.student_id
    where ae.id is null
      or change.status not in ('present','absent','late','excused')
      or (change.status = 'excused' and nullif(btrim(change.remarks), '') is null)
  ) then
    raise exception 'Invalid attendance entry';
  end if;

  update public.attendance_entries ae
  set status = change.status,
      remarks = nullif(btrim(change.remarks), ''),
      marked_by_user_profile_id = actor_profile_id,
      marked_at = now(),
      updated_at = now()
  from jsonb_to_recordset(entry_changes) change(student_id uuid, status text, remarks text)
  where ae.school_id = target_school_id
    and ae.attendance_register_id = register_id
    and ae.student_id = change.student_id;

  if submit_register then
    select count(*)
    into unmarked_count
    from public.attendance_entries ae
    where ae.school_id = target_school_id
      and ae.attendance_register_id = register_id
      and ae.status is null;

    if unmarked_count > 0 then
      raise exception '% students still need an attendance status before submission.', unmarked_count;
    end if;

    update public.attendance_registers
    set status = 'submitted',
        submitted_by_user_profile_id = actor_profile_id,
        submitted_at = now(),
        updated_at = now()
    where school_id = target_school_id and id = register_id and status = 'draft';

    if not found then
      raise exception 'Only a draft register can be submitted';
    end if;

    insert into public.audit_logs (
      school_id, actor_user_id, action, entity_type, entity_id, metadata
    )
    values (
      target_school_id, auth.uid(), 'attendance.submitted', 'attendance_registers',
      register_id::text, jsonb_build_object('date', target_date)
    );
  else
    update public.attendance_registers
    set updated_at = now()
    where school_id = target_school_id and id = register_id and status = 'draft';
  end if;

  return jsonb_build_object(
    'register_id', register_id,
    'eligible_count', eligible_count,
    'existing_snapshot_count', existing_snapshot_count,
    'added_count', added_count,
    'already_present_count', already_present_count,
    'historical_preserved_count', historical_preserved_count
  );
end;
$schoolnest$;

revoke all on function public.save_attendance_register(uuid,uuid,uuid,uuid,uuid,date,jsonb,boolean) from public;
revoke all on function public.save_attendance_register(uuid,uuid,uuid,uuid,uuid,date,jsonb,boolean) from anon;
grant execute on function public.save_attendance_register(uuid,uuid,uuid,uuid,uuid,date,jsonb,boolean) to authenticated;

revoke all on function public.transition_attendance_register(uuid,text,text) from public;
revoke all on function public.transition_attendance_register(uuid,text,text) from anon;
grant execute on function public.transition_attendance_register(uuid,text,text) to authenticated;

revoke all on function public.has_active_class_assignment(uuid,uuid,uuid,uuid) from public;
revoke all on function public.has_active_class_assignment(uuid,uuid,uuid,uuid) from anon;
grant execute on function public.has_active_class_assignment(uuid,uuid,uuid,uuid) to authenticated;

revoke all on function public.can_view_announcement(uuid) from public;
revoke all on function public.can_view_announcement(uuid) from anon;
grant execute on function public.can_view_announcement(uuid) to authenticated;

commit;
