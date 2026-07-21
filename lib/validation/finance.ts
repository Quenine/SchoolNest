import { z } from "zod";
import { formBool, optionalDate, optionalPhone, optionalText, optionalUuid } from "@/lib/validation/common";
import { normalizeAmountInput } from "@/lib/finance/helpers";

const code = z.string().trim().min(1).max(50).transform((value) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "_"));
const money = z.preprocess((value) => normalizeAmountInput(value as string), z.number().min(0));
const positiveMoney = z.preprocess((value) => normalizeAmountInput(value as string), z.number().positive());

export const feeCategorySchema = z.object({
  id: optionalUuid,
  name: z.string().trim().min(2, "Category name is required"),
  code,
  description: optionalText,
  is_active: z.preprocess(formBool, z.boolean()).default(true),
  sort_order: z.coerce.number().int().min(0).default(0),
});

export const feeItemSchema = z.object({
  id: optionalUuid,
  category_id: optionalUuid,
  name: z.string().trim().min(2, "Fee item name is required"),
  code,
  description: optionalText,
  billing_frequency: z.enum(["termly", "session", "one_time", "monthly", "custom"]),
  applies_to: z.enum(["all_students", "section", "class", "arm", "individual"]),
  is_mandatory: z.preprocess(formBool, z.boolean()).default(true),
  is_active: z.preprocess(formBool, z.boolean()).default(true),
});

export const classFeeStructureSchema = z.object({
  id: optionalUuid,
  academic_session_id: z.string().uuid("Choose a session"),
  term_id: optionalUuid,
  class_id: z.string().uuid("Choose a class"),
  arm_id: optionalUuid,
  fee_item_id: z.string().uuid("Choose a fee item"),
  amount: money,
  is_required: z.preprocess(formBool, z.boolean()).default(true),
});

export const studentFeeAdjustmentSchema = z.object({
  id: optionalUuid,
  student_id: z.string().uuid("Choose a student"),
  academic_session_id: z.string().uuid("Choose a session"),
  term_id: optionalUuid,
  adjustment_type: z.enum(["discount", "scholarship", "waiver", "surcharge", "sibling_discount", "correction"]),
  title: z.string().trim().min(2, "Title is required"),
  description: optionalText,
  amount: money,
  amount_type: z.enum(["fixed", "percentage"]),
  applies_to_fee_item_id: optionalUuid,
  status: z.enum(["pending", "approved", "rejected", "cancelled"]).default("approved"),
}).refine((value) => value.amount_type === "fixed" || value.amount <= 100, { path: ["amount"], message: "Percentage cannot exceed 100" });


export const studentOptionalFeeSchema = z.object({
  student_id: z.string().uuid("Choose a student"),
  academic_session_id: z.string().uuid("Choose a session"),
  term_id: optionalUuid,
  class_fee_structure_id: z.string().uuid("Choose an optional fee"),
  amount: money,
  notes: optionalText,
});
export const invoiceGenerationSchema = z.object({
  student_id: z.string().uuid("Choose a student"),
  academic_session_id: z.string().uuid("Choose a session"),
  term_id: optionalUuid,
  title: z.string().trim().min(2).default("School fees invoice"),
  due_date: optionalDate,
  notes: optionalText,
});

export const classInvoiceGenerationSchema = z.object({
  academic_session_id: z.string().uuid("Choose a session"),
  term_id: optionalUuid,
  class_id: z.string().uuid("Choose a class"),
  arm_id: optionalUuid,
  title: z.string().trim().min(2).default("School fees invoice"),
  due_date: optionalDate,
  allow_duplicates: z.preprocess(formBool, z.boolean()).default(false),
});

export const invoiceStatusSchema = z.object({
  id: z.string().uuid(),
  due_date: optionalDate,
});

export const manualPaymentSchema = z.object({
  student_id: z.string().uuid("Choose a student"),
  invoice_id: optionalUuid,
  amount: positiveMoney,
  payment_method: z.enum(["cash", "bank_transfer", "pos", "cheque", "mobile_money", "online", "other"]),
  payment_status: z.enum(["pending", "confirmed", "rejected", "reversed"]).default("confirmed"),
  paid_at: z.string().optional(),
  payer_name: optionalText,
  payer_phone: optionalPhone,
  bank_name: optionalText,
  transaction_note: optionalText,
  evidence_url: optionalText,
});

export const paymentStatusSchema = z.object({ id: z.string().uuid() });

export const receiptNoteSchema = z.object({
  payment_id: z.string().uuid("Choose a payment"),
  notes: optionalText,
});

export const financeAuditNoteSchema = z.object({
  student_id: optionalUuid,
  invoice_id: optionalUuid,
  payment_id: optionalUuid,
  note: z.string().trim().min(3, "Enter a useful note"),
  note_type: z.enum(["general", "correction", "follow_up", "dispute", "approval"]),
});

