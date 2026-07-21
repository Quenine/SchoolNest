import { requireRole } from "@/lib/auth/require-role";

export default async function ExamOfficerLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["exam_officer", "school_owner", "principal", "head_teacher", "school_admin"]);
  return children;
}
