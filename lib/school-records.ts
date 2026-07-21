import type { ParentGuardian, StaffProfile, Student } from "@/lib/types";

export function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function normalizePhoneNumber(value?: string | null) {
  if (!value) return null;
  const compact = value.replace(/[\s-]/g, "");
  if (compact.startsWith("+234")) return compact;
  if (compact.startsWith("0")) return `+234${compact.slice(1)}`;
  if (compact.startsWith("234")) return `+${compact}`;
  return compact;
}

export function formatStudentName(student: Pick<Student, "first_name" | "last_name" | "other_names" | "preferred_name">) {
  return [student.last_name, student.first_name, student.other_names].filter(Boolean).join(" ") || student.preferred_name || "Unnamed student";
}

export function formatStaffName(staff: Pick<StaffProfile, "first_name" | "last_name" | "other_names">) {
  return [staff.last_name, staff.first_name, staff.other_names].filter(Boolean).join(" ") || "Unnamed staff";
}

export function formatGuardianName(guardian: Pick<ParentGuardian, "first_name" | "last_name" | "other_names">) {
  return [guardian.last_name, guardian.first_name, guardian.other_names].filter(Boolean).join(" ") || "Unnamed guardian";
}

export function generateSuggestedAdmissionNumber(nextCount: number, year = new Date().getFullYear()) {
  return `SN/${year}/${String(nextCount + 1).padStart(4, "0")}`;
}

export function generateSuggestedStaffNumber(nextCount: number, year = new Date().getFullYear()) {
  return `STF/${year}/${String(nextCount + 1).padStart(3, "0")}`;
}
