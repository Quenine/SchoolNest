import { requireRole } from "@/lib/auth/require-role";

export default async function BursarLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["bursar", "school_owner", "principal", "head_teacher", "school_admin"]);
  return children;
}
