import { requireRole } from "@/lib/auth/require-role";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["platform_super_admin"]);
  return children;
}
