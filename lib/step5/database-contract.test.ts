import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const migrationPath='database/migrations/step-5-1-attendance-and-communication.sql';
const closurePath='database/migrations/step-5-2-step5-closure.sql';
const schemaPath='database/schema.sql';
const read=(path:string)=>readFileSync(path,'utf8');

describe('Step 5 database contract',()=>{
  it('keeps applied Step 5.1 byte-identical to its tag',()=>{
    const tagged=execFileSync('git',['show',`step5-applied-base:${migrationPath}`],{encoding:'utf8'});
    expect(read(migrationPath).replace(/\r\n/g,'\n')).toBe(tagged.replace(/\r\n/g,'\n'));
  });

  it('defines the corrective JSONB RPC contract and all six response keys',()=>{
    const sql=read(closurePath).toLowerCase();
    expect(sql).toContain('drop function public.save_attendance_register(uuid,uuid,uuid,uuid,uuid,date,jsonb,boolean)');
    expect(sql).toContain('returns jsonb');
    expect(sql).toContain('get diagnostics added_count = row_count');
    for(const key of ['register_id','eligible_count','existing_snapshot_count','added_count','already_present_count','historical_preserved_count']){
      expect(sql).toContain(`'${key}'`);
    }
  });

  it('uses fixed search paths, RPC-only attendance mutation, and narrow policies',()=>{
    for(const sql of [read(closurePath),read(schemaPath)]){
      expect(sql).not.toMatch(/as\s+\$(?:\r?\n)|end\s+\$;/i);
      expect(sql.toLowerCase()).toContain('security definer');
    }
    const closureSource=read(closurePath);
    expect(closureSource).not.toMatch(/create\s+policy[\s\S]*?for\s+all\s+to\s+authenticated/i);
    expect(closureSource).not.toMatch(/create\s+policy[\s\S]*?\bto\s+(anon|public)\b/i);
    const closure=closureSource.toLowerCase();
    expect(closure).toContain('revoke all on table public.attendance_registers from anon, public, authenticated');
    expect(closure).toContain('grant select on table public.attendance_registers, public.attendance_entries to authenticated');
    expect(closure).toContain('revoke all on function public.save_attendance_register');
  });

  it('requires active assigned staff for non-admin announcement insert and update',()=>{
    for(const path of [closurePath,schemaPath]){
      const sql=read(path).toLowerCase();
      const insert=policy(sql,'announcements_manage_insert');
      const update=policy(sql,'announcements_manage_update');
      for(const definition of [insert,update]){
        expect(definition).toContain('users_profile');
        expect(definition).toContain('staff_profiles');
        expect(definition).toContain("employment_status = 'active'");
        expect(definition).toContain('class_staff_assignments');
        expect(definition).toContain('starts_on');
        expect(definition).toContain('ends_on');
      }
      expect(insert).not.toContain('is_school_member');
      expect(update).toContain('up.school_id = announcements.school_id');
      expect(update).toContain('created_by_user_profile_id = auth.uid()');
      expect(update).toContain("audience_scope = 'classes'");
    }
  });

  it('keeps target updates within the teacher class or arm assignment',()=>{
    for(const path of [closurePath,schemaPath]){
      const update=policy(read(path).toLowerCase(),'announcement_targets_manage_update');
      expect((update.match(/class_staff_assignments/g)??[]).length).toBeGreaterThanOrEqual(2);
      expect(update).toContain('csa.class_id = announcement_targets.class_id');
      expect(update).toContain('csa.arm_id is null or csa.arm_id is not distinct from announcement_targets.arm_id');
      expect(update).toContain("sp.employment_status = 'active'");
      expect(update).toContain('a.school_id = announcement_targets.school_id');
    }
  });

  it('limits parent class visibility to active enrollment in the tenant current session',()=>{
    for(const path of [closurePath,schemaPath]){
      const sql=read(path).toLowerCase();
      const start=sql.indexOf('create or replace function public.can_view_announcement');
      const end=sql.indexOf('alter table public.class_staff_assignments',start);
      const definition=sql.slice(start,end);
      expect(definition).toContain('academic_sessions current_session');
      expect(definition).toContain('current_session.school_id = se.school_id');
      expect(definition).toContain('current_session.id = se.academic_session_id');
      expect(definition).toContain('current_session.is_current = true');
      expect(definition).toContain("se.enrollment_status = 'active'");
      expect(definition).toContain('pg.user_profile_id = auth.uid()');
    }
  });

  it('allows administrator aggregate reads while preserving ordinary self-only access',()=>{
    for(const path of [closurePath,schemaPath]){
      const sql=read(path).toLowerCase();
      const admin=policy(sql,'announcement_reads_admin_select');
      expect(admin).toContain('is_platform_super_admin()');
      expect(admin).toContain('has_school_role');
      for(const role of ['school_owner','principal','head_teacher','school_admin'])expect(admin).toContain(`'${role}'`);
      expect(admin).not.toContain('is_school_member');
      expect(admin).not.toContain('for insert');
      expect(admin).not.toContain('for update');

      const selfSelect=policy(sql,'announcement_reads_self_select');
      expect(selfSelect).toContain('user_profile_id = auth.uid()');
      expect(selfSelect).not.toContain('has_school_role');
      expect(selfSelect).not.toContain('is_school_member');

      const selfInsert=policy(sql,'announcement_reads_self_insert');
      const selfUpdate=policy(sql,'announcement_reads_self_update');
      expect(selfInsert).toContain('user_profile_id = auth.uid()');
      expect(selfUpdate).toContain('using (user_profile_id = auth.uid())');
      expect(selfUpdate).toContain('user_profile_id = auth.uid()');
      expect(selfInsert).not.toContain('has_school_role');
      expect(selfUpdate).not.toContain('has_school_role');
    }
  });
});

function policy(sql:string,name:string){
  const start=sql.indexOf(`create policy ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
const candidates=[sql.indexOf('create policy ',start+14),sql.indexOf('drop policy ',start+14),sql.indexOf('\n-- ',start+14),sql.indexOf('\ncreate function ',start+14),sql.indexOf('\ncreate or replace function ',start+14),sql.indexOf('\ndrop function ',start+14)].filter(index=>index>start);
  const end=candidates.length?Math.min(...candidates):sql.length;
  return sql.slice(start,end);
}