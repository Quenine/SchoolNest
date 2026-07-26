import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Step 5 review-fix contracts',()=>{
  it.each(['deactivateClassStaff','updateAnnouncementDraft','archiveAnnouncement'])(
    '%s rejects zero-row updates before auditing success',
    name=>{
      const source=read('app/dashboard/step-5-actions.ts');
      const start=source.indexOf(`function ${name}`);
      const next=source.indexOf('export async function ',start+20);
      const definition=source.slice(start,next<0?source.length:next);
      expect(definition).toContain(".select('id').maybeSingle()");
      expect(definition).toContain('if(error||!data)return fail');
      expect(definition.indexOf('if(error||!data)return fail')).toBeLessThan(definition.indexOf("from('audit_logs')"));
    },
  );

  it('scopes school-admin audience estimates to the current session',()=>{
    const source=read('app/dashboard/school-admin/announcements/page.tsx');
    expect(source).toContain(".from('academic_sessions').select('id').eq('school_id',c.schoolId).eq('is_current',true)");
    expect(source).toContain(".eq('academic_session_id',currentSessionId).eq('enrollment_status','active')");
    expect(source).toContain(".eq('academic_session_id',currentSessionId).eq('is_active',true)");
    expect(source).toContain("eq('staff_profiles.employment_status','active')");
    expect(source).toContain('!x.starts_on||x.starts_on<=today');
    expect(source).toContain('!x.ends_on||x.ends_on>=today');
  });

  it('scopes teacher audience estimates to current effective assignments',()=>{
    const source=read('app/dashboard/teacher/announcements/page.tsx');
    expect(source).toContain(".eq('is_current',true)");
    expect(source).toContain(".eq('employment_status','active')");
    expect(source).toContain(".eq('academic_session_id',currentSession.id)");
    expect(source).toContain("eq('staff_profiles.employment_status','active')");
    expect(source).toContain('activeAudienceAssignments');
  });
  it('scopes createAnnouncement authorization to current effective assignments',()=>{
    const source=read('app/dashboard/step-5-actions.ts');
    const start=source.indexOf('export async function createAnnouncement');
    const end=source.indexOf('function statusTime',start);
    const definition=source.slice(start,end);
    expect(definition).toContain(".from('academic_sessions').select('id').eq('school_id',c.schoolId).eq('is_current',true).maybeSingle()");
    expect(definition).toContain('if(sessionError||!currentSession)return fail');
    expect(definition).toContain(".eq('employment_status','active').maybeSingle()");
    expect(definition).toContain(".eq('academic_session_id',currentSession.id)");
    expect(definition).toContain(".eq('is_active',true)");
    expect(definition).toContain('!x.starts_on||x.starts_on<=today');
    expect(definition).toContain('!x.ends_on||x.ends_on>=today');
    expect(definition).toContain('teacherTargetsAllowed(targets,effective.map');
  });
});
