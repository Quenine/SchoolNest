"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAuditEvent } from "@/lib/audit";
import { calculateInvoiceStatus, calculateInvoiceTotals, generateInvoiceNumber, generatePaymentReference, generateReceiptNumber, normalizeAmountInput } from "@/lib/finance/helpers";
import { assertCanManageFinance, getFinanceCounts, getSchoolContext } from "@/lib/school-context";
import { normalizeCode, normalizePhoneNumber } from "@/lib/school-records";
import { isFutureInSchoolTimezone } from "@/lib/dates";
import { normalizeFormData } from "@/lib/validation/common";
import { classFeeStructureSchema, classInvoiceGenerationSchema, feeCategorySchema, feeItemSchema, financeAuditNoteSchema, invoiceGenerationSchema, invoiceStatusSchema, manualPaymentSchema, paymentStatusSchema, receiptNoteSchema, studentFeeAdjustmentSchema, studentOptionalFeeSchema } from "@/lib/validation/finance";
import type { ActionState } from "@/app/dashboard/school-admin/setup/actions";
import type { FeeAdjustmentType, InvoiceStatus } from "@/lib/types";

const ok = (message: string): ActionState => ({ ok: true, success: true, message });
const fail = (message: string, errors?: Record<string, string[]>): ActionState => ({ ok: false, success: false, message, errors, fieldErrors: errors, error: message });

function compactErrors(errors: Record<string, string[] | undefined>) {
  return Object.fromEntries(Object.entries(errors).filter((entry): entry is [string, string[]] => Array.isArray(entry[1])));
}

function parseForm<T>(schema: z.ZodType<T>, formData: FormData) {
  const parsed = schema.safeParse(normalizeFormData(formData));
  if (!parsed.success) return { data: null, error: fail("Please check the highlighted fields.", compactErrors(parsed.error.flatten().fieldErrors)) };
  return { data: parsed.data, error: null };
}

async function financeContext() {
  const context = await getSchoolContext();
  assertCanManageFinance(context);
  return context;
}

function refreshFinance() {
  [
    "/dashboard/school-admin", "/dashboard/school-admin/finance", "/dashboard/school-admin/finance/fees",
    "/dashboard/school-admin/finance/invoices", "/dashboard/school-admin/finance/payments", "/dashboard/school-admin/finance/receipts",
    "/dashboard/school-admin/finance/debtors", "/dashboard/school-admin/finance/student-addons", "/dashboard/bursar", "/dashboard/bursar/fees", "/dashboard/bursar/invoices",
    "/dashboard/bursar/payments", "/dashboard/bursar/receipts", "/dashboard/bursar/debtors", "/dashboard/bursar/student-addons", "/dashboard/parent", "/dashboard/parent/fees", "/dashboard/parent/receipts",
  ].forEach((path) => revalidatePath(path));
}

async function audit(action: string, entityType: string, entityId: string | undefined, metadata: Record<string, unknown> = {}) {
  const context = await getSchoolContext();
  await recordAuditEvent(async (event) => {
    await context.supabase.from("audit_logs").insert({
      school_id: event.schoolId,
      actor_user_id: event.actorUserId,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId,
      metadata: event.metadata ?? {},
    });
  }, { schoolId: context.schoolId, actorUserId: context.userId, action, entityType, entityId, metadata });
}

async function schoolCode(context: Awaited<ReturnType<typeof getSchoolContext>>) {
  const { data } = await context.supabase.from("schools").select("slug").eq("id", context.schoolId).single();
  return String(data?.slug ?? "SCH").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "SCH";
}

async function nextCount(context: Awaited<ReturnType<typeof getSchoolContext>>, table: "invoices" | "payments" | "receipts") {
  const { count } = await context.supabase.from(table).select("id", { count: "exact", head: true }).eq("school_id", context.schoolId);
  return count ?? 0;
}

