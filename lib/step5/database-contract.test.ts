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
});
