"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAuditEvent } from "@/lib/audit";
import { assertCanManageSetup, ensureBelowLimit, getSchoolContext, getSchoolCounts } from "@/lib/school-context";
import { normalizeCode, normalizePhoneNumber } from "@/lib/school-records";
import { isPlanLimitEnforcementEnabled } from "@/lib/plan-limits";
import { normalizeFormData } from "@/lib/validation/common";
import { academicSessionSchema, academicTermSchema, classArmSchema, classSubjectSchema, schoolClassSchema, schoolProfileSettingsSchema, schoolSectionSchema, subjectSchema } from "@/lib/validation/school-setup";
import { staffProfileSchema } from "@/lib/validation/staff";
import { guardianSchema, studentGuardianSchema } from "@/lib/validation/guardian";
import { changeStudentClassArmSchema, studentSchema } from "@/lib/validation/student";

export interface ActionState {
  ok: boolean;
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  fieldErrors?: Record<string, string[]>;
  error?: string;
}

const ok = (message: string): ActionState => ({ ok: true, success: true, message });
const fail = (message: string, errors?: Record<string, string[]>): ActionState => ({ ok: false, success: false, message, errors, fieldErrors: errors, error: message });

function compactErrors(errors: Record<string, string[] | undefined>) {
  return Object.fromEntries(Object.entries(errors).filter((entry): entry is [string, string[]] => Array.isArray(entry[1])));
}

function parseForm<T>(schema: z.ZodType<T>, formData: FormData) {
  const parsed = schema.safeParse(normalizeFormData(formData));
  if (!parsed.success) {
    return { data: null, error: fail("Please check the highlighted fields.", compactErrors(parsed.error.flatten().fieldErrors)) };
  }
  return { data: parsed.data, error: null };
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
  }, {
    schoolId: context.schoolId,
    actorUserId: context.userId,
    action,
    entityType,
    entityId,
    metadata,
  });
}

async function mutableContext() {
  const context = await getSchoolContext();
  assertCanManageSetup(context);
  return context;
}

function refreshSetup() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/school-admin");
  revalidatePath("/dashboard/school-admin/setup");
  revalidatePath("/dashboard/school-admin/setup/profile");
  revalidatePath("/dashboard/school-admin/setup/sessions");
  revalidatePath("/dashboard/school-admin/setup/classes");
  revalidatePath("/dashboard/school-admin/setup/subjects");
}


async function markOnlyCurrentSession(context: Awaited<ReturnType<typeof getSchoolContext>>, sessionId: string) {
  await context.supabase.from("academic_sessions").update({ is_current: false }).eq("school_id", context.schoolId).neq("id", sessionId);
}

async function validateTermWithinSession(context: Awaited<ReturnType<typeof getSchoolContext>>, sessionId: string, startsOn: string, endsOn: string) {
  const { data } = await context.supabase.from("academic_sessions").select("starts_on, ends_on").eq("school_id", context.schoolId).eq("id", sessionId).single();
  if (!data) return "Academic session was not found.";
  if (startsOn < data.starts_on || endsOn > data.ends_on) return "Term dates must fall within the selected academic session.";
  return null;
}

async function markOnlyCurrentTerm(context: Awaited<ReturnType<typeof getSchoolContext>>, termId: string) {
  await context.supabase.from("terms").update({ is_current: false }).eq("school_id", context.schoolId).neq("id", termId);
}