async function recomputeInvoice(context: Awaited<ReturnType<typeof getSchoolContext>>, invoiceId: string) {
  const [{ data: items }, { data: payments }, { data: invoice }] = await Promise.all([
    context.supabase.from("invoice_items").select("quantity, unit_amount").eq("school_id", context.schoolId).eq("invoice_id", invoiceId),
    context.supabase.from("payment_allocations").select("amount, payments(payment_status)").eq("school_id", context.schoolId).eq("invoice_id", invoiceId),
    context.supabase.from("invoices").select("due_date").eq("school_id", context.schoolId).eq("id", invoiceId).single(),
  ]);
  const paidAmount = (payments ?? []).reduce((total, allocation) => {
    const payment = Array.isArray(allocation.payments) ? allocation.payments[0] : allocation.payments;
    return payment?.payment_status === "confirmed" ? total + normalizeAmountInput(allocation.amount) : total;
  }, 0);
  const totals = calculateInvoiceTotals((items ?? []).map((item) => ({ quantity: normalizeAmountInput(item.quantity), unitAmount: normalizeAmountInput(item.unit_amount) })), [], paidAmount);
  const status = calculateInvoiceStatus(totals.totalAmount, totals.paidAmount, invoice?.due_date);
  await context.supabase.from("invoices").update({
    subtotal_amount: totals.subtotalAmount,
    discount_amount: totals.discountAmount,
    adjustment_amount: totals.adjustmentAmount,
    total_amount: totals.totalAmount,
    paid_amount: totals.paidAmount,
    balance_amount: totals.balanceAmount,
    status,
  }).eq("school_id", context.schoolId).eq("id", invoiceId);
  return { ...totals, status };
}

const defaultCategories = [
  ["Tuition", "TUITION"], ["Development Levy", "DEVELOPMENT_LEVY"], ["Books", "BOOKS"], ["Uniform", "UNIFORM"],
  ["Transport", "TRANSPORT"], ["Feeding", "FEEDING"], ["Boarding", "BOARDING"], ["PTA", "PTA"],
  ["Examination", "EXAMINATION"], ["Other", "OTHER"],
] as const;

export async function createDefaultFeeCategories(_prev: ActionState, _formData: FormData) {
  void _prev; void _formData;
  const context = await financeContext();
  const rows = defaultCategories.map(([name, code], index) => ({ school_id: context.schoolId, name, code, is_active: true, sort_order: (index + 1) * 10 }));
  const codes = rows.map((row) => row.code);
  const { count: existingCount, error: existingError } = await context.supabase.from("fee_categories").select("id", { count: "exact", head: true }).eq("school_id", context.schoolId).in("code", codes);
  if (existingError) return fail(existingError.message);
  const { error } = await context.supabase.from("fee_categories").upsert(rows, { onConflict: "school_id,code" });
  if (error) return fail(error.message);
  const { data: visibleRows, error: visibleError } = await context.supabase.from("fee_categories").select("id, code").eq("school_id", context.schoolId).in("code", codes);
  if (visibleError) return fail(visibleError.message);
  if ((visibleRows ?? []).length < rows.length) return fail("Default categories were written but could not be read back. Check fee category RLS policies for this role.");
  await audit("finance.default_categories_created", "fee_categories", undefined, { count: rows.length, already_existing: existingCount ?? 0 });
  refreshFinance();
  return ok((existingCount ?? 0) >= rows.length ? "Default fee categories already exist and are visible." : "Default fee categories are ready and visible.");
}

export async function createFeeCategory(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(feeCategorySchema, formData); if (parsed.error) return parsed.error;
  const context = await financeContext();
  const { data, error } = await context.supabase.from("fee_categories").insert({ ...parsed.data, id: undefined, school_id: context.schoolId, code: normalizeCode(parsed.data.code) }).select("id").single();
  if (error) return fail(error.message);
  await audit("finance.fee_category_created", "fee_categories", data.id, { name: parsed.data.name });
  refreshFinance(); return ok("Fee category created.");
}

