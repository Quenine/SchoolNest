import { redirect } from "next/navigation";
import { getUserRoles } from "@/lib/tenant/get-school-context";

export async function requireRole(allowedRoles: string[]) {
  const context = await getUserRoles();
  if (!context.roles.some((role) => allowedRoles.includes(role))) {
    redirect("/dashboard");
  }
  return context;
}
