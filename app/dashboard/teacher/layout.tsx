import { requireRole } from "@/lib/auth/require-role";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["teacher", "class_teacher", "school_owner", "principal", "head_teacher", "school_admin"]);
  return children;
}
