import { getTenantSchoolContext } from "@/lib/tenant/get-school-context";
import { assertWithinPlanLimit } from "@/lib/plan-limits";

export type SchoolContext = Awaited<ReturnType<typeof getTenantSchoolContext>>;

const setupRoles = ["school_owner", "principal", "head_teacher", "school_admin"];
const financeRoles = ["school_owner", "principal", "head_teacher", "school_admin", "bursar"];

export async function getSchoolContext(): Promise<SchoolContext> {
  return getTenantSchoolContext();
}

export function assertCanManageSetup(context: Pick<SchoolContext, "roles">) {
  if (!context.roles.some((role) => setupRoles.includes(role))) {
    throw new Error("You do not have permission to manage school setup records.");
  }
}

export function assertCanManageFinance(context: Pick<SchoolContext, "roles">) {
  if (!context.roles.some((role) => financeRoles.includes(role))) {
    throw new Error("You do not have permission to manage finance records.");
  }
}

export async function getSchoolCounts(supabase: SchoolContext["supabase"], schoolId: string) {
  const [students, staff, classes, sections, arms, subjects, guardians] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("staff_profiles").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("school_sections").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("class_arms").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("subjects").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("parent_guardians").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
  ]);

  return {
    students: students.count ?? 0,
    staff: staff.count ?? 0,
    classes: classes.count ?? 0,
    sections: sections.count ?? 0,
    arms: arms.count ?? 0,
    subjects: subjects.count ?? 0,
    guardians: guardians.count ?? 0,
  };
}

export async function getFinanceCounts(supabase: SchoolContext["supabase"], schoolId: string) {
  const [categories, feeItems, structures, invoices, payments, receipts] = await Promise.all([
    supabase.from("fee_categories").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("fee_items").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("class_fee_structures").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("receipts").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
  ]);

  return {
    categories: categories.count ?? 0,
    feeItems: feeItems.count ?? 0,
    structures: structures.count ?? 0,
    invoices: invoices.count ?? 0,
    payments: payments.count ?? 0,
    receipts: receipts.count ?? 0,
  };
}

export function ensureBelowLimit(current: number, limit: number | null, label: string) {
  assertWithinPlanLimit(current, limit, label);
}




