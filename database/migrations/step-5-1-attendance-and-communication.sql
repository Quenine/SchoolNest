-- Step 5.1: Daily Attendance and In-app Announcements
-- Prerequisite: Step 2 foundation reconciliation and core school records must be applied.
-- Additive and safely rerunnable for objects/policies created by this migration.
do $schoolnest$
begin
 if to_regprocedure('public.is_platform_super_admin()') is null or to_regprocedure('public.is_school_member(uuid)') is null or to_regprocedure('public.has_school_role(uuid,text[])') is null then raise exception 'Step 5.1 requires canonical Step 2 RLS helpers'; end if;
 if to_regclass('public.student_enrollments') is null or to_regclass('public.staff_profiles') is null or to_regclass('public.student_guardians') is null then raise exception 'Step 5.1 requires core school record tables'; end if;
end $schoolnest$;

create table if not exists public.class_staff_assignments (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade,
 academic_session_id uuid not null, class_id uuid not null, arm_id uuid, staff_profile_id uuid not null,
 assignment_role text not null check (assignment_role in ('class_teacher','assistant_class_teacher','attendance_manager')),
 starts_on date, ends_on date, is_active boolean not null default true,
 created_by_user_profile_id uuid references public.users_profile(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(school_id,id), check(ends_on is null or starts_on is null or ends_on >= starts_on),
 foreign key(school_id,academic_session_id) references public.academic_sessions(school_id,id) on delete cascade,
 foreign key(school_id,class_id) references public.classes(school_id,id) on delete cascade,
 foreign key(school_id,arm_id) references public.class_arms(school_id,id) on delete cascade,
 foreign key(school_id,staff_profile_id) references public.staff_profiles(school_id,id) on delete cascade
);
create unique index if not exists class_staff_active_identity_idx on public.class_staff_assignments(school_id,academic_session_id,class_id,coalesce(arm_id,'00000000-0000-0000-0000-000000000000'::uuid),staff_profile_id,assignment_role) where is_active;
create index if not exists class_staff_staff_idx on public.class_staff_assignments(school_id,staff_profile_id,is_active);

create table if not exists public.attendance_registers (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade,
 academic_session_id uuid not null, term_id uuid not null, class_id uuid not null, arm_id uuid, attendance_date date not null check(attendance_date <= current_date),
 status text not null default 'draft' check(status in ('draft','submitted','locked')), notes text,
 created_by_user_profile_id uuid references public.users_profile(id) on delete set null, submitted_by_user_profile_id uuid references public.users_profile(id) on delete set null,
 submitted_at timestamptz, locked_by_user_profile_id uuid references public.users_profile(id) on delete set null, locked_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(school_id,id),
 foreign key(school_id,academic_session_id) references public.academic_sessions(school_id,id) on delete restrict,
 foreign key(school_id,term_id) references public.terms(school_id,id) on delete restrict,
 foreign key(school_id,class_id) references public.classes(school_id,id) on delete restrict,
 foreign key(school_id,arm_id) references public.class_arms(school_id,id) on delete restrict
);
create unique index if not exists attendance_register_identity_idx on public.attendance_registers(school_id,academic_session_id,term_id,attendance_date,class_id,coalesce(arm_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists attendance_school_date_idx on public.attendance_registers(school_id,attendance_date desc);
create index if not exists attendance_class_date_idx on public.attendance_registers(school_id,class_id,attendance_date desc);

create table if not exists public.attendance_entries (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade, attendance_register_id uuid not null, student_id uuid not null,
 status text check(status is null or status in ('present','absent','late','excused')), remarks text,
 marked_by_user_profile_id uuid references public.users_profile(id) on delete set null, marked_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(school_id,id), unique(school_id,attendance_register_id,student_id),
 check(status <> 'excused' or nullif(btrim(remarks),'') is not null),
 foreign key(school_id,attendance_register_id) references public.attendance_registers(school_id,id) on delete cascade,
 foreign key(school_id,student_id) references public.students(school_id,id) on delete restrict
);
create index if not exists attendance_entries_register_idx on public.attendance_entries(school_id,attendance_register_id);
create index if not exists attendance_entries_student_idx on public.attendance_entries(school_id,student_id);

create table if not exists public.announcements (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade,
 title text not null check(nullif(btrim(title),'') is not null), body text not null check(nullif(btrim(body),'') is not null),
 priority text not null default 'normal' check(priority in ('normal','important','urgent')),
 status text not null default 'draft' check(status in ('draft','scheduled','published','archived')),
 audience_scope text not null check(audience_scope in ('school','roles','classes')), publish_at timestamptz, expires_at timestamptz,
 is_pinned boolean not null default false, created_by_user_profile_id uuid references public.users_profile(id) on delete set null,
 updated_by_user_profile_id uuid references public.users_profile(id) on delete set null, published_by_user_profile_id uuid references public.users_profile(id) on delete set null,
 published_at timestamptz, archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(school_id,id),
 check(expires_at is null or expires_at > coalesce(publish_at,published_at,created_at)), check(status <> 'scheduled' or publish_at is not null)
);
create table if not exists public.announcement_targets (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade, announcement_id uuid not null,
 target_type text not null check(target_type in ('role','class','arm')), target_role text, class_id uuid, arm_id uuid, created_at timestamptz not null default now(),
 unique(school_id,id), foreign key(school_id,announcement_id) references public.announcements(school_id,id) on delete cascade,
 foreign key(school_id,class_id) references public.classes(school_id,id) on delete cascade, foreign key(school_id,arm_id) references public.class_arms(school_id,id) on delete cascade,
 check((target_type='role' and target_role is not null and class_id is null and arm_id is null) or (target_type='class' and target_role is null and class_id is not null and arm_id is null) or (target_type='arm' and target_role is null and class_id is not null and arm_id is not null))
);
create unique index if not exists announcement_target_identity_idx on public.announcement_targets(announcement_id,target_type,coalesce(target_role,''),coalesce(class_id,'00000000-0000-0000-0000-000000000000'::uuid),coalesce(arm_id,'00000000-0000-0000-0000-000000000000'::uuid));
create table if not exists public.announcement_reads (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade, announcement_id uuid not null, user_profile_id uuid not null references public.users_profile(id) on delete cascade,
 read_at timestamptz not null default now(), created_at timestamptz not null default now(), unique(school_id,announcement_id,user_profile_id),
 foreign key(school_id,announcement_id) references public.announcements(school_id,id) on delete cascade
);
create index if not exists announcements_feed_idx on public.announcements(school_id,status,publish_at desc);
create index if not exists announcement_targets_lookup_idx on public.announcement_targets(school_id,announcement_id,target_type);
create index if not exists announcement_reads_lookup_idx on public.announcement_reads(school_id,announcement_id,user_profile_id);


do $schoolnest$
begin
 if not exists(select 1 from pg_constraint where conname='class_arms_school_class_id_key') then alter table public.class_arms add constraint class_arms_school_class_id_key unique(school_id,class_id,id); end if;
 if not exists(select 1 from pg_constraint where conname='class_staff_assignment_arm_matches_class_fkey') then alter table public.class_staff_assignments add constraint class_staff_assignment_arm_matches_class_fkey foreign key(school_id,class_id,arm_id) references public.class_arms(school_id,class_id,id) on delete cascade; end if;
 if not exists(select 1 from pg_constraint where conname='attendance_register_arm_matches_class_fkey') then alter table public.attendance_registers add constraint attendance_register_arm_matches_class_fkey foreign key(school_id,class_id,arm_id) references public.class_arms(school_id,class_id,id) on delete restrict; end if;
 if not exists(select 1 from pg_constraint where conname='announcement_target_arm_matches_class_fkey') then alter table public.announcement_targets add constraint announcement_target_arm_matches_class_fkey foreign key(school_id,class_id,arm_id) references public.class_arms(school_id,class_id,id) on delete cascade; end if;
end $schoolnest$;
create or replace function public.has_active_class_assignment(target_school_id uuid,target_session_id uuid,target_class_id uuid,target_arm_id uuid default null)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and exists(select 1 from public.class_staff_assignments a join public.staff_profiles s on s.school_id=a.school_id and s.id=a.staff_profile_id where a.school_id=target_school_id and a.academic_session_id=target_session_id and a.class_id=target_class_id and (a.arm_id is null or target_arm_id is null or a.arm_id=target_arm_id) and a.is_active and (a.starts_on is null or a.starts_on<=current_date) and (a.ends_on is null or a.ends_on>=current_date) and s.user_profile_id=auth.uid() and s.employment_status='active');
$$;

revoke all on function public.has_active_class_assignment(uuid,uuid,uuid,uuid) from public; grant execute on function public.has_active_class_assignment(uuid,uuid,uuid,uuid) to authenticated;

alter table public.class_staff_assignments enable row level security; alter table public.attendance_registers enable row level security; alter table public.attendance_entries enable row level security; alter table public.announcements enable row level security; alter table public.announcement_targets enable row level security; alter table public.announcement_reads enable row level security;

do $schoolnest$
declare t text;
begin
 foreach t in array array['class_staff_assignments','attendance_registers','attendance_entries','announcements','announcement_targets','announcement_reads'] loop
  execute format('revoke all on table public.%I from anon, authenticated',t);
 end loop;
end $schoolnest$;
grant select, insert, update on table public.class_staff_assignments to authenticated;
grant select on table public.attendance_registers, public.attendance_entries to authenticated;
grant select, insert, update on table public.announcements, public.announcement_targets, public.announcement_reads to authenticated;

drop policy if exists class_staff_admin on public.class_staff_assignments;
drop policy if exists class_staff_admin_select on public.class_staff_assignments;
drop policy if exists class_staff_admin_insert on public.class_staff_assignments;
drop policy if exists class_staff_admin_update on public.class_staff_assignments;
create policy class_staff_admin_select on public.class_staff_assignments for select to authenticated using(public.is_platform_super_admin() or public.has_school_role(school_id,array['school_owner','principal','head_teacher','school_admin']::text[]));
create policy class_staff_admin_insert on public.class_staff_assignments for insert to authenticated with check(public.is_platform_super_admin() or public.has_school_role(school_id,array['school_owner','principal','head_teacher','school_admin']::text[]));
create policy class_staff_admin_update on public.class_staff_assignments for update to authenticated using(public.is_platform_super_admin() or public.has_school_role(school_id,array['school_owner','principal','head_teacher','school_admin']::text[])) with check(public.is_platform_super_admin() or public.has_school_role(school_id,array['school_owner','principal','head_teacher','school_admin']::text[]));
drop policy if exists class_staff_teacher_read on public.class_staff_assignments; create policy class_staff_teacher_read on public.class_staff_assignments for select to authenticated using(exists(select 1 from public.staff_profiles s where s.school_id=class_staff_assignments.school_id and s.id=class_staff_assignments.staff_profile_id and s.user_profile_id=auth.uid()));
drop policy if exists attendance_register_access on public.attendance_registers; create policy attendance_register_access on public.attendance_registers for select to authenticated using(public.is_platform_super_admin() or public.has_school_role(school_id,array['school_owner','principal','head_teacher','school_admin']::text[]) or public.has_active_class_assignment(school_id,academic_session_id,class_id,arm_id));
drop policy if exists attendance_register_manage on public.attendance_registers;
drop policy if exists attendance_entries_staff on public.attendance_entries;
drop policy if exists attendance_entries_staff_select on public.attendance_entries;
create policy attendance_entries_staff_select on public.attendance_entries for select to authenticated using(exists(select 1 from public.attendance_registers r where r.school_id=attendance_entries.school_id and r.id=attendance_entries.attendance_register_id and (public.is_platform_super_admin() or public.has_school_role(r.school_id,array['school_owner','principal','head_teacher','school_admin']::text[]) or public.has_active_class_assignment(r.school_id,r.academic_session_id,r.class_id,r.arm_id))));
drop policy if exists attendance_entries_parent_read on public.attendance_entries; create policy attendance_entries_parent_read on public.attendance_entries for select to authenticated using(exists(select 1 from public.student_guardians sg join public.parent_guardians pg on pg.school_id=sg.school_id and pg.id=sg.guardian_id where sg.school_id=attendance_entries.school_id and sg.student_id=attendance_entries.student_id and pg.user_profile_id=auth.uid()));

drop policy if exists announcements_member_read on public.announcements;
drop policy if exists announcements_admin_manage on public.announcements;
drop policy if exists announcements_manage_select on public.announcements;
drop policy if exists announcements_manage_insert on public.announcements;
drop policy if exists announcements_manage_update on public.announcements;
create policy announcements_manage_select on public.announcements for select to authenticated using(public.is_platform_super_admin() or public.has_school_role(school_id,array['school_owner','principal','head_teacher','school_admin']::text[]) or created_by_user_profile_id=auth.uid());
create policy announcements_manage_insert on public.announcements for insert to authenticated with check(public.is_platform_super_admin() or public.has_school_role(school_id,array['school_owner','principal','head_teacher','school_admin']::text[]) or (created_by_user_profile_id=auth.uid() and audience_scope='classes'));
create policy announcements_manage_update on public.announcements for update to authenticated using(public.is_platform_super_admin() or public.has_school_role(school_id,array['school_owner','principal','head_teacher','school_admin']::text[]) or created_by_user_profile_id=auth.uid()) with check(public.is_platform_super_admin() or public.has_school_role(school_id,array['school_owner','principal','head_teacher','school_admin']::text[]) or (created_by_user_profile_id=auth.uid() and audience_scope='classes'));
drop policy if exists announcement_targets_member_read on public.announcement_targets;
drop policy if exists announcement_targets_manage on public.announcement_targets;
drop policy if exists announcement_reads_self on public.announcement_reads; create policy announcement_reads_self on public.announcement_reads for select to authenticated using(user_profile_id=auth.uid() or public.has_school_role(school_id,array['school_owner','principal','head_teacher','school_admin']::text[]));
drop policy if exists announcement_reads_self_insert on public.announcement_reads; create policy announcement_reads_self_insert on public.announcement_reads for insert to authenticated with check(user_profile_id=auth.uid() and public.is_school_member(school_id));
drop policy if exists announcement_reads_self_update on public.announcement_reads; create policy announcement_reads_self_update on public.announcement_reads for update to authenticated using(user_profile_id=auth.uid()) with check(user_profile_id=auth.uid());

create or replace function public.can_view_announcement(target_announcement_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and exists(
  select 1 from public.announcements a where a.id=target_announcement_id
   and a.status in ('published','scheduled') and coalesce(a.publish_at,a.published_at,a.created_at)<=now() and (a.expires_at is null or a.expires_at>now()) and a.archived_at is null
   and (public.is_platform_super_admin() or public.has_school_role(a.school_id,array['school_owner','principal','head_teacher','school_admin']::text[]) or
    (a.audience_scope='school' and public.is_school_member(a.school_id)) or
    (a.audience_scope='roles' and exists(select 1 from public.announcement_targets t join public.roles r on r.code=t.target_role join public.user_roles ur on ur.role_id=r.id and ur.school_id=a.school_id and ur.user_id=auth.uid() where t.announcement_id=a.id and t.target_type='role')) or
    (a.audience_scope='classes' and exists(select 1 from public.announcement_targets t where t.announcement_id=a.id and t.target_type in ('class','arm') and (
      exists(select 1 from public.class_staff_assignments ca join public.staff_profiles sp on sp.id=ca.staff_profile_id and sp.school_id=ca.school_id where ca.school_id=a.school_id and ca.class_id=t.class_id and (t.arm_id is null or ca.arm_id is null or ca.arm_id=t.arm_id) and ca.is_active and sp.user_profile_id=auth.uid()) or
      exists(select 1 from public.parent_guardians pg join public.student_guardians sg on sg.school_id=pg.school_id and sg.guardian_id=pg.id join public.student_enrollments e on e.school_id=sg.school_id and e.student_id=sg.student_id where pg.school_id=a.school_id and pg.user_profile_id=auth.uid() and e.enrollment_status='active' and e.class_id=t.class_id and (t.arm_id is null or e.arm_id=t.arm_id))
    )))
   )
 );
$$;

revoke all on function public.can_view_announcement(uuid) from public; grant execute on function public.can_view_announcement(uuid) to authenticated;

drop policy if exists announcements_member_read on public.announcements;
drop policy if exists announcements_visible_read on public.announcements;
create policy announcements_visible_read on public.announcements for select to authenticated using(public.can_view_announcement(id) or created_by_user_profile_id=auth.uid());
drop policy if exists announcement_targets_member_read on public.announcement_targets;
drop policy if exists announcement_targets_visible_read on public.announcement_targets;
create policy announcement_targets_visible_read on public.announcement_targets for select to authenticated using(public.can_view_announcement(announcement_id) or exists(select 1 from public.announcements a where a.id=announcement_id and a.created_by_user_profile_id=auth.uid()));

drop policy if exists attendance_register_parent_read on public.attendance_registers;
create policy attendance_register_parent_read on public.attendance_registers for select to authenticated using(exists(select 1 from public.attendance_entries e join public.student_guardians sg on sg.school_id=e.school_id and sg.student_id=e.student_id join public.parent_guardians pg on pg.school_id=sg.school_id and pg.id=sg.guardian_id where e.school_id=attendance_registers.school_id and e.attendance_register_id=attendance_registers.id and pg.user_profile_id=auth.uid()));

create or replace function public.save_attendance_register(
 target_school_id uuid,target_session_id uuid,target_term_id uuid,target_class_id uuid,target_arm_id uuid,target_date date,entry_changes jsonb default '[]'::jsonb,submit_register boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $
declare register_id uuid; is_admin boolean; unmarked integer; eligible_count integer; existing_count integer; added_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if target_date>current_date then raise exception 'Future attendance dates are not allowed'; end if;
 is_admin:=public.is_platform_super_admin() or public.has_school_role(target_school_id,array['school_owner','principal','head_teacher','school_admin']::text[]);
 if not is_admin and not public.has_active_class_assignment(target_school_id,target_session_id,target_class_id,target_arm_id) then raise exception 'Not authorized for this class'; end if;
 if not exists(select 1 from public.terms where school_id=target_school_id and id=target_term_id and academic_session_id=target_session_id) then raise exception 'Invalid term and session'; end if;
 if not exists(select 1 from public.classes where school_id=target_school_id and id=target_class_id) then raise exception 'Invalid class'; end if;
 if target_arm_id is not null and not exists(select 1 from public.class_arms where school_id=target_school_id and id=target_arm_id and class_id=target_class_id) then raise exception 'Invalid class arm'; end if;
 insert into public.attendance_registers(school_id,academic_session_id,term_id,class_id,arm_id,attendance_date,created_by_user_profile_id)
 values(target_school_id,target_session_id,target_term_id,target_class_id,target_arm_id,target_date,auth.uid()) on conflict do nothing;
 select id into register_id from public.attendance_registers where school_id=target_school_id and academic_session_id=target_session_id and term_id=target_term_id and attendance_date=target_date and class_id=target_class_id and arm_id is not distinct from target_arm_id for update;
 if (select status from public.attendance_registers where id=register_id)<>'draft' then raise exception 'Only draft registers can be changed'; end if;
 select count(*) into existing_count from public.attendance_entries where attendance_register_id=register_id;
 select count(distinct e.student_id) into eligible_count from public.student_enrollments e join public.students st on st.school_id=e.school_id and st.id=e.student_id where e.school_id=target_school_id and e.academic_session_id=target_session_id and e.class_id=target_class_id and e.enrollment_status='active' and st.student_status='active' and (target_arm_id is null or e.arm_id=target_arm_id);
 insert into public.attendance_entries(school_id,attendance_register_id,student_id)
 select target_school_id,register_id,e.student_id from public.student_enrollments e join public.students s on s.school_id=e.school_id and s.id=e.student_id
 where e.school_id=target_school_id and e.academic_session_id=target_session_id and e.class_id=target_class_id and e.enrollment_status='active' and s.student_status='active' and (target_arm_id is null or e.arm_id=target_arm_id)
 on conflict(school_id,attendance_register_id,student_id) do nothing;
 if jsonb_typeof(entry_changes)<>'array' then raise exception 'Invalid attendance entries'; end if;
 if exists(select 1 from jsonb_to_recordset(entry_changes) x(student_id uuid,status text,remarks text) left join public.attendance_entries e on e.attendance_register_id=register_id and e.student_id=x.student_id where e.id is null or x.status not in ('present','absent','late','excused') or (x.status='excused' and nullif(btrim(x.remarks),'') is null)) then raise exception 'Invalid attendance entry'; end if;
 update public.attendance_entries e set status=x.status,remarks=nullif(btrim(x.remarks),''),marked_by_user_profile_id=auth.uid(),marked_at=now(),updated_at=now() from jsonb_to_recordset(entry_changes) x(student_id uuid,status text,remarks text) where e.attendance_register_id=register_id and e.student_id=x.student_id;
 if submit_register then
  select count(*) into unmarked from public.attendance_entries where attendance_register_id=register_id and status is null;
  if unmarked>0 then raise exception '% students still need an attendance status before submission.',unmarked; end if;
  update public.attendance_registers set status='submitted',submitted_by_user_profile_id=auth.uid(),submitted_at=now(),updated_at=now() where id=register_id;
  insert into public.audit_logs(school_id,actor_user_id,action,entity_type,entity_id,metadata) values(target_school_id,auth.uid(),'attendance.submitted','attendance_registers',register_id::text,jsonb_build_object('date',target_date));
 else update public.attendance_registers set updated_at=now() where id=register_id; end if;
 return jsonb_build_object('register_id',register_id,'eligible_count',eligible_count,'existing_count',existing_count,'added_count',added_count,'already_present_count',greatest(eligible_count-added_count,0),'historical_preserved_count',greatest(existing_count-(eligible_count-added_count),0));
end $;

create or replace function public.transition_attendance_register(target_register_id uuid,target_status text,reason text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.attendance_registers; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if; select * into r from public.attendance_registers where id=target_register_id for update;
 if r.id is null or not(public.is_platform_super_admin() or public.has_school_role(r.school_id,array['school_owner','principal','head_teacher','school_admin']::text[])) then raise exception 'Not authorized'; end if;
 if not ((r.status='submitted' and target_status in ('draft','locked')) or (r.status='locked' and target_status in ('submitted','draft'))) then raise exception 'Invalid attendance transition'; end if;
 if r.status='locked' and nullif(btrim(reason),'') is null then raise exception 'Unlock reason is required'; end if;
 update public.attendance_registers set status=target_status,locked_by_user_profile_id=case when target_status='locked' then auth.uid() else null end,locked_at=case when target_status='locked' then now() else null end,updated_at=now() where id=r.id;
 insert into public.audit_logs(school_id,actor_user_id,action,entity_type,entity_id,metadata) values(r.school_id,auth.uid(),'attendance.'||target_status,'attendance_registers',r.id::text,jsonb_build_object('previous_status',r.status,'reason',reason));
end $$;
revoke insert, update, delete on table public.attendance_registers from authenticated; revoke insert, update, delete on table public.attendance_entries from authenticated;
revoke all on function public.save_attendance_register(uuid,uuid,uuid,uuid,uuid,date,jsonb,boolean) from public; grant execute on function public.save_attendance_register(uuid,uuid,uuid,uuid,uuid,date,jsonb,boolean) to authenticated;
revoke all on function public.transition_attendance_register(uuid,text,text) from public; grant execute on function public.transition_attendance_register(uuid,text,text) to authenticated;
drop policy if exists announcement_targets_manage on public.announcement_targets;
drop policy if exists announcement_targets_manage_select on public.announcement_targets;
drop policy if exists announcement_targets_manage_insert on public.announcement_targets;
drop policy if exists announcement_targets_manage_update on public.announcement_targets;
create policy announcement_targets_manage_select on public.announcement_targets for select to authenticated
 using(exists(select 1 from public.announcements a where a.school_id=announcement_targets.school_id and a.id=announcement_targets.announcement_id and (public.is_platform_super_admin() or public.has_school_role(a.school_id,array['school_owner','principal','head_teacher','school_admin']::text[]) or a.created_by_user_profile_id=auth.uid())));
create policy announcement_targets_manage_insert on public.announcement_targets for insert to authenticated
 with check(exists(select 1 from public.announcements a where a.school_id=announcement_targets.school_id and a.id=announcement_targets.announcement_id and (
  public.is_platform_super_admin() or public.has_school_role(a.school_id,array['school_owner','principal','head_teacher','school_admin']::text[]) or
  (a.created_by_user_profile_id=auth.uid() and a.audience_scope='classes' and announcement_targets.target_type in ('class','arm') and exists(select 1 from public.class_staff_assignments ca join public.staff_profiles sp on sp.id=ca.staff_profile_id and sp.school_id=ca.school_id where ca.school_id=a.school_id and ca.class_id=announcement_targets.class_id and (announcement_targets.arm_id is null or ca.arm_id is null or ca.arm_id=announcement_targets.arm_id) and ca.is_active and sp.user_profile_id=auth.uid()))
 )));
create policy announcement_targets_manage_update on public.announcement_targets for update to authenticated
 using(exists(select 1 from public.announcements a where a.school_id=announcement_targets.school_id and a.id=announcement_targets.announcement_id and (public.is_platform_super_admin() or public.has_school_role(a.school_id,array['school_owner','principal','head_teacher','school_admin']::text[]) or a.created_by_user_profile_id=auth.uid())))
 with check(exists(select 1 from public.announcements a where a.school_id=announcement_targets.school_id and a.id=announcement_targets.announcement_id and (
  public.is_platform_super_admin() or public.has_school_role(a.school_id,array['school_owner','principal','head_teacher','school_admin']::text[]) or
  (a.created_by_user_profile_id=auth.uid() and a.audience_scope='classes' and announcement_targets.target_type in ('class','arm') and exists(select 1 from public.class_staff_assignments ca join public.staff_profiles sp on sp.id=ca.staff_profile_id and sp.school_id=ca.school_id where ca.school_id=a.school_id and ca.class_id=announcement_targets.class_id and (announcement_targets.arm_id is null or ca.arm_id is null or ca.arm_id=announcement_targets.arm_id) and ca.is_active and sp.user_profile_id=auth.uid()))
 )));