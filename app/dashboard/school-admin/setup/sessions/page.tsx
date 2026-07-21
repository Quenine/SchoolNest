import { createAcademicSession, createAcademicTerm, updateAcademicSession, updateAcademicTerm } from "@/app/dashboard/school-admin/setup/actions";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Field, SelectField } from "@/components/dashboard/field";
import { DisclosurePanel, PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ActionForm } from "@/components/forms/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSchoolContext } from "@/lib/school-context";

const termLabels = { first: "First", second: "Second", third: "Third" } as const;

type SessionRow = { id: string; name: string; starts_on: string; ends_on: string; is_current: boolean };
type TermRow = { id: string; academic_session_id: string; name: keyof typeof termLabels; starts_on: string; ends_on: string; is_current: boolean };

export default async function SessionsPage() {
  const context = await getSchoolContext();
  const [{ data: sessions }, { data: terms }] = await Promise.all([
    context.supabase.from("academic_sessions").select("*").eq("school_id", context.schoolId).order("starts_on", { ascending: false }),
    context.supabase.from("terms").select("*").eq("school_id", context.schoolId).order("starts_on", { ascending: false }),
  ]);
  const sessionRows = (sessions ?? []) as SessionRow[];
  const termRows = (terms ?? []) as TermRow[];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="School setup" title="Sessions & terms" description="Create and maintain the academic periods used by enrollments, fees, attendance, and reports." />

      <div className="grid gap-5 lg:grid-cols-2">
        <DisclosurePanel label="Add session">
          <ActionForm action={createAcademicSession} submitLabel="Create session" pendingLabel="Creating..." resetOnSuccess>
            <Field label="Name" name="name" defaultValue="2026/2027" required />
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Starts on" name="starts_on" type="date" required /><Field label="Ends on" name="ends_on" type="date" required /></div>
            <input type="hidden" name="is_current" value="false" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_current" value="true" /> Current session</label>
          </ActionForm>
        </DisclosurePanel>
        <DisclosurePanel label="Add term">
          <ActionForm action={createAcademicTerm} submitLabel="Create term" pendingLabel="Creating..." resetOnSuccess>
            <SelectField label="Session" name="academic_session_id" required><option value="">Choose session</option>{sessionRows.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}</SelectField>
            <SelectField label="Term" name="name" defaultValue="first" required><option value="first">First</option><option value="second">Second</option><option value="third">Third</option></SelectField>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Starts on" name="starts_on" type="date" required /><Field label="Ends on" name="ends_on" type="date" required /></div>
            <input type="hidden" name="is_current" value="false" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_current" value="true" /> Current term</label>
          </ActionForm>
        </DisclosurePanel>
      </div>

      {sessionRows.length === 0 ? <EmptyState title="No academic sessions yet" message="Create the current school session, e.g. 2026/2027, then add first, second, and third terms." /> : (
        <Card>
          <CardHeader><CardTitle>{sessionRows.length} academic session{sessionRows.length === 1 ? "" : "s"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {sessionRows.map((session) => {
              const sessionTerms = termRows.filter((term) => term.academic_session_id === session.id);
              return (
                <div key={session.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-semibold">{session.name}</p><p className="text-sm text-muted-foreground">{session.starts_on} to {session.ends_on} · {sessionTerms.length} term{sessionTerms.length === 1 ? "" : "s"}</p></div>
                    <div className="flex items-center gap-2">{session.is_current ? <StatusBadge tone="green">Current</StatusBadge> : <StatusBadge>Not current</StatusBadge>}</div>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <DisclosurePanel label="Edit session">
                      <ActionForm action={updateAcademicSession} submitLabel="Save session" pendingLabel="Updating...">
                        <input type="hidden" name="id" value={session.id} />
                        <Field label="Name" name="name" defaultValue={session.name} required />
                        <div className="grid gap-4 sm:grid-cols-2"><Field label="Starts on" name="starts_on" type="date" defaultValue={session.starts_on} required /><Field label="Ends on" name="ends_on" type="date" defaultValue={session.ends_on} required /></div>
                        <input type="hidden" name="is_current" value="false" />
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_current" value="true" defaultChecked={session.is_current} /> Current session</label>
                      </ActionForm>
                    </DisclosurePanel>
                    {sessionTerms.map((term) => (
                      <DisclosurePanel key={term.id} label={`Edit ${termLabels[term.name]} term`}>
                        <ActionForm action={updateAcademicTerm} submitLabel="Save term" pendingLabel="Updating...">
                          <input type="hidden" name="id" value={term.id} />
                          <input type="hidden" name="academic_session_id" value={term.academic_session_id} />
                          <SelectField label="Term" name="name" defaultValue={term.name} required><option value="first">First</option><option value="second">Second</option><option value="third">Third</option></SelectField>
                          <div className="grid gap-4 sm:grid-cols-2"><Field label="Starts on" name="starts_on" type="date" defaultValue={term.starts_on} required /><Field label="Ends on" name="ends_on" type="date" defaultValue={term.ends_on} required /></div>
                          <input type="hidden" name="is_current" value="false" />
                          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_current" value="true" defaultChecked={term.is_current} /> Current term</label>
                        </ActionForm>
                      </DisclosurePanel>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
