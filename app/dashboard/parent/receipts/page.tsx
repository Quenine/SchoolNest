import { ReceiptCard } from "@/components/finance/receipt-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { getSchoolContext } from "@/lib/school-context";
import { formatStudentName } from "@/lib/school-records";

export default async function ParentReceiptsPage() {
  const context = await getSchoolContext();
  const [{ data: receipts }, { data: students }, { data: invoices }, { data: payments }] = await Promise.all([
    context.supabase.from("receipts").select("*").eq("school_id", context.schoolId).order("issued_at", { ascending: false }),
    context.supabase.from("students").select("id, first_name, last_name, other_names, preferred_name, admission_number").eq("school_id", context.schoolId),
    context.supabase.from("invoices").select("id, invoice_number, balance_amount").eq("school_id", context.schoolId),
    context.supabase.from("payments").select("id, paid_at, payment_method").eq("school_id", context.schoolId),
  ]);

  return <div className="space-y-6"><div><p className="text-sm font-semibold text-primary">Parent portal</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Receipts</h1><p className="mt-2 text-muted-foreground">Receipts issued for your linked children.</p></div>{(receipts ?? []).length === 0 ? <EmptyState title="No receipts yet" message="Receipts will appear here after the school records and confirms payments." /> : <div className="grid gap-5 xl:grid-cols-2">{(receipts ?? []).map((receipt) => { const student = (students ?? []).find((item) => item.id === receipt.student_id); const invoice = (invoices ?? []).find((item) => item.id === receipt.invoice_id); const payment = (payments ?? []).find((item) => item.id === receipt.payment_id); return <ReceiptCard key={receipt.id} schoolName={context.schoolName} receiptNumber={receipt.receipt_number} studentName={student ? formatStudentName(student) : "Child"} admissionNumber={student?.admission_number} paymentDate={payment?.paid_at ?? receipt.issued_at} paymentMethod={payment?.payment_method ?? "cash"} amount={Number(receipt.amount)} invoiceNumber={invoice?.invoice_number} balanceAfterPayment={invoice ? Number(invoice.balance_amount) : null} notes={receipt.notes} preview={context.planCode === "free"} />; })}</div>}</div>;
}

