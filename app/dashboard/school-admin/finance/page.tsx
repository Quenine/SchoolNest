import Link from "next/link";
import { ArrowRight, Banknote, FileText, ReceiptText, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatMoney, getClassDebtorSummary } from "@/lib/finance/helpers";
import { getFinanceCounts, getSchoolContext } from "@/lib/school-context";

const links = [
  ["Fee Setup", "/dashboard/school-admin/finance/fees", WalletCards],
  ["Student Add-ons", "/dashboard/school-admin/finance/student-addons", WalletCards],
  ["Invoices", "/dashboard/school-admin/finance/invoices", FileText],
  ["Payments", "/dashboard/school-admin/finance/payments", Banknote],
  ["Receipts", "/dashboard/school-admin/finance/receipts", ReceiptText],
] as const;

export default async function FinancePage() {
  const context = await getSchoolContext();
  const counts = await getFinanceCounts(context.supabase, context.schoolId);
  const [{ data: invoices }, { data: payments }, { data: classFees }, { data: addOns }] = await Promise.all([
    context.supabase.from("invoices").select("student_id, total_amount, paid_amount, balance_amount").eq("school_id", context.schoolId),
    context.supabase.from("payments").select("amount, paid_at, payment_method").eq("school_id", context.schoolId).eq("payment_status", "confirmed").order("paid_at", { ascending: false }).limit(5),
    context.supabase.from("class_fee_structures").select("id, academic_session_id, term_id, class_id, arm_id, is_required").eq("school_id", context.schoolId),
    context.supabase.from("student_optional_fees").select("student_id, status").eq("school_id", context.schoolId),
  ]);
  const expected = (invoices ?? []).reduce((total, invoice) => total + Number(invoice.total_amount ?? 0), 0);
  const paid = (invoices ?? []).reduce((total, invoice) => total + Number(invoice.paid_amount ?? 0), 0);
  const debt = getClassDebtorSummary((invoices ?? []).map((invoice) => ({ student_id: invoice.student_id, balance_amount: Number(invoice.balance_amount ?? 0) })));
  const compulsoryGroups = new Set((classFees ?? []).filter((fee) => fee.is_required).map((fee) => [fee.academic_session_id, fee.term_id ?? "session", fee.class_id, fee.arm_id ?? "all"].join(":"))).size;
  const optionalGroups = (classFees ?? []).filter((fee) => !fee.is_required).length;
  const activeAddOns = (addOns ?? []).filter((row) => row.status === "active");
  const addOnStudents = new Set(activeAddOns.map((row) => row.student_id)).size;
  const invoicesReady = counts.feeItems > 0 && compulsoryGroups > 0;

  return (
    <div className="space-y-7">
      <div><p className="text-sm font-semibold text-primary">Fees & finance</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Finance overview</h1><p className="mt-2 text-muted-foreground">Track finance setup progress, generate invoices, record payments, issue receipts, and follow debtor balances.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Expected from invoices" value={formatMoney(expected)} /><Metric label="Collected" value={formatMoney(paid)} /><Metric label="Outstanding" value={formatMoney(debt.balance)} /><Metric label="Debtors" value={String(debt.debtorCount)} /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Base class fees configured" value={`${compulsoryGroups} groups`} /><Metric label="Optional fees available" value={`${optionalGroups} fees`} /><Metric label="Optional add-ons assigned" value={`${addOnStudents} students`} /><Metric label="Invoices" value={invoicesReady ? "Ready" : "Not ready"} /></div>
      <Card className="p-5"><p className="font-semibold">Finance setup progress</p><p className="mt-2 text-sm text-muted-foreground">Fee items: {counts.feeItems}. Compulsory class fees: {compulsoryGroups}. Student add-ons: {activeAddOns.length}. {invoicesReady ? "You can generate invoices from compulsory class fees plus assigned add-ons." : "Finish fee items and compulsory class fees before generating invoices."}</p></Card>
      <div className="grid gap-4 md:grid-cols-5">{links.map(([label, href, Icon]) => <Link key={href} href={href} className="rounded-2xl border bg-white p-5 transition hover:border-primary"><Icon className="size-5 text-primary" /><div className="mt-4 flex items-center justify-between"><p className="font-semibold">{label}</p><ArrowRight className="size-4" /></div></Link>)}</div>
      <div className="grid gap-4 lg:grid-cols-2"><Card className="p-5"><p className="font-semibold">Plan status: {context.planName}</p><p className="mt-2 text-sm text-muted-foreground">Manual finance is available. Online Paystack payments, reminders, and advanced analytics are prepared for later premium steps and are not active yet.</p></Card><Card className="p-5"><p className="font-semibold">Recent payments</p><div className="mt-3 space-y-2 text-sm text-muted-foreground">{(payments ?? []).length === 0 ? "No payments recorded yet." : (payments ?? []).map((payment) => <p key={`${payment.paid_at}-${payment.amount}`}>{formatMoney(Number(payment.amount))} by {payment.payment_method.replace("_", " ")}</p>)}</div></Card></div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <Card className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>; }
