import { requireRole } from "@/lib/auth/require-role";

export default async function SchoolAdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["school_owner", "principal", "head_teacher", "school_admin"]);
  return children;
}
