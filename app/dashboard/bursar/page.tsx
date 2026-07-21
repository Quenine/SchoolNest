import Link from "next/link";
import { Banknote, FileText, ReceiptText, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatMoney, getClassDebtorSummary } from "@/lib/finance/helpers";
import { getSchoolContext } from "@/lib/school-context";

const links = [["Fee Setup", "/dashboard/bursar/fees", WalletCards], ["Student Add-ons", "/dashboard/bursar/student-addons", WalletCards], ["Invoices", "/dashboard/bursar/invoices", FileText], ["Payments", "/dashboard/bursar/payments", Banknote], ["Receipts", "/dashboard/bursar/receipts", ReceiptText], ["Debtors", "/dashboard/bursar/debtors", FileText]] as const;

export default async function Page() {
  const context = await getSchoolContext();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: invoices }, { data: payments }] = await Promise.all([
    context.supabase.from("invoices").select("student_id, total_amount, paid_amount, balance_amount").eq("school_id", context.schoolId),
    context.supabase.from("payments").select("amount, paid_at, payment_reference").eq("school_id", context.schoolId).eq("payment_status", "confirmed").order("paid_at", { ascending: false }).limit(6),
  ]);
  const expected = (invoices ?? []).reduce((total, invoice) => total + Number(invoice.total_amount ?? 0), 0);
  const collected = (invoices ?? []).reduce((total, invoice) => total + Number(invoice.paid_amount ?? 0), 0);
  const debt = getClassDebtorSummary((invoices ?? []).map((invoice) => ({ student_id: invoice.student_id, balance_amount: Number(invoice.balance_amount ?? 0) })));
  const todayPayments = (payments ?? []).filter((payment) => String(payment.paid_at).startsWith(today)).reduce((total, payment) => total + Number(payment.amount ?? 0), 0);

  return <div className="space-y-7"><div><p className="text-sm font-semibold text-primary">Bursar workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Finance desk</h1><p className="mt-2 text-muted-foreground">Record payments, generate invoices, issue receipts, and follow up outstanding balances.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Today" value={formatMoney(todayPayments)} /><Metric label="Expected" value={formatMoney(expected)} /><Metric label="Collected" value={formatMoney(collected)} /><Metric label="Outstanding" value={formatMoney(debt.balance)} /><Metric label="Debtors" value={String(debt.debtorCount)} /></div><div className="grid gap-4 md:grid-cols-5">{links.map(([label, href, Icon]) => <Link key={href} href={href} className="rounded-2xl border bg-white p-5 hover:border-primary"><Icon className="size-5 text-primary" /><p className="mt-4 font-semibold">{label}</p></Link>)}</div><Card className="p-5"><p className="font-semibold">Recent payments</p><div className="mt-3 space-y-2 text-sm text-muted-foreground">{(payments ?? []).length === 0 ? "No recent payments." : (payments ?? []).map((payment) => <p key={payment.payment_reference}>{payment.payment_reference}: {formatMoney(Number(payment.amount))}</p>)}</div></Card></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <Card className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>; }


