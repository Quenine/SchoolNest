import type { InvoiceStatus } from "@/lib/types";

export interface InvoiceLineInput {
  quantity: number;
  unitAmount: number;
}

export interface InvoiceAdjustmentInput {
  type: "discount" | "scholarship" | "waiver" | "sibling_discount" | "surcharge" | "correction";
  amount: number;
  amountType: "fixed" | "percentage";
}

export function toKobo(amount: number) {
  return Math.round(amount * 100);
}

export function fromKobo(kobo: number) {
  return Number((kobo / 100).toFixed(2));
}

export function normalizeAmountInput(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const amount = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(amount) ? fromKobo(toKobo(amount)) : 0;
}

export function formatMoney(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

export function calculateInvoiceTotals(lines: InvoiceLineInput[], adjustments: InvoiceAdjustmentInput[] = [], paidAmount = 0) {
  const subtotalKobo = lines.reduce((total, line) => total + toKobo(line.quantity * line.unitAmount), 0);
  let discountKobo = 0;
  let surchargeKobo = 0;

  for (const adjustment of adjustments) {
    const base = adjustment.amountType === "percentage" ? Math.round(subtotalKobo * (adjustment.amount / 100)) : toKobo(adjustment.amount);
    if (["discount", "scholarship", "waiver", "sibling_discount"].includes(adjustment.type)) discountKobo += base;
    if (["surcharge", "correction"].includes(adjustment.type)) surchargeKobo += base;
  }

  const totalKobo = Math.max(subtotalKobo - discountKobo + surchargeKobo, 0);
  const paidKobo = Math.min(toKobo(paidAmount), totalKobo);
  const balanceKobo = Math.max(totalKobo - paidKobo, 0);

  return {
    subtotalAmount: fromKobo(subtotalKobo),
    discountAmount: fromKobo(discountKobo),
    adjustmentAmount: fromKobo(surchargeKobo),
    totalAmount: fromKobo(totalKobo),
    paidAmount: fromKobo(paidKobo),
    balanceAmount: fromKobo(balanceKobo),
  };
}

export function calculateInvoiceStatus(totalAmount: number, paidAmount: number, dueDate?: string | null, now = new Date()): InvoiceStatus {
  if (paidAmount >= totalAmount && totalAmount > 0) return "paid";
  if (paidAmount > 0) return "partially_paid";
  if (dueDate && new Date(dueDate) < now) return "overdue";
  return "issued";
}

function compactDate(date = new Date()) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

export function generateInvoiceNumber(schoolCode: string, nextCount: number, date = new Date()) {
  return `INV-${schoolCode}-${compactDate(date)}-${String(nextCount + 1).padStart(5, "0")}`;
}

export function generatePaymentReference(schoolCode: string, nextCount: number, date = new Date()) {
  return `PAY-${schoolCode}-${compactDate(date)}-${String(nextCount + 1).padStart(5, "0")}`;
}

export function generateReceiptNumber(schoolCode: string, nextCount: number, date = new Date()) {
  return `RCT-${schoolCode}-${compactDate(date)}-${String(nextCount + 1).padStart(5, "0")}`;
}

export function getStudentBalanceSummary(invoices: Array<{ total_amount: number; paid_amount: number; balance_amount: number }>) {
  return invoices.reduce((summary, invoice) => ({
    total: fromKobo(toKobo(summary.total) + toKobo(invoice.total_amount)),
    paid: fromKobo(toKobo(summary.paid) + toKobo(invoice.paid_amount)),
    balance: fromKobo(toKobo(summary.balance) + toKobo(invoice.balance_amount)),
  }), { total: 0, paid: 0, balance: 0 });
}

export function getClassDebtorSummary(invoices: Array<{ student_id: string; balance_amount: number }>) {
  const debtorIds = new Set(invoices.filter((invoice) => invoice.balance_amount > 0).map((invoice) => invoice.student_id));
  const balance = invoices.reduce((total, invoice) => total + toKobo(invoice.balance_amount), 0);
  return { debtorCount: debtorIds.size, balance: fromKobo(balance) };
}
export interface ClassFeeLineInput {
  amount: number;
  isRequired: boolean;
}

export interface OptionalFeeAssignmentInput {
  amount: number;
  status: "active" | "cancelled" | string;
}

export function calculateClassBaseTotal(lines: ClassFeeLineInput[]) {
  const totalKobo = lines.filter((line) => line.isRequired).reduce((total, line) => total + toKobo(line.amount), 0);
  return fromKobo(totalKobo);
}

export function calculateStudentOptionalTotal(assignments: OptionalFeeAssignmentInput[]) {
  const totalKobo = assignments.filter((assignment) => assignment.status === "active").reduce((total, assignment) => total + toKobo(assignment.amount), 0);
  return fromKobo(totalKobo);
}

export function buildStudentInvoiceLines(requiredFees: Array<{ amount: number }>, optionalFees: OptionalFeeAssignmentInput[]) {
  return [
    ...requiredFees.map((fee) => ({ quantity: 1, unitAmount: fee.amount })),
    ...optionalFees.filter((fee) => fee.status === "active").map((fee) => ({ quantity: 1, unitAmount: fee.amount })),
  ];
}