export async function updateFeeCategory(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(feeCategorySchema.required({ id: true }), formData); if (parsed.error) return parsed.error;
  const context = await financeContext(); const { id, ...values } = parsed.data; if (!id) return fail("Missing record id.");
  const { error } = await context.supabase.from("fee_categories").update({ ...values, code: normalizeCode(values.code) }).eq("school_id", context.schoolId).eq("id", id);
  if (error) return fail(error.message); await audit("finance.fee_category_updated", "fee_categories", id, { name: values.name }); refreshFinance(); return ok("Fee category updated.");
}

export async function deactivateFeeCategory(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(z.object({ id: z.string().uuid() }), formData); if (parsed.error) return parsed.error;
  const context = await financeContext(); const { error } = await context.supabase.from("fee_categories").update({ is_active: false }).eq("school_id", context.schoolId).eq("id", parsed.data.id);
  if (error) return fail(error.message); await audit("finance.fee_category_deactivated", "fee_categories", parsed.data.id); refreshFinance(); return ok("Fee category deactivated.");
}

export async function createFeeItem(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(feeItemSchema, formData); if (parsed.error) return parsed.error;
  const context = await financeContext();
  const counts = await getFinanceCounts(context.supabase, context.schoolId);
  if (context.planCode === "free" && counts.feeItems >= 3) return fail("Free plan allows up to 3 active fee items. Upgrade to add more.");
  const { data, error } = await context.supabase.from("fee_items").insert({ ...parsed.data, id: undefined, school_id: context.schoolId, code: normalizeCode(parsed.data.code) }).select("id").single();
  if (error) return fail(error.message); await audit("finance.fee_item_created", "fee_items", data.id, { name: parsed.data.name }); refreshFinance(); return ok("Fee item created.");
}

export async function updateFeeItem(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(feeItemSchema.required({ id: true }), formData); if (parsed.error) return parsed.error;
  const context = await financeContext(); const { id, ...values } = parsed.data; if (!id) return fail("Missing record id.");
  const { error } = await context.supabase.from("fee_items").update({ ...values, code: normalizeCode(values.code) }).eq("school_id", context.schoolId).eq("id", id);
  if (error) return fail(error.message); await audit("finance.fee_item_updated", "fee_items", id, { name: values.name }); refreshFinance(); return ok("Fee item updated.");
}

export async function deactivateFeeItem(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(z.object({ id: z.string().uuid() }), formData); if (parsed.error) return parsed.error;
  const context = await financeContext(); const { error } = await context.supabase.from("fee_items").update({ is_active: false }).eq("school_id", context.schoolId).eq("id", parsed.data.id);
  if (error) return fail(error.message); await audit("finance.fee_item_deactivated", "fee_items", parsed.data.id); refreshFinance(); return ok("Fee item deactivated.");
}

export async function createClassFeeStructure(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(classFeeStructureSchema, formData); if (parsed.error) return parsed.error;
  const context = await financeContext();
  const { data, error } = await context.supabase.from("class_fee_structures").upsert({ ...parsed.data, id: undefined, school_id: context.schoolId }, { onConflict: "school_id,academic_session_id,term_id,class_id,arm_id,fee_item_id" }).select("id").single();
  if (error) return fail(error.message); await audit("finance.class_fee_structure_created", "class_fee_structures", data.id, { class_id: parsed.data.class_id, fee_item_id: parsed.data.fee_item_id }); refreshFinance(); return ok("Class fee assigned.");
}

export async function updateClassFeeStructure(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(classFeeStructureSchema.required({ id: true }), formData); if (parsed.error) return parsed.error;
  const context = await financeContext(); const { id, ...values } = parsed.data; if (!id) return fail("Missing record id.");
  const { error } = await context.supabase.from("class_fee_structures").update(values).eq("school_id", context.schoolId).eq("id", id);
  if (error) return fail(error.message); await audit("finance.class_fee_structure_updated", "class_fee_structures", id); refreshFinance(); return ok("Class fee updated.");
}

