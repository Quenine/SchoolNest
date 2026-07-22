import { EmptyState } from "@/components/dashboard/empty-state";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/finance/helpers";
import { getSchoolContext } from "@/lib/school-context";
import { formatStudentName } from "@/lib/school-records";

export default async function DebtorsPage() {
  const context = await getSchoolContext();
  const [{ data: invoices }, { data: students }, { data: classes }, { data: guardians }, { data: links }, { data: payments }] = await Promise.all([
    context.supabase.from("invoices").select("student_id, balance_amount, updated_at").eq("school_id", context.schoolId).gt("balance_amount", 0),
    context.supabase.from("students").select("id, first_name, last_name, other_names, preferred_name, current_class_id").eq("school_id", context.schoolId),
    context.supabase.from("classes").select("id, name").eq("school_id", context.schoolId),
    context.supabase.from("parent_guardians").select("id, phone").eq("school_id", context.schoolId),
    context.supabase.from("student_guardians").select("student_id, guardian_id, is_primary").eq("school_id", context.schoolId),
    context.supabase.from("payments").select("student_id, paid_at").eq("school_id", context.schoolId).eq("payment_status", "confirmed").order("paid_at", { ascending: false }),
  ]);
  const rows = (students ?? []).map((student) => {
    const studentInvoices = (invoices ?? []).filter((invoice) => invoice.student_id === student.id);
    const owed = studentInvoices.reduce((total, invoice) => total + Number(invoice.balance_amount ?? 0), 0);
    const primaryLink = (links ?? []).find((link) => link.student_id === student.id && link.is_primary) ?? (links ?? []).find((link) => link.student_id === student.id);
    const guardian = (guardians ?? []).find((item) => item.id === primaryLink?.guardian_id);
    const schoolClass = (classes ?? []).find((item) => item.id === student.current_class_id);
    const lastPayment = (payments ?? []).find((payment) => payment.student_id === student.id);
    return { student, owed, guardianPhone: guardian?.phone, className: schoolClass?.name, lastPayment: lastPayment?.paid_at };
  }).filter((row) => row.owed > 0);

  return <div className="space-y-6"><div><p className="text-sm font-semibold text-primary">Finance</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Debtors</h1><p className="mt-2 text-muted-foreground">Track outstanding balances by student, class, guardian contact, and last payment.</p></div><Card className="p-5"><p className="font-semibold">Exports and reminders</p><p className="mt-2 text-sm text-muted-foreground">CSV export, SMS, WhatsApp, and automated reminders are planned for a later premium step.</p></Card>{rows.length === 0 ? <EmptyState title="No debtors found for the selected filters" message="Outstanding balances will appear here after invoices are generated and payments are recorded." /> : <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-muted text-muted-foreground"><tr><th className="p-4">Student</th><th>Class</th><th>Guardian phone</th><th>Total owed</th><th>Last payment</th></tr></thead><tbody>{rows.map((row) => <tr className="border-t" key={row.student.id}><td className="p-4 font-medium">{formatStudentName(row.student)}</td><td>{row.className ?? "Unassigned"}</td><td>{row.guardianPhone ?? "-"}</td><td>{formatMoney(row.owed)}</td><td>{row.lastPayment ? new Date(row.lastPayment).toLocaleDateString("en-NG") : "No payment"}</td></tr>)}</tbody></table></div></Card>}</div>;
}
