import Link from "next/link";
import { ReceiptText, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatMoney, getStudentBalanceSummary } from "@/lib/finance/helpers";
import { getSchoolContext } from "@/lib/school-context";

export default async function Page() {
  const context = await getSchoolContext();
  const { data: invoices } = await context.supabase.from("invoices").select("total_amount, paid_amount, balance_amount").eq("school_id", context.schoolId);
  const summary = getStudentBalanceSummary((invoices ?? []).map((invoice) => ({ total_amount: Number(invoice.total_amount), paid_amount: Number(invoice.paid_amount), balance_amount: Number(invoice.balance_amount) })));
  return <div className="space-y-7"><div><p className="text-sm font-semibold text-primary">Parent portal</p><h1 className="mt-1 text-3xl font-bold tracking-tight">My children</h1><p className="mt-2 text-muted-foreground">Follow fees, receipts, announcements, and school updates for linked children.</p></div><div className="grid gap-4 sm:grid-cols-3"><Metric label="Total billed" value={formatMoney(summary.total)} /><Metric label="Paid" value={formatMoney(summary.paid)} /><Metric label="Outstanding" value={formatMoney(summary.balance)} /></div><div className="grid gap-4 md:grid-cols-2"><Link href="/dashboard/parent/fees" className="rounded-2xl border bg-white p-5 hover:border-primary"><WalletCards className="size-5 text-primary" /><p className="mt-4 font-semibold">Fees</p></Link><Link href="/dashboard/parent/receipts" className="rounded-2xl border bg-white p-5 hover:border-primary"><ReceiptText className="size-5 text-primary" /><p className="mt-4 font-semibold">Receipts</p></Link></div><Card className="p-5"><p className="font-semibold">Online payment coming soon</p><p className="mt-2 text-sm text-muted-foreground">The school can record cash, transfer, POS, cheque, and other manual payments now. Online payment will arrive in a later premium step.</p></Card></div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <Card className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>; }