export async function removeClassFeeStructure(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(z.object({ id: z.string().uuid() }), formData); if (parsed.error) return parsed.error;
  const context = await financeContext(); const { error } = await context.supabase.from("class_fee_structures").delete().eq("school_id", context.schoolId).eq("id", parsed.data.id);
  if (error) return fail(error.message); await audit("finance.class_fee_structure_removed", "class_fee_structures", parsed.data.id); refreshFinance(); return ok("Class fee removed.");
}


export async function assignStudentOptionalFee(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(studentOptionalFeeSchema, formData); if (parsed.error) return parsed.error;
  const context = await financeContext();
  const [{ data: fee }, { data: student }] = await Promise.all([
    context.supabase.from("class_fee_structures").select("id, amount, class_id, arm_id, is_required, academic_session_id, term_id").eq("school_id", context.schoolId).eq("id", parsed.data.class_fee_structure_id).single(),
    context.supabase.from("students").select("id, current_class_id, current_arm_id").eq("school_id", context.schoolId).eq("id", parsed.data.student_id).single(),
  ]);
  if (!fee) return fail("Optional fee not found for this school.");
  if (fee.is_required) return fail("Choose an optional fee, not a compulsory class fee.");
  if (!student) return fail("Student not found for this school.");
  if (student.current_class_id !== fee.class_id) return fail("This optional fee is not for the student's current class.");
  if (fee.arm_id && fee.arm_id !== student.current_arm_id) return fail("This optional fee is not for the student's current arm.");
  if (fee.academic_session_id !== parsed.data.academic_session_id || (fee.term_id ?? null) !== (parsed.data.term_id ?? null)) return fail("This optional fee is not configured for the selected session and term.");

  let existingQuery = context.supabase.from("student_optional_fees").select("id").eq("school_id", context.schoolId).eq("student_id", parsed.data.student_id).eq("academic_session_id", parsed.data.academic_session_id).eq("class_fee_structure_id", parsed.data.class_fee_structure_id);
  existingQuery = parsed.data.term_id ? existingQuery.eq("term_id", parsed.data.term_id) : existingQuery.is("term_id", null);
  const { data: existing } = await existingQuery.maybeSingle();
  const payload = {
    ...parsed.data,
    school_id: context.schoolId,
    status: "active",
    created_by_user_profile_id: context.profileId,
  };
  const result = existing?.id
    ? await context.supabase.from("student_optional_fees").update(payload).eq("school_id", context.schoolId).eq("id", existing.id).select("id").single()
    : await context.supabase.from("student_optional_fees").insert(payload).select("id").single();
  if (result.error || !result.data) return fail(result.error?.message ?? "Student add-on could not be saved.");
  await audit("finance.student_optional_fee_assigned", "student_optional_fees", result.data.id, { student_id: parsed.data.student_id, class_fee_structure_id: parsed.data.class_fee_structure_id });
  refreshFinance();
  return ok("Student add-on saved.");
}
export async function cancelStudentOptionalFee(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(z.object({ id: z.string().uuid() }), formData); if (parsed.error) return parsed.error;
  const context = await financeContext();
  const { error } = await context.supabase.from("student_optional_fees").update({ status: "cancelled" }).eq("school_id", context.schoolId).eq("id", parsed.data.id);
  if (error) return fail(error.message);
  await audit("finance.student_optional_fee_cancelled", "student_optional_fees", parsed.data.id);
  refreshFinance();
  return ok("Student add-on cancelled.");
}
export async function createStudentFeeAdjustment(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(studentFeeAdjustmentSchema, formData); if (parsed.error) return parsed.error;
  const context = await financeContext();
  const { data, error } = await context.supabase.from("student_fee_adjustments").insert({ ...parsed.data, id: undefined, school_id: context.schoolId, approved_by_user_profile_id: context.profileId }).select("id").single();
  if (error) return fail(error.message); await audit("finance.adjustment_created", "student_fee_adjustments", data.id, { student_id: parsed.data.student_id, amount: parsed.data.amount }); refreshFinance(); return ok("Student adjustment created.");
}

