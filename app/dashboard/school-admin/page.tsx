import Link from "next/link";
import { ArrowRight, Bell, Building2, CalendarCheck, UserRoundCog, UsersRound, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { QuotaCard } from "@/components/dashboard/quota-card";
import { formatMoney, getClassDebtorSummary } from "@/lib/finance/helpers";
import { getFinanceCounts, getSchoolContext, getSchoolCounts } from "@/lib/school-context";

const links = [["School setup", "/dashboard/school-admin/setup", Building2], ["Students", "/dashboard/school-admin/students", UsersRound], ["Staff", "/dashboard/school-admin/staff", UserRoundCog], ["Finance", "/dashboard/school-admin/finance", WalletCards], ["Attendance", "/dashboard/school-admin/attendance", CalendarCheck], ["Announcements", "/dashboard/school-admin/announcements", Bell]] as const;

export default async function Page() {
  const context = await getSchoolContext();
  const counts = await getSchoolCounts(context.supabase, context.schoolId);
  const financeCounts = await getFinanceCounts(context.supabase, context.schoolId);
  const { data: invoices } = await context.supabase.from("invoices").select("student_id, balance_amount").eq("school_id", context.schoolId);
  const debt = getClassDebtorSummary((invoices ?? []).map((invoice) => ({ student_id: invoice.student_id, balance_amount: Number(invoice.balance_amount ?? 0) })));

  return <div className="space-y-7"><div><p className="text-sm font-semibold text-primary">School administration</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Setup command center</h1><p className="mt-2 max-w-2xl text-muted-foreground">Complete core records, configure fees, generate invoices, and monitor balances.</p></div><div className="grid gap-4 sm:grid-cols-3"><QuotaCard label="Students" count={counts.students} limit={context.limits.maxStudents} /><QuotaCard label="Staff" count={counts.staff} limit={context.limits.maxStaff} /><QuotaCard label="Classes" count={counts.classes} limit={context.limits.maxClasses} /></div><Card className="p-5"><p className="font-semibold">Finance summary</p><p className="mt-2 text-sm text-muted-foreground">Outstanding balance: {formatMoney(debt.balance)} across {debt.debtorCount} debtor(s). Setup progress: categories {financeCounts.categories}, fee items {financeCounts.feeItems}, class fees {financeCounts.structures}, invoices {financeCounts.invoices}.</p></Card><div className="grid gap-4 md:grid-cols-3">{links.map(([label, href, Icon]) => <Link key={href} href={href} className="rounded-2xl border bg-white p-5 transition hover:border-primary"><Icon className="size-5 text-primary" /><div className="mt-4 flex items-center justify-between"><p className="font-semibold">{label}</p><ArrowRight className="size-4" /></div></Link>)}</div><Card className="p-6"><h2 className="font-semibold">Recommended setup flow</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Complete profile, sessions, classes, subjects, people records, fee categories, fee items, class fee structures, invoices, payments, and receipts.</p></Card></div>;
}
