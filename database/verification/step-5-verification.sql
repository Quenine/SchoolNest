-- Read-only Step 5 contract verification. This file changes no application data or schema.
do $schoolnest_verify$
declare
  failures text[] := array[]::text[];
  item text;
  step5_tables constant text[] := array[
    'class_staff_assignments','attendance_registers','attendance_entries',
    'announcements','announcement_targets','announcement_reads'
  ];
  required_indexes constant text[] := array[
    'class_staff_active_identity_idx','class_staff_staff_idx',
    'attendance_register_identity_idx','attendance_school_date_idx',
    'attendance_class_date_idx','attendance_entries_register_idx',
    'attendance_entries_student_idx','announcements_feed_idx',
    'announcement_target_identity_idx','announcement_targets_lookup_idx',
    'announcement_reads_lookup_idx'
  ];
  required_constraints constant text[] := array[
    'class_arms_school_class_id_key',
    'class_staff_assignment_arm_matches_class_fkey',
    'attendance_register_arm_matches_class_fkey',
    'announcement_target_arm_matches_class_fkey'
  ];
  required_policies constant text[] := array[
    'class_staff_admin_select','class_staff_admin_insert','class_staff_admin_update','class_staff_teacher_read',
    'attendance_register_staff_select','attendance_register_parent_read',
    'attendance_entries_staff_select','attendance_entries_parent_read',
    'announcements_visible_read','announcements_manage_insert','announcements_manage_update',
    'announcement_targets_visible_read','announcement_targets_manage_insert','announcement_targets_manage_update',
    'announcement_reads_self_select','announcement_reads_admin_select','announcement_reads_self_insert','announcement_reads_self_update'
  ];
  proc_record record;