export async function updateStudentFeeAdjustment(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(studentFeeAdjustmentSchema.required({ id: true }), formData); if (parsed.error) return parsed.error;
  const context = await financeContext(); const { id, ...values } = parsed.data; if (!id) return fail("Missing record id.");
  const { error } = await context.supabase.from("student_fee_adjustments").update(values).eq("school_id", context.schoolId).eq("id", id);
  if (error) return fail(error.message); await audit("finance.adjustment_updated", "student_fee_adjustments", id); refreshFinance(); return ok("Student adjustment updated.");
}

export async function cancelStudentFeeAdjustment(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(z.object({ id: z.string().uuid() }), formData); if (parsed.error) return parsed.error;
  const context = await financeContext(); const { error } = await context.supabase.from("student_fee_adjustments").update({ status: "cancelled" }).eq("school_id", context.schoolId).eq("id", parsed.data.id);
  if (error) return fail(error.message); await audit("finance.adjustment_cancelled", "student_fee_adjustments", parsed.data.id); refreshFinance(); return ok("Student adjustment cancelled.");
}

async function buildInvoiceForStudent(context: Awaited<ReturnType<typeof getSchoolContext>>, input: z.infer<typeof invoiceGenerationSchema>) {
  const { data: student } = await context.supabase.from("students").select("id, first_name, last_name, current_class_id, current_arm_id").eq("school_id", context.schoolId).eq("id", input.student_id).single();
  if (!student?.current_class_id) throw new Error("Student must be assigned to a class before invoicing.");

  const { data: structures } = await context.supabase.from("class_fee_structures").select("id, fee_item_id, amount, term_id, arm_id, is_required, fee_items(name)").eq("school_id", context.schoolId).eq("academic_session_id", input.academic_session_id).eq("class_id", student.current_class_id);
  const typedStructures = (structures ?? []) as Array<{ id: string; fee_item_id: string; amount: number | string; term_id: string | null; arm_id: string | null; is_required: boolean; fee_items: { name: string } | { name: string }[] | null }>;
  const matchingStructures = typedStructures.filter((item) => !input.term_id || item.term_id === input.term_id || item.term_id === null).filter((item) => !item.arm_id || item.arm_id === student.current_arm_id);
  const requiredFees = matchingStructures.filter((item) => item.is_required);
  if (requiredFees.length === 0) throw new Error("No compulsory fees have been set for this student's class and term.");

  const optionalQuery = context.supabase.from("student_optional_fees").select("id, amount, term_id, status, class_fee_structure_id, class_fee_structures(fee_item_id, fee_items(name))").eq("school_id", context.schoolId).eq("student_id", input.student_id).eq("academic_session_id", input.academic_session_id).eq("status", "active");
  const { data: optionalRows } = await optionalQuery;
  const typedOptionalRows = (optionalRows ?? []) as Array<{ amount: number | string; term_id: string | null; status: string; class_fee_structure_id: string; class_fee_structures: { fee_item_id: string | null; fee_items: { name: string } | { name: string }[] | null } | { fee_item_id: string | null; fee_items: { name: string } | { name: string }[] | null }[] | null }>;
  const optionalFees = typedOptionalRows.filter((item) => !input.term_id || item.term_id === input.term_id || item.term_id === null);

  const { data: adjustments } = await context.supabase.from("student_fee_adjustments").select("adjustment_type, amount, amount_type, title, term_id").eq("school_id", context.schoolId).eq("student_id", input.student_id).eq("academic_session_id", input.academic_session_id).eq("status", "approved");
  const matchingAdjustments = (adjustments ?? []).filter((adjustment) => !input.term_id || adjustment.term_id === input.term_id || adjustment.term_id === null);
  const school = await schoolCode(context); const invoiceCount = await nextCount(context, "invoices");
  const invoiceLineInputs = [
    ...requiredFees.map((item) => ({ quantity: 1, unitAmount: normalizeAmountInput(item.amount) })),
    ...optionalFees.map((item) => ({ quantity: 1, unitAmount: normalizeAmountInput(item.amount) })),
  ];
  const totals = calculateInvoiceTotals(invoiceLineInputs, matchingAdjustments.map((adjustment) => ({ type: adjustment.adjustment_type as FeeAdjustmentType, amount: normalizeAmountInput(adjustment.amount), amountType: adjustment.amount_type })), 0);
  const { data: invoice, error } = await context.supabase.from("invoices").insert({
    school_id: context.schoolId,
    student_id: input.student_id,
    academic_session_id: input.academic_session_id,
    term_id: input.term_id,
    invoice_number: generateInvoiceNumber(school, invoiceCount),
    title: input.title,
    subtotal_amount: totals.subtotalAmount,
    discount_amount: totals.discountAmount,
    adjustment_amount: totals.adjustmentAmount,
    total_amount: totals.totalAmount,
    paid_amount: 0,
    balance_amount: totals.totalAmount,
    status: "draft",
    due_date: input.due_date,
    notes: input.notes,
    created_by_user_profile_id: context.profileId,
  }).select("id").single();
  if (error || !invoice) throw new Error(error?.message ?? "Could not create invoice.");
  const requiredLines = requiredFees.map((item) => {
    const feeItem = Array.isArray(item.fee_items) ? item.fee_items[0] : item.fee_items;
    const amount = normalizeAmountInput(item.amount);
    return { school_id: context.schoolId, invoice_id: invoice.id, fee_item_id: item.fee_item_id, description: feeItem?.name ?? "Fee item", quantity: 1, unit_amount: amount, line_amount: amount };
  });
  const optionalLines = optionalFees.map((item) => {
    const structure = Array.isArray(item.class_fee_structures) ? item.class_fee_structures[0] : item.class_fee_structures;
    const feeItem = Array.isArray(structure?.fee_items) ? structure?.fee_items[0] : structure?.fee_items;
    const amount = normalizeAmountInput(item.amount);
    return { school_id: context.schoolId, invoice_id: invoice.id, fee_item_id: structure?.fee_item_id ?? null, description: feeItem?.name ? `${feeItem.name} (Student add-on)` : "Student add-on", quantity: 1, unit_amount: amount, line_amount: amount };
  });
  const { error: lineError } = await context.supabase.from("invoice_items").insert([...requiredLines, ...optionalLines]);
  if (lineError) throw new Error(lineError.message);
  return invoice.id as string;
}

