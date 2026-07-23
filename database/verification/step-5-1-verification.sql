-- Step 5.1 post-migration contract verification. Read-only: raises on any missing or unsafe contract.
do $verify$
declare name text; missing text[] := '{}';
begin
 foreach name in array array['class_staff_assignments','attendance_registers','attendance_entries','announcements','announcement_targets','announcement_reads'] loop
  if to_regclass('public.'||name) is null then missing:=array_append(missing,'table:'||name); end if;
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=name and c.relrowsecurity) then missing:=array_append(missing,'rls:'||name); end if;
 end loop;
 foreach name in array array['public.has_active_class_assignment(uuid,uuid,uuid,uuid)','public.can_view_announcement(uuid)','public.save_attendance_register(uuid,uuid,uuid,uuid,uuid,date,jsonb,boolean)','public.transition_attendance_register(uuid,text,text)'] loop
  if to_regprocedure(name) is null then missing:=array_append(missing,'function:'||name); end if;
 end loop;
 foreach name in array array['class_staff_active_identity_idx','class_staff_staff_idx','attendance_register_identity_idx','attendance_school_date_idx','attendance_class_date_idx','attendance_entries_register_idx','attendance_entries_student_idx','announcements_feed_idx','announcement_target_identity_idx','announcement_targets_lookup_idx','announcement_reads_lookup_idx'] loop
  if to_regclass('public.'||name) is null then missing:=array_append(missing,'index:'||name); end if;
 end loop;
 if not exists(select 1 from pg_constraint where conrelid='public.attendance_entries'::regclass and contype='u' and pg_get_constraintdef(oid) like '%attendance_register_id%student_id%') then missing:=array_append(missing,'constraint:unique student/register'); end if;
 if not exists(select 1 from pg_constraint where conrelid='public.attendance_entries'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%excused%remarks%') then missing:=array_append(missing,'constraint:excused reason'); end if;
 if not exists(select 1 from pg_constraint where conrelid='public.announcement_targets'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%target_type%') then missing:=array_append(missing,'constraint:announcement target shape'); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='attendance_entries' and policyname='attendance_entries_parent_read') then missing:=array_append(missing,'policy:parent attendance'); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='announcements' and policyname='announcements_visible_read') then missing:=array_append(missing,'policy:announcement visibility'); end if;
 if exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name=any(array['class_staff_assignments','attendance_registers','attendance_entries','announcements','announcement_targets','announcement_reads']) and grantee in ('anon','PUBLIC')) then missing:=array_append(missing,'grant:anonymous table privilege'); end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename=any(array['class_staff_assignments','attendance_registers','attendance_entries','announcements','announcement_targets','announcement_reads']) and ('anon'=any(roles) or 'public'=any(roles))) then missing:=array_append(missing,'policy:anonymous access'); end if;
 if array_length(missing,1)>0 then raise exception 'Step 5.1 verification failed: %',array_to_string(missing,', '); end if;
 raise notice 'Step 5.1 verification passed: tables, functions, RLS, indexes, constraints, policies, and grants are present.';
end $verify$;
