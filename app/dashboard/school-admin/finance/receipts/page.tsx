import { ReceiptCard } from "@/components/finance/receipt-card";
import { ActionForm } from "@/components/forms/action-form";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card } from "@/components/ui/card";
import { voidReceipt } from "@/app/dashboard/school-admin/finance/actions";
import { getSchoolContext } from "@/lib/school-context";
import { formatStudentName } from "@/lib/school-records";

export default async function ReceiptsPage() {
  const context = await getSchoolContext();
  const [{ data: receipts }, { data: students }, { data: invoices }, { data: payments }, { data: classes }, { data: arms }] = await Promise.all([
    context.supabase.from("receipts").select("*").eq("school_id", context.schoolId).order("issued_at", { ascending: false }),
    context.supabase.from("students").select("id, first_name, last_name, other_names, preferred_name, admission_number, current_class_id, current_arm_id").eq("school_id", context.schoolId),
    context.supabase.from("invoices").select("id, invoice_number, balance_amount").eq("school_id", context.schoolId),
    context.supabase.from("payments").select("id, paid_at, payment_method").eq("school_id", context.schoolId),
    context.supabase.from("classes").select("id, name").eq("school_id", context.schoolId),
    context.supabase.from("class_arms").select("id, name").eq("school_id", context.schoolId),
  ]);

  return <div className="space-y-6"><div><p className="text-sm font-semibold text-primary">Finance</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Receipts</h1><p className="mt-2 text-muted-foreground">View PDF-ready receipt layouts and void receipts when authorized.</p></div>{(receipts ?? []).length === 0 ? <EmptyState title="No receipts yet" message="Generate receipts from confirmed payments." /> : <div className="grid gap-5 xl:grid-cols-2">{(receipts ?? []).map((receipt) => { const student = (students ?? []).find((item) => item.id === receipt.student_id); const invoice = (invoices ?? []).find((item) => item.id === receipt.invoice_id); const payment = (payments ?? []).find((item) => item.id === receipt.payment_id); const classRow = (classes ?? []).find((item) => item.id === student?.current_class_id); const arm = (arms ?? []).find((item) => item.id === student?.current_arm_id); return <div className="space-y-3" key={receipt.id}><ReceiptCard schoolName={context.schoolName} receiptNumber={receipt.receipt_number} studentName={student ? formatStudentName(student) : "Student"} admissionNumber={student?.admission_number} className={classRow?.name} armName={arm?.name} paymentDate={payment?.paid_at ?? receipt.issued_at} paymentMethod={payment?.payment_method ?? "cash"} amount={Number(receipt.amount)} invoiceNumber={invoice?.invoice_number} balanceAfterPayment={invoice ? Number(invoice.balance_amount) : null} notes={receipt.notes} preview={!context.roles.includes("school_owner") && context.planCode === "free"} /><Card className="p-3"><ActionForm action={voidReceipt} submitLabel="Void receipt" className="space-y-2"><input type="hidden" name="id" value={receipt.id} /></ActionForm></Card></div>; })}</div>}</div>;
}