export async function generateStudentInvoice(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(invoiceGenerationSchema, formData); if (parsed.error) return parsed.error;
  const context = await financeContext();
  try { const invoiceId = await buildInvoiceForStudent(context, parsed.data); await audit("finance.invoice_generated", "invoices", invoiceId, { student_id: parsed.data.student_id }); refreshFinance(); return ok("Invoice generated."); } catch (error) { return fail(error instanceof Error ? error.message : "Could not generate invoice."); }
}

export async function generateClassInvoices(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(classInvoiceGenerationSchema, formData); if (parsed.error) return parsed.error;
  const context = await financeContext();
  const query = context.supabase.from("students").select("id").eq("school_id", context.schoolId).eq("student_status", "active").eq("current_class_id", parsed.data.class_id);
  if (parsed.data.arm_id) query.eq("current_arm_id", parsed.data.arm_id);
  const { data: students } = await query;
  let created = 0; let skipped = 0; const errors: string[] = [];
  for (const student of students ?? []) {
    const existing = await context.supabase.from("invoices").select("id").eq("school_id", context.schoolId).eq("student_id", student.id).eq("academic_session_id", parsed.data.academic_session_id).eq("term_id", parsed.data.term_id).maybeSingle();
    if (existing.data && !parsed.data.allow_duplicates) { skipped += 1; continue; }
    try { await buildInvoiceForStudent(context, { ...parsed.data, student_id: student.id }); created += 1; } catch (error) { errors.push(error instanceof Error ? error.message : "Invoice failed"); }
  }
  await audit("finance.class_invoices_generated", "invoices", undefined, { class_id: parsed.data.class_id, created, skipped, errors: errors.length }); refreshFinance();
  return ok(`Class invoices complete. Created ${created}, skipped ${skipped}${errors.length ? `, errors ${errors.length}` : ""}.`);
}