begin
  foreach item in array step5_tables loop
    if to_regclass('public.' || item) is null then failures := array_append(failures, 'missing table public.' || item); end if;
    if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=item and c.relrowsecurity) then failures := array_append(failures, 'RLS disabled on public.' || item); end if;
    if has_table_privilege('anon', 'public.' || item, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then failures := array_append(failures, 'anon has table privileges on public.' || item); end if;
    if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) acl where n.nspname='public' and c.relname=item and acl.grantee=0 and acl.privilege_type in ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')) then failures := array_append(failures, 'PUBLIC has table privileges on public.' || item); end if;
  end loop;

  if has_table_privilege('authenticated','public.attendance_registers','INSERT,UPDATE,DELETE') then failures := array_append(failures,'authenticated can mutate attendance_registers directly'); end if;
  if has_table_privilege('authenticated','public.attendance_entries','INSERT,UPDATE,DELETE') then failures := array_append(failures,'authenticated can mutate attendance_entries directly'); end if;

  select p.prosecdef, p.proconfig, pg_get_function_result(p.oid) result
  into proc_record
  from pg_proc p
  where p.oid=to_regprocedure('public.save_attendance_register(uuid,uuid,uuid,uuid,uuid,date,jsonb,boolean)');
  if not found then failures := array_append(failures,'missing save_attendance_register exact signature');
  else
    if proc_record.result <> 'jsonb' then failures := array_append(failures,'save_attendance_register does not return jsonb'); end if;
    if not proc_record.prosecdef then failures := array_append(failures,'save_attendance_register is not SECURITY DEFINER'); end if;
    if not coalesce(proc_record.proconfig,'{}'::text[]) @> array['search_path=public, pg_temp'] and not coalesce(proc_record.proconfig,'{}'::text[]) @> array['search_path=public,pg_temp'] then failures := array_append(failures,'save_attendance_register search_path is not fixed'); end if;
  end if;

  select p.prosecdef, p.proconfig
  into proc_record
  from pg_proc p
  where p.oid=to_regprocedure('public.transition_attendance_register(uuid,text,text)');
  if not found then failures := array_append(failures,'missing transition_attendance_register exact signature');
  else
    if not proc_record.prosecdef then failures := array_append(failures,'transition_attendance_register is not SECURITY DEFINER'); end if;
    if not coalesce(proc_record.proconfig,'{}'::text[]) @> array['search_path=public,pg_temp'] and not coalesce(proc_record.proconfig,'{}'::text[]) @> array['search_path=public, pg_temp'] then failures := array_append(failures,'transition_attendance_register search_path is not fixed'); end if;
  end if;

  foreach item in array array[
    'public.save_attendance_register(uuid,uuid,uuid,uuid,uuid,date,jsonb,boolean)',
    'public.transition_attendance_register(uuid,text,text)',
    'public.has_active_class_assignment(uuid,uuid,uuid,uuid)',
    'public.can_view_announcement(uuid)'
  ] loop
    if to_regprocedure(item) is null then failures := array_append(failures,'missing function ' || item);
    else
      if has_function_privilege('anon',item,'EXECUTE') then failures := array_append(failures,'anon can execute ' || item); end if;
      if exists(select 1 from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl where p.oid=to_regprocedure(item) and acl.grantee=0 and acl.privilege_type='EXECUTE') then failures := array_append(failures,'PUBLIC can execute ' || item); end if;
      if not has_function_privilege('authenticated',item,'EXECUTE') then failures := array_append(failures,'authenticated cannot execute ' || item); end if;
    end if;
  end loop;

  foreach item in array required_indexes loop
    if to_regclass('public.' || item) is null then failures := array_append(failures,'missing index public.' || item); end if;
  end loop;
  foreach item in array required_constraints loop
    if not exists(select 1 from pg_constraint where conname=item) then failures := array_append(failures,'missing constraint ' || item); end if;
  end loop;
  foreach item in array required_policies loop
    if not exists(select 1 from pg_policies where schemaname='public' and policyname=item) then failures := array_append(failures,'missing policy ' || item); end if;
  end loop;

  if exists(select 1 from pg_policies where schemaname='public' and tablename=any(step5_tables) and cmd='ALL') then failures := array_append(failures,'Step 5 contains a FOR ALL policy'); end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename=any(step5_tables) and (roles @> array['anon']::name[] or roles @> array['public']::name[])) then failures := array_append(failures,'Step 5 contains an anon or PUBLIC policy'); end if;

  if not exists(select 1 from pg_policies where schemaname='public' and tablename='announcement_reads' and policyname='announcement_reads_admin_select' and cmd='SELECT' and qual like '%is_platform_super_admin%' and qual like '%has_school_role%' and qual like '%school_owner%' and qual like '%principal%' and qual like '%head_teacher%' and qual like '%school_admin%') then failures := array_append(failures,'announcement read aggregate SELECT is not restricted to approved administrators'); end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='announcement_reads' and policyname='announcement_reads_admin_select' and qual like '%is_school_member%') then failures := array_append(failures,'non-admin school members can receive aggregate announcement read access'); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='announcement_reads' and policyname='announcement_reads_self_select' and cmd='SELECT' and qual like '%user_profile_id = auth.uid()%' and qual not like '%is_school_member%') then failures := array_append(failures,'ordinary announcement read SELECT is not self-scoped'); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='announcement_reads' and policyname='announcement_reads_self_insert' and cmd='INSERT' and with_check like '%user_profile_id = auth.uid()%') then failures := array_append(failures,'announcement read insert is not self-scoped'); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='announcement_reads' and policyname='announcement_reads_self_update' and cmd='UPDATE' and qual like '%user_profile_id = auth.uid()%' and with_check like '%user_profile_id = auth.uid()%') then failures := array_append(failures,'announcement read update is not self-scoped'); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and policyname='attendance_register_parent_read' and qual like '%student_guardians%' and qual like '%parent_guardians%' and qual like '%auth.uid()%') then failures := array_append(failures,'parent attendance read is not linked-child-only'); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and policyname='attendance_register_staff_select' and qual like '%has_active_class_assignment%') then failures := array_append(failures,'teacher attendance read does not require explicit assignment'); end if;

  if not exists(
    select 1 from pg_policies
    where schemaname='public' and tablename='announcements' and policyname='announcements_manage_insert'
      and with_check like '%users_profile%' and with_check like '%staff_profiles%'
      and with_check like '%class_staff_assignments%' and with_check like '%employment_status%'
      and with_check like '%starts_on%' and with_check like '%ends_on%'
  ) then failures := array_append(failures,'announcement insert does not require active staff and a currently effective class assignment'); end if;

  if exists(
    select 1 from pg_policies
    where schemaname='public' and tablename='announcements' and policyname='announcements_manage_insert'
      and with_check like '%is_school_member%'
  ) then failures := array_append(failures,'class-announcement insert still relies on is_school_member'); end if;

  if not exists(
    select 1 from pg_policies
    where schemaname='public' and tablename='announcements' and policyname='announcements_manage_update'
      and qual like '%created_by_user_profile_id%' and qual like '%audience_scope%'
      and qual like '%users_profile%' and qual like '%class_staff_assignments%'
      and with_check like '%created_by_user_profile_id%' and with_check like '%audience_scope%'
      and with_check like '%up.school_id = announcements.school_id%'
      and with_check like '%employment_status%' and with_check like '%starts_on%' and with_check like '%ends_on%'
  ) then failures := array_append(failures,'announcement update does not enforce same-school active staff assignment for non-admin authors'); end if;

  if not exists(
    select 1 from pg_policies
    where schemaname='public' and tablename='announcement_targets' and policyname='announcement_targets_manage_update'
      and qual like '%class_staff_assignments%' and qual like '%class_id%'
      and qual like '%arm_id%' and qual like '%employment_status%'
      and with_check like '%class_staff_assignments%' and with_check like '%class_id%'
      and with_check like '%arm_id%' and with_check like '%employment_status%'
  ) then failures := array_append(failures,'announcement target update is not assignment-scoped in USING and WITH CHECK'); end if;

  if not exists(
    select 1 from pg_proc p
    where p.oid=to_regprocedure('public.can_view_announcement(uuid)')
      and pg_get_functiondef(p.oid) like '%academic_sessions%'
      and pg_get_functiondef(p.oid) like '%is_current = true%'
      and pg_get_functiondef(p.oid) like '%academic_session_id%'
      and pg_get_functiondef(p.oid) like '%enrollment_status = ''active''%'
      and pg_get_functiondef(p.oid) like '%parent_guardians%'
  ) then failures := array_append(failures,'parent class-announcement visibility is not scoped to active current-session enrollment'); end if;
  if cardinality(failures)>0 then
    raise exception 'Step 5 verification failed:%', E'\n- ' || array_to_string(failures,E'\n- ');
  end if;
  raise notice 'Step 5 verification passed.';
end $schoolnest_verify$;