export async function createAcademicSession(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(academicSessionSchema, formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { data, error } = await context.supabase.from("academic_sessions").insert({ ...parsed.data, id: undefined, school_id: context.schoolId }).select("id").single();
  if (error || !data) return fail(error?.message ?? "Academic session could not be created.");
  if (parsed.data.is_current) await markOnlyCurrentSession(context, data.id);
  await audit("academic_session.created", "academic_sessions", data.id, { name: parsed.data.name });
  refreshSetup();
  return ok("Academic session created.");
}

export async function updateAcademicSession(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(academicSessionSchema.required({ id: true }), formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { id, ...values } = parsed.data;
  if (!id) return fail("Missing record id.");
  const { error } = await context.supabase.from("academic_sessions").update(values).eq("id", id).eq("school_id", context.schoolId);
  if (error) return fail(error.message);
  if (values.is_current) await markOnlyCurrentSession(context, id);
  await audit("academic_session.updated", "academic_sessions", id, { name: values.name });
  refreshSetup();
  return ok("Academic session updated.");
}

export async function createAcademicTerm(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(academicTermSchema, formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { data, error } = await context.supabase.from("terms").insert({ ...parsed.data, id: undefined, school_id: context.schoolId }).select("id").single();
  if (error || !data) return fail(error?.message ?? "Term could not be created.");
  if (parsed.data.is_current) await markOnlyCurrentTerm(context, data.id);
  await audit("term.created", "terms", data.id, { name: parsed.data.name, academic_session_id: parsed.data.academic_session_id });
  refreshSetup();
  return ok("Term created.");
}

export async function updateAcademicTerm(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(academicTermSchema.required({ id: true }), formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { id, ...values } = parsed.data;
  if (!id) return fail("Missing record id.");
  const dateError = await validateTermWithinSession(context, values.academic_session_id, values.starts_on, values.ends_on);
  if (dateError) return fail(dateError, { starts_on: [dateError], ends_on: [dateError] });
  const { error } = await context.supabase.from("terms").update(values).eq("id", id).eq("school_id", context.schoolId);
  if (error) return fail(error.message);
  if (values.is_current) await markOnlyCurrentTerm(context, id);
  await audit("term.updated", "terms", id, { name: values.name, academic_session_id: values.academic_session_id });
  refreshSetup();
  return ok("Term updated.");
}

export async function updateSchoolProfileSettings(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(schoolProfileSettingsSchema, formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { error } = await context.supabase.from("school_profile_settings").upsert({
    ...parsed.data,
    school_id: context.schoolId,
    contact_phone: normalizePhoneNumber(parsed.data.contact_phone),
  }, { onConflict: "school_id" });
  if (error) return fail(error.message);
  await audit("school_profile.updated", "school_profile_settings", context.schoolId, { display_name: parsed.data.display_name });
  refreshSetup();
  return ok("School profile updated.");
}

export async function createSchoolSection(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(schoolSectionSchema, formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { data, error } = await context.supabase.from("school_sections").insert({ ...parsed.data, id: undefined, school_id: context.schoolId, code: normalizeCode(parsed.data.code) }).select("id").single();
  if (error) return fail(error.message);
  await audit("section.created", "school_sections", data.id, { name: parsed.data.name });
  refreshSetup();
  return ok("Section created.");
}

export async function updateSchoolSection(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(schoolSectionSchema.required({ id: true }), formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { id, ...values } = parsed.data;
  if (!id) return fail("Missing record id.");
  const { error } = await context.supabase.from("school_sections").update({ ...values, code: normalizeCode(values.code) }).eq("id", id).eq("school_id", context.schoolId);
  if (error) return fail(error.message);
  await audit("section.updated", "school_sections", id, { name: values.name });
  refreshSetup();
  return ok("Section updated.");
}

export async function createClass(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(schoolClassSchema, formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const counts = await getSchoolCounts(context.supabase, context.schoolId);
  try { ensureBelowLimit(counts.classes, context.limits.maxClasses, "Class"); } catch (error) { return fail(error instanceof Error ? error.message : "Class limit reached."); }
  const { data, error } = await context.supabase.from("classes").insert({ ...parsed.data, id: undefined, school_id: context.schoolId, code: normalizeCode(parsed.data.code) }).select("id").single();
  if (error) return fail(error.message);
  await audit("class.created", "classes", data.id, { name: parsed.data.name });
  refreshSetup();
  return ok("Class created.");
}

export async function updateClass(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(schoolClassSchema.required({ id: true }), formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { id, ...values } = parsed.data;
  if (!id) return fail("Missing record id.");
  const { error } = await context.supabase.from("classes").update({ ...values, code: normalizeCode(values.code) }).eq("id", id).eq("school_id", context.schoolId);
  if (error) return fail(error.message);
  await audit("class.updated", "classes", id, { name: values.name });
  refreshSetup();
  return ok("Class updated.");
}

export async function createClassArm(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(classArmSchema, formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { data, error } = await context.supabase.from("class_arms").insert({ ...parsed.data, id: undefined, school_id: context.schoolId, code: normalizeCode(parsed.data.code) }).select("id").single();
  if (error) return fail(error.message);
  await audit("arm.created", "class_arms", data.id, { name: parsed.data.name, class_id: parsed.data.class_id });
  refreshSetup();
  return ok("Class arm created.");
}

export async function updateClassArm(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(classArmSchema.required({ id: true }), formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { id, ...values } = parsed.data;
  if (!id) return fail("Missing record id.");
  const { error } = await context.supabase.from("class_arms").update({ ...values, code: normalizeCode(values.code) }).eq("id", id).eq("school_id", context.schoolId);
  if (error) return fail(error.message);
  await audit("arm.updated", "class_arms", id, { name: values.name });
  refreshSetup();
  return ok("Class arm updated.");
}

export async function createSubject(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(subjectSchema, formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { data, error } = await context.supabase.from("subjects").insert({ ...parsed.data, id: undefined, school_id: context.schoolId, code: normalizeCode(parsed.data.code) }).select("id").single();
  if (error) return fail(error.message);
  await audit("subject.created", "subjects", data.id, { name: parsed.data.name });
  refreshSetup();
  return ok("Subject created.");
}

export async function updateSubject(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(subjectSchema.required({ id: true }), formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { id, ...values } = parsed.data;
  if (!id) return fail("Missing record id.");
  const { error } = await context.supabase.from("subjects").update({ ...values, code: normalizeCode(values.code) }).eq("id", id).eq("school_id", context.schoolId);
  if (error) return fail(error.message);
  await audit("subject.updated", "subjects", id, { name: values.name });
  refreshSetup();
  return ok("Subject updated.");
}

export async function assignSubjectToClass(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(classSubjectSchema, formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { data, error } = await context.supabase.from("class_subjects").upsert({ ...parsed.data, school_id: context.schoolId }, { onConflict: "school_id,class_id,subject_id" }).select("id").single();
  if (error) return fail(error.message);
  await audit("class_subject.assigned", "class_subjects", data.id, { class_id: parsed.data.class_id, subject_id: parsed.data.subject_id });
  refreshSetup();
  return ok("Subject assigned to class.");
}

export async function removeSubjectFromClass(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(z.object({ class_id: z.string().uuid(), subject_id: z.string().uuid() }), formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { error } = await context.supabase.from("class_subjects").delete().eq("school_id", context.schoolId).eq("class_id", parsed.data.class_id).eq("subject_id", parsed.data.subject_id);
  if (error) return fail(error.message);
  await audit("class_subject.removed", "class_subjects", undefined, parsed.data);
  refreshSetup();
  return ok("Subject removed from class.");
}

export async function createDefaultNigerianStructure(_prev: ActionState, _formData: FormData) {
  void _prev;
  void _formData;
  const context = await mutableContext();
  const counts = await getSchoolCounts(context.supabase, context.schoolId);
  const remainingClassSlots = !isPlanLimitEnforcementEnabled() || context.limits.maxClasses === null ? Number.POSITIVE_INFINITY : Math.max(context.limits.maxClasses - counts.classes, 0);
  if (remainingClassSlots === 0) return fail("Class limit reached for your current plan. Upgrade to add the full default structure.");

  const sections = [
    { name: "Nursery", code: "NURSERY", sort_order: 10 },
    { name: "Primary", code: "PRIMARY", sort_order: 20 },
    { name: "Junior Secondary", code: "JUNIOR_SECONDARY", sort_order: 30 },
    { name: "Senior Secondary", code: "SENIOR_SECONDARY", sort_order: 40 },
  ];
  await context.supabase.from("school_sections").upsert(sections.map((section) => ({ ...section, school_id: context.schoolId })), { onConflict: "school_id,code" });
  const { data: savedSections } = await context.supabase.from("school_sections").select("id, code").eq("school_id", context.schoolId);
  const sectionByCode = new Map((savedSections ?? []).map((section) => [section.code, section.id]));
  const defaults = [
    ["Creche", "CRECHE", "NURSERY"], ["Playgroup", "PLAYGROUP", "NURSERY"], ["Nursery 1", "NURSERY_1", "NURSERY"],
    ["Nursery 2", "NURSERY_2", "NURSERY"], ["Nursery 3", "NURSERY_3", "NURSERY"], ["Primary 1", "PRIMARY_1", "PRIMARY"],
    ["Primary 2", "PRIMARY_2", "PRIMARY"], ["Primary 3", "PRIMARY_3", "PRIMARY"], ["Primary 4", "PRIMARY_4", "PRIMARY"],
    ["Primary 5", "PRIMARY_5", "PRIMARY"], ["Primary 6", "PRIMARY_6", "PRIMARY"], ["JSS 1", "JSS_1", "JUNIOR_SECONDARY"],
    ["JSS 2", "JSS_2", "JUNIOR_SECONDARY"], ["JSS 3", "JSS_3", "JUNIOR_SECONDARY"], ["SS 1", "SS_1", "SENIOR_SECONDARY"],
    ["SS 2", "SS_2", "SENIOR_SECONDARY"], ["SS 3", "SS_3", "SENIOR_SECONDARY"],
  ] as const;
  const limitedDefaults = defaults.slice(0, remainingClassSlots);
  await context.supabase.from("classes").upsert(limitedDefaults.map(([name, code, sectionCode], index) => ({
    school_id: context.schoolId,
    name,
    code,
    section_id: sectionByCode.get(sectionCode),
    level_order: index + 1,
    is_graduating_class: code === "NURSERY_3" || code === "PRIMARY_6" || code === "JSS_3" || code === "SS_3",
  })), { onConflict: "school_id,code" });
  await audit("default_structure.created", "classes", undefined, { created_limit: limitedDefaults.length });
  refreshSetup();
  return ok(limitedDefaults.length < defaults.length ? "Default structure started. Your plan limit allowed only the first classes." : "Default Nigerian school structure created.");
}

export async function createStaffProfile(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(staffProfileSchema, formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const counts = await getSchoolCounts(context.supabase, context.schoolId);
  try { ensureBelowLimit(counts.staff, context.limits.maxStaff, "Staff"); } catch (error) { return fail(error instanceof Error ? error.message : "Staff limit reached."); }
  const { data, error } = await context.supabase.from("staff_profiles").insert({ ...parsed.data, id: undefined, school_id: context.schoolId, phone: normalizePhoneNumber(parsed.data.phone), emergency_contact_phone: normalizePhoneNumber(parsed.data.emergency_contact_phone) }).select("id").single();
  if (error) return fail(error.message);
  await audit("staff.created", "staff_profiles", data.id, { staff_number: parsed.data.staff_number });
  refreshSetup();
  revalidatePath("/dashboard/school-admin/staff");
  return ok("Staff profile created.");
}

export async function updateStaffProfile(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(staffProfileSchema.required({ id: true }), formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { id, ...values } = parsed.data;
  if (!id) return fail("Missing record id.");
  const { error } = await context.supabase.from("staff_profiles").update({ ...values, phone: normalizePhoneNumber(values.phone), emergency_contact_phone: normalizePhoneNumber(values.emergency_contact_phone) }).eq("id", id).eq("school_id", context.schoolId);
  if (error) return fail(error.message);
  await audit("staff.updated", "staff_profiles", id, { staff_number: values.staff_number });
  revalidatePath("/dashboard/school-admin/staff");
  return ok("Staff profile updated.");
}

export async function deactivateStaffProfile(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(z.object({ id: z.string().uuid() }), formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { error } = await context.supabase.from("staff_profiles").update({ employment_status: "inactive" }).eq("id", parsed.data.id).eq("school_id", context.schoolId);
  if (error) return fail(error.message);
  await audit("staff.deactivated", "staff_profiles", parsed.data.id);
  revalidatePath("/dashboard/school-admin/staff");
  return ok("Staff profile deactivated.");
}

export async function createParentGuardian(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(guardianSchema, formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { data, error } = await context.supabase.from("parent_guardians").insert({ ...parsed.data, id: undefined, school_id: context.schoolId, phone: normalizePhoneNumber(parsed.data.phone), alternate_phone: normalizePhoneNumber(parsed.data.alternate_phone) }).select("id").single();
  if (error) return fail(error.message);
  await audit("guardian.created", "parent_guardians", data.id, { phone: normalizePhoneNumber(parsed.data.phone) });
  revalidatePath("/dashboard/school-admin/parents");
  return ok("Parent or guardian created.");
}

export async function updateParentGuardian(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(guardianSchema.required({ id: true }), formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { id, ...values } = parsed.data;
  if (!id) return fail("Missing record id.");
  const { error } = await context.supabase.from("parent_guardians").update({ ...values, phone: normalizePhoneNumber(values.phone), alternate_phone: normalizePhoneNumber(values.alternate_phone) }).eq("id", id).eq("school_id", context.schoolId);
  if (error) return fail(error.message);
  await audit("guardian.updated", "parent_guardians", id);
  revalidatePath("/dashboard/school-admin/parents");
  return ok("Parent or guardian updated.");
}

export async function createStudent(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(studentSchema, formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const counts = await getSchoolCounts(context.supabase, context.schoolId);
  try { ensureBelowLimit(counts.students, context.limits.maxStudents, "Student"); } catch (error) { return fail(error instanceof Error ? error.message : "Student limit reached."); }
  const { data, error } = await context.supabase.from("students").insert({ ...parsed.data, id: undefined, school_id: context.schoolId }).select("id").single();
  if (error) return fail(error.message);
  await audit("student.created", "students", data.id, { admission_number: parsed.data.admission_number });
  refreshSetup();
  revalidatePath("/dashboard/school-admin/students");
  return ok("Student record created.");
}

export async function updateStudent(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(studentSchema.required({ id: true }), formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { id, ...values } = parsed.data;
  if (!id) return fail("Missing record id.");
  const { error } = await context.supabase.from("students").update(values).eq("id", id).eq("school_id", context.schoolId);
  if (error) return fail(error.message);
  await audit("student.updated", "students", id, { admission_number: values.admission_number });
  revalidatePath("/dashboard/school-admin/students");
  return ok("Student record updated.");
}

export async function changeStudentClassArm(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(changeStudentClassArmSchema, formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { error } = await context.supabase.from("students").update({ current_class_id: parsed.data.current_class_id, current_arm_id: parsed.data.current_arm_id }).eq("id", parsed.data.student_id).eq("school_id", context.schoolId);
  if (error) return fail(error.message);
  await audit("student.class_changed", "students", parsed.data.student_id, { class_id: parsed.data.current_class_id, arm_id: parsed.data.current_arm_id });
  revalidatePath("/dashboard/school-admin/students");
  return ok("Student class updated.");
}

export async function linkStudentGuardian(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(studentGuardianSchema, formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { data, error } = await context.supabase.from("student_guardians").upsert({ ...parsed.data, school_id: context.schoolId }, { onConflict: "school_id,student_id,guardian_id" }).select("id").single();
  if (error) return fail(error.message);
  await audit("student_guardian.linked", "student_guardians", data.id, { student_id: parsed.data.student_id, guardian_id: parsed.data.guardian_id });
  revalidatePath("/dashboard/school-admin/students");
  revalidatePath("/dashboard/school-admin/parents");
  return ok("Guardian linked to student.");
}

export async function unlinkStudentGuardian(_prev: ActionState, formData: FormData) {
  const parsed = parseForm(z.object({ student_id: z.string().uuid(), guardian_id: z.string().uuid() }), formData);
  if (parsed.error) return parsed.error;
  const context = await mutableContext();
  const { error } = await context.supabase.from("student_guardians").delete().eq("school_id", context.schoolId).eq("student_id", parsed.data.student_id).eq("guardian_id", parsed.data.guardian_id);
  if (error) return fail(error.message);
  await audit("student_guardian.unlinked", "student_guardians", undefined, parsed.data);
  revalidatePath("/dashboard/school-admin/students");
  revalidatePath("/dashboard/school-admin/parents");
  return ok("Guardian unlinked from student.");
}










