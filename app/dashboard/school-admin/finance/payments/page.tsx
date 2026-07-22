import { ActionForm } from "@/components/forms/action-form";
import { ConfirmActionForm } from "@/components/forms/confirm-action-form";
import { ManualPaymentForm } from "@/components/forms/manual-payment-form";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmPayment, generateReceiptForPayment, recordManualPayment, rejectPayment, reversePayment } from "@/app/dashboard/school-admin/finance/actions";
import { formatMoney } from "@/lib/finance/helpers";
import { getSchoolContext } from "@/lib/school-context";
import { formatStudentName } from "@/lib/school-records";

export default async function PaymentsPage() {
  const context = await getSchoolContext();
  const [{ data: payments }, { data: students }, { data: invoices }] = await Promise.all([
    context.supabase.from("payments").select("*").eq("school_id", context.schoolId).order("paid_at", { ascending: false }),
    context.supabase.from("students").select("id, first_name, last_name, other_names, preferred_name").eq("school_id", context.schoolId).order("last_name"),
    context.supabase.from("invoices").select("id, invoice_number, student_id, balance_amount, total_amount, status, academic_sessions(name), terms(name)").eq("school_id", context.schoolId).in("status", ["draft", "issued", "partially_paid", "overdue"]).gt("balance_amount", 0).order("created_at", { ascending: false }),
  ]);

  return <div className="space-y-6"><div><p className="text-sm font-semibold text-primary">Finance</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Payments</h1><p className="mt-2 text-muted-foreground">Record cash, transfer, POS, cheque, mobile money, or other manual payments.</p></div><Card><CardHeader><CardTitle>Record manual payment</CardTitle></CardHeader><CardContent><ManualPaymentForm action={recordManualPayment} students={(students ?? []).map((student) => ({ id: student.id, name: formatStudentName(student) }))} invoices={(invoices ?? []).map((invoice) => ({ id: invoice.id, student_id: invoice.student_id, invoice_number: invoice.invoice_number, balance_amount: Number(invoice.balance_amount), total_amount: Number(invoice.total_amount), context: "Outstanding invoice" }))} /></CardContent></Card>{(payments ?? []).length === 0 ? <EmptyState title="No payments recorded yet" message="Record a cash, transfer, POS, or cheque payment." /> : <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-muted text-muted-foreground"><tr><th className="p-4">Reference</th><th>Student</th><th>Amount</th><th>Method</th><th>Status</th><th>Actions</th></tr></thead><tbody>{(payments ?? []).map((payment) => { const student = (students ?? []).find((item) => item.id === payment.student_id); return <tr className="border-t" key={payment.id}><td className="p-4 font-medium">{payment.payment_reference}</td><td>{student ? formatStudentName(student) : "Student"}</td><td>{formatMoney(Number(payment.amount))}</td><td>{payment.payment_method.replace("_", " ")}</td><td>{payment.payment_status}</td><td className="flex flex-wrap gap-2 py-2"><ActionForm action={confirmPayment} submitLabel="Confirm" className="space-y-1"><input type="hidden" name="id" value={payment.id} /></ActionForm><ConfirmActionForm action={rejectPayment} triggerLabel="Reject" actionLabel="Reject payment" description="This payment will not count toward the invoice balance." fields={{ id: payment.id }} /><ConfirmActionForm action={reversePayment} triggerLabel="Reverse" actionLabel="Reverse payment" description="This reverses a recorded payment and recomputes its invoice." fields={{ id: payment.id }} /><ActionForm action={generateReceiptForPayment} submitLabel="Receipt" className="space-y-1"><input type="hidden" name="payment_id" value={payment.id} /></ActionForm></td></tr>; })}</tbody></table></div></Card>}</div>;
}







