import { assignStudentOptionalFee, cancelStudentOptionalFee } from "@/app/dashboard/school-admin/finance/actions";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SelectField } from "@/components/dashboard/field";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ConfirmActionForm } from "@/components/forms/confirm-action-form";
import { StudentAddonForm } from "@/components/forms/student-addon-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/finance/helpers";
import { getSchoolContext } from "@/lib/school-context";

type OptionRow = { id: string; name: string };
type TermRow = { id: string; name: string; academic_session_id: string };
type ArmRow = { id: string; class_id: string; name: string };
type StudentRow = { id: string; first_name: string; last_name: string; admission_number: string; current_class_id: string | null; current_arm_id: string | null };
type ClassFeeRow = { id: string; amount: number | string; academic_session_id: string; term_id: string | null; class_id: string; arm_id: string | null; is_required: boolean; fee_items: { name: string } | { name: string }[] | null };
type AssignmentRow = { id: string; student_id: string; academic_session_id: string; term_id: string | null; class_fee_structure_id: string; amount: number | string; status: string; notes: string | null };
type AddOnSearch = { session?: string; term?: string; class?: string; arm?: string; student?: string };

function studentName(student: StudentRow) {
  return `${student.last_name} ${student.first_name}`;
}

function feeName(row?: Pick<ClassFeeRow, "fee_items"> | null) {
  const item = Array.isArray(row?.fee_items) ? row?.fee_items[0] : row?.fee_items;
  return item?.name ?? "Optional fee";
}

function matchesSelection(row: ClassFeeRow, selection: { sessionId: string; termId: string; classId: string; armId: string }) {
  return row.academic_session_id === selection.sessionId
    && row.class_id === selection.classId
    && (selection.termId ? row.term_id === selection.termId || row.term_id === null : row.term_id === null)
    && (!row.arm_id || row.arm_id === selection.armId);
}