export async function updateInvoiceDueDate(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(invoiceStatusSchema, formData); if (parsed.error) return parsed.error;
  const context = await financeContext(); const { error } = await context.supabase.from("invoices").update({ due_date: parsed.data.due_date }).eq("school_id", context.schoolId).eq("id", parsed.data.id);
  if (error) return fail(error.message); await audit("finance.invoice_due_date_updated", "invoices", parsed.data.id); refreshFinance(); return ok("Invoice due date updated.");
}

async function setInvoiceStatus(id: string, status: InvoiceStatus, action: string) {
  const context = await financeContext(); const payload = status === "issued" ? { status, issued_at: new Date().toISOString() } : { status };
  const { error } = await context.supabase.from("invoices").update(payload).eq("school_id", context.schoolId).eq("id", id);
  if (error) return fail(error.message); await audit(action, "invoices", id); refreshFinance(); return ok("Invoice updated.");
}

export async function issueInvoice(_prev: ActionState, formData: FormData) { const parsed = parseForm(z.object({ id: z.string().uuid() }), formData); return parsed.error ?? setInvoiceStatus(parsed.data.id, "issued", "finance.invoice_issued"); }
export async function cancelInvoice(_prev: ActionState, formData: FormData) { const parsed = parseForm(z.object({ id: z.string().uuid() }), formData); return parsed.error ?? setInvoiceStatus(parsed.data.id, "cancelled", "finance.invoice_cancelled"); }
export async function recomputeInvoiceTotals(_prev: ActionState, formData: FormData) { const parsed = parseForm(z.object({ id: z.string().uuid() }), formData); if (parsed.error) return parsed.error; const context = await financeContext(); await recomputeInvoice(context, parsed.data.id); await audit("finance.invoice_recomputed", "invoices", parsed.data.id); refreshFinance(); return ok("Invoice totals recomputed."); }

export async function recordManualPayment(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(manualPaymentSchema, formData); if (parsed.error) return parsed.error;
  if (parsed.data.paid_at && isFutureInSchoolTimezone(parsed.data.paid_at)) return fail("Paid at cannot be in the future.", { paid_at: ["Choose the current time or an earlier time."] });
  if (!parsed.data.invoice_id && !parsed.data.transaction_note) return fail("Enter a reason for an unallocated payment.", { transaction_note: ["A reason is required."] });
  const context = await financeContext();
  if (parsed.data.invoice_id) {
    const { data: invoice } = await context.supabase.from("invoices").select("id, student_id, balance_amount, status").eq("school_id", context.schoolId).eq("id", parsed.data.invoice_id).single();
    if (!invoice || invoice.student_id !== parsed.data.student_id) return fail("The selected invoice does not belong to this student.");
    if (["paid", "cancelled", "void"].includes(invoice.status) || Number(invoice.balance_amount) <= 0) return fail("This invoice cannot accept a payment.");
    if (parsed.data.amount > Number(invoice.balance_amount)) return fail("Payment cannot exceed the invoice outstanding balance.");
  }
  const school = await schoolCode(context); const paymentCount = await nextCount(context, "payments");
  const { data: payment, error } = await context.supabase.from("payments").insert({ ...parsed.data, school_id: context.schoolId, payment_reference: generatePaymentReference(school, paymentCount), payer_phone: normalizePhoneNumber(parsed.data.payer_phone), received_by_user_profile_id: context.profileId }).select("id, invoice_id, amount").single();
  if (error || !payment) return fail(error?.message ?? "Payment could not be recorded.");
  if (payment.invoice_id) {
    await context.supabase.from("payment_allocations").upsert({ school_id: context.schoolId, payment_id: payment.id, invoice_id: payment.invoice_id, amount: payment.amount }, { onConflict: "payment_id,invoice_id" });
    await recomputeInvoice(context, payment.invoice_id);
  }
  await audit("finance.payment_recorded", "payments", payment.id, { amount: payment.amount, invoice_id: payment.invoice_id }); refreshFinance(); return ok("Manual payment recorded.");
}

