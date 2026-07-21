import Link from "next/link";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card } from "@/components/ui/card";
import { formatMoney, getStudentBalanceSummary } from "@/lib/finance/helpers";
import { getSchoolContext } from "@/lib/school-context";
import { formatStudentName } from "@/lib/school-records";

export default async function ParentFeesPage() {
  const context = await getSchoolContext();
  const [{ data: students }, { data: invoices }, { data: payments }] = await Promise.all([
    context.supabase.from("students").select("id, first_name, last_name, other_names, preferred_name").eq("school_id", context.schoolId),
    context.supabase.from("invoices").select("*").eq("school_id", context.schoolId).order("created_at", { ascending: false }),
    context.supabase.from("payments").select("*").eq("school_id", context.schoolId).order("paid_at", { ascending: false }),
  ]);
  const summary = getStudentBalanceSummary((invoices ?? []).map((invoice) => ({ total_amount: Number(invoice.total_amount), paid_amount: Number(invoice.paid_amount), balance_amount: Number(invoice.balance_amount) })));

  return <div className="space-y-6"><div><p className="text-sm font-semibold text-primary">Parent portal</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Fees</h1><p className="mt-2 text-muted-foreground">View invoices and manual payment history for your linked children. Online payment is coming soon.</p></div><div className="grid gap-4 sm:grid-cols-3"><Metric label="Total billed" value={formatMoney(summary.total)} /><Metric label="Paid" value={formatMoney(summary.paid)} /><Metric label="Outstanding" value={formatMoney(summary.balance)} /></div>{(invoices ?? []).length === 0 ? <EmptyState title="No invoices yet" message="Your child’s school fee invoices will appear here when issued by the school." /> : <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-muted text-muted-foreground"><tr><th className="p-4">Invoice</th><th>Child</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>{(invoices ?? []).map((invoice) => { const student = (students ?? []).find((item) => item.id === invoice.student_id); return <tr className="border-t" key={invoice.id}><td className="p-4 font-medium">{invoice.invoice_number}</td><td>{student ? formatStudentName(student) : "Child"}</td><td>{formatMoney(Number(invoice.total_amount))}</td><td>{formatMoney(Number(invoice.paid_amount))}</td><td>{formatMoney(Number(invoice.balance_amount))}</td><td>{invoice.status}</td></tr>; })}</tbody></table></div></Card>}<Card className="p-5"><p className="font-semibold">Payment history</p><div className="mt-3 space-y-2 text-sm text-muted-foreground">{(payments ?? []).length === 0 ? "No payments recorded yet." : (payments ?? []).map((payment) => <p key={payment.id}>{payment.payment_reference}: {formatMoney(Number(payment.amount))} ({payment.payment_status})</p>)}</div><Link href="/dashboard/parent/receipts" className="mt-4 inline-block text-sm font-semibold text-primary">View receipts</Link></Card></div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <Card className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>; }

