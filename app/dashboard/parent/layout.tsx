import { requireRole } from "@/lib/auth/require-role";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["parent"]);
  return children;
}