export default async function StudentAddOnsPage({ searchParams }: { searchParams?: Promise<AddOnSearch> }) {
  const params = (await searchParams) ?? {};
  const context = await getSchoolContext();
  const [{ data: students }, { data: sessions }, { data: terms }, { data: classes }, { data: arms }, { data: classFees }, { data: assignments }] = await Promise.all([
    context.supabase.from("students").select("id, first_name, last_name, admission_number, current_class_id, current_arm_id").eq("school_id", context.schoolId).eq("student_status", "active").order("last_name"),
    context.supabase.from("academic_sessions").select("id, name").eq("school_id", context.schoolId).order("starts_on", { ascending: false }),
    context.supabase.from("terms").select("id, name, academic_session_id").eq("school_id", context.schoolId),
    context.supabase.from("classes").select("id, name").eq("school_id", context.schoolId).order("level_order"),
    context.supabase.from("class_arms").select("id, class_id, name").eq("school_id", context.schoolId),
    context.supabase.from("class_fee_structures").select("id, amount, academic_session_id, term_id, class_id, arm_id, is_required, fee_items(name)").eq("school_id", context.schoolId),
    context.supabase.from("student_optional_fees").select("id, student_id, academic_session_id, term_id, class_fee_structure_id, amount, status, notes").eq("school_id", context.schoolId).order("created_at", { ascending: false }),
  ]);

  const studentRows = (students ?? []) as StudentRow[];
  const sessionRows = (sessions ?? []) as OptionRow[];
  const termRows = (terms ?? []) as TermRow[];
  const classRows = (classes ?? []) as OptionRow[];
  const armRows = (arms ?? []) as ArmRow[];
  const classFeeRows = (classFees ?? []) as ClassFeeRow[];
  const assignmentRows = (assignments ?? []) as AssignmentRow[];
  const studentById = new Map(studentRows.map((student) => [student.id, student]));
  const sessionById = new Map(sessionRows.map((session) => [session.id, session]));
  const termById = new Map(termRows.map((term) => [term.id, term]));
  const classById = new Map(classRows.map((row) => [row.id, row]));
  const armById = new Map(armRows.map((row) => [row.id, row]));
  const feeById = new Map(classFeeRows.map((row) => [row.id, row]));
  const selectedStudent = params.student ? studentById.get(params.student) : studentRows[0];
  const selectedSession = params.session || sessionRows[0]?.id || "";
  const selectedClass = params.class || selectedStudent?.current_class_id || classRows[0]?.id || "";
  const selectedArm = params.arm || selectedStudent?.current_arm_id || "";
  const selectedTerm = params.term || "";
  const selection = { sessionId: selectedSession, termId: selectedTerm, classId: selectedClass, armId: selectedArm };
  const availableOptionalFees = classFeeRows.filter((row) => !row.is_required && matchesSelection(row, selection));
  const baseFees = classFeeRows.filter((row) => row.is_required && matchesSelection(row, selection));
  const selectedAssignments = assignmentRows.filter((row) => row.status === "active" && row.student_id === selectedStudent?.id && row.academic_session_id === selectedSession && (!selectedTerm || row.term_id === selectedTerm || row.term_id === null));
  const baseClassTotal = baseFees.reduce((total, row) => total + Number(row.amount ?? 0), 0);
  const assignedTotal = selectedAssignments.reduce((total, row) => total + Number(row.amount ?? 0), 0);
  const activeAssignments = assignmentRows.filter((row) => row.status === "active");
  const studentsWithAddOns = new Set(activeAssignments.map((row) => row.student_id)).size;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Finance" title="Student Add-ons" description="Assign optional fees like transport, feeding, or boarding to selected students before generating invoices." />

      <div className="grid gap-5 lg:grid-cols-3">
        <Metric label="Students with add-ons" value={String(studentsWithAddOns)} />
        <Metric label="Active assignments" value={String(activeAssignments.length)} />
        <Metric label="Total optional fees assigned" value={formatMoney(activeAssignments.reduce((total, row) => total + Number(row.amount ?? 0), 0))} />
      </div>

      <Card><CardHeader><CardTitle>Choose Student and Class</CardTitle></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-6" action="/dashboard/school-admin/finance/student-addons"><SelectField label="Session" name="session" defaultValue={selectedSession}><option value="">Choose session</option>{sessionRows.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}</SelectField><SelectField label="Term" name="term" defaultValue={selectedTerm}><option value="">Session add-on</option>{termRows.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}</SelectField><SelectField label="Class" name="class" defaultValue={selectedClass}><option value="">Choose class</option>{classRows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</SelectField><SelectField label="Arm" name="arm" defaultValue={selectedArm}><option value="">All arms</option>{armRows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</SelectField><SelectField label="Student" name="student" defaultValue={selectedStudent?.id}><option value="">Choose student</option>{studentRows.map((student) => <option key={student.id} value={student.id}>{studentName(student)} - {student.admission_number}</option>)}</SelectField><div className="flex items-end"><button className="h-12 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">Apply</button></div></form></CardContent></Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Metric label="Base Class Total" value={formatMoney(baseClassTotal)} />
        <Metric label="Assigned Add-ons" value={formatMoney(assignedTotal)} />
        <Metric label="Estimated Student Total" value={formatMoney(baseClassTotal + assignedTotal)} />
      </div>

      <Card>
        <CardHeader><CardTitle>Assign Optional Fee</CardTitle><p className="text-sm text-muted-foreground">Use this when a student uses transport, feeding, boarding, or another optional service.</p></CardHeader>
        <CardContent className="space-y-5">
          {availableOptionalFees.length === 0 ? <EmptyState title="No optional fees available" message="Create optional fee prices for this class from Fee Setup before assigning add-ons." /> : <><div className="rounded-lg border"><div className="grid grid-cols-2 gap-3 border-b bg-muted p-3 text-sm font-semibold"><span>Optional fee</span><span>Amount for this class</span></div>{availableOptionalFees.map((fee) => <div className="grid grid-cols-2 gap-3 border-b p-3 text-sm last:border-b-0" key={fee.id}><span>{feeName(fee)}</span><span className="font-semibold">{formatMoney(Number(fee.amount))}</span></div>)}</div><StudentAddonForm action={assignStudentOptionalFee} studentId={selectedStudent?.id ?? ""} sessionId={selectedSession} termId={selectedTerm} fees={availableOptionalFees.map((fee) => ({ id: fee.id, amount: fee.amount, name: feeName(fee) }))} /></>}
        </CardContent>
      </Card>

      {selectedAssignments.length > 0 ? <Card><CardHeader><CardTitle>Selected Student Add-ons</CardTitle></CardHeader><CardContent className="space-y-3">{selectedAssignments.map((assignment) => { const optionalFee = feeById.get(assignment.class_fee_structure_id); return <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm"><div><p className="font-semibold">{feeName(optionalFee)}</p><p className="text-muted-foreground">{termById.get(assignment.term_id ?? "")?.name ?? "Session"} {sessionById.get(assignment.academic_session_id)?.name ?? ""} - {formatMoney(Number(assignment.amount))}</p>{assignment.notes ? <p className="mt-1 text-xs text-muted-foreground">{assignment.notes}</p> : null}</div><ConfirmActionForm action={cancelStudentOptionalFee} triggerLabel="Cancel" actionLabel="Cancel add-on" description="This optional fee will no longer be active for the student." fields={{ id: assignment.id }} /></div>; })}</CardContent></Card> : <EmptyState title="No add-ons for selected student" message="Assign optional fees here before generating that student's invoice." />}

      {assignmentRows.length > 0 ? <Card><CardHeader><CardTitle>All Assigned Add-ons</CardTitle></CardHeader><CardContent className="space-y-3">{assignmentRows.map((assignment) => { const student = studentById.get(assignment.student_id); const optionalFee = feeById.get(assignment.class_fee_structure_id); const schoolClass = optionalFee ? classById.get(optionalFee.class_id)?.name : student?.current_class_id ? classById.get(student.current_class_id)?.name : null; const arm = optionalFee?.arm_id ? armById.get(optionalFee.arm_id)?.name : student?.current_arm_id ? armById.get(student.current_arm_id)?.name : null; return <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm"><div><p className="font-semibold">{student ? studentName(student) : "Student"} - {feeName(optionalFee)}</p><p className="text-muted-foreground">{schoolClass ?? "Class"}{arm ? ` / ${arm}` : ""} - {assignment.term_id ? termById.get(assignment.term_id)?.name : "Session"} {sessionById.get(assignment.academic_session_id)?.name ?? ""} - {formatMoney(Number(assignment.amount))}</p></div><div className="flex items-center gap-3"><StatusBadge tone={assignment.status === "active" ? "green" : "gray"}>{assignment.status === "active" ? "Active" : "Cancelled"}</StatusBadge>{assignment.status === "active" ? <ConfirmActionForm action={cancelStudentOptionalFee} triggerLabel="Cancel" actionLabel="Cancel add-on" description="This optional fee will no longer be active for the student." fields={{ id: assignment.id }} /> : null}</div></div>; })}</CardContent></Card> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></CardContent></Card>;
}