async function setPaymentStatus(id: string, status: "confirmed" | "rejected" | "reversed", action: string) {
  const context = await financeContext(); const { data: payment, error } = await context.supabase.from("payments").update({ payment_status: status }).eq("school_id", context.schoolId).eq("id", id).select("invoice_id").single();
  if (error) return fail(error.message); if (payment?.invoice_id) await recomputeInvoice(context, payment.invoice_id); await audit(action, "payments", id); refreshFinance(); return ok("Payment updated.");
}

export async function confirmPayment(_prev: ActionState, formData: FormData) { const parsed = parseForm(paymentStatusSchema, formData); return parsed.error ?? setPaymentStatus(parsed.data.id, "confirmed", "finance.payment_confirmed"); }
export async function rejectPayment(_prev: ActionState, formData: FormData) { const parsed = parseForm(paymentStatusSchema, formData); return parsed.error ?? setPaymentStatus(parsed.data.id, "rejected", "finance.payment_rejected"); }
export async function reversePayment(_prev: ActionState, formData: FormData) { const parsed = parseForm(paymentStatusSchema, formData); return parsed.error ?? setPaymentStatus(parsed.data.id, "reversed", "finance.payment_reversed"); }

export async function generateReceiptForPayment(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(receiptNoteSchema, formData); if (parsed.error) return parsed.error;
  const context = await financeContext(); const { data: payment } = await context.supabase.from("payments").select("id, student_id, invoice_id, amount").eq("school_id", context.schoolId).eq("id", parsed.data.payment_id).single();
  if (!payment) return fail("Payment not found.");
  const school = await schoolCode(context); const receiptCount = await nextCount(context, "receipts");
  const { data, error } = await context.supabase.from("receipts").insert({ school_id: context.schoolId, payment_id: payment.id, receipt_number: generateReceiptNumber(school, receiptCount), student_id: payment.student_id, invoice_id: payment.invoice_id, amount: payment.amount, issued_by_user_profile_id: context.profileId, notes: parsed.data.notes }).select("id").single();
  if (error) return fail(error.message); await audit("finance.receipt_generated", "receipts", data.id, { payment_id: payment.id }); refreshFinance(); return ok("Receipt generated.");
}

export async function voidReceipt(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(z.object({ id: z.string().uuid() }), formData); if (parsed.error) return parsed.error;
  const context = await financeContext(); const { error } = await context.supabase.from("receipts").update({ receipt_status: "void" }).eq("school_id", context.schoolId).eq("id", parsed.data.id);
  if (error) return fail(error.message); await audit("finance.receipt_voided", "receipts", parsed.data.id); refreshFinance(); return ok("Receipt voided.");
}

export async function addFinanceAuditNote(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(financeAuditNoteSchema, formData); if (parsed.error) return parsed.error;
  const context = await financeContext(); const { data, error } = await context.supabase.from("finance_audit_notes").insert({ ...parsed.data, school_id: context.schoolId, created_by_user_profile_id: context.profileId }).select("id").single();
  if (error) return fail(error.message); await audit("finance.note_added", "finance_audit_notes", data.id, { note_type: parsed.data.note_type }); refreshFinance(); return ok("Finance note added.");
}










