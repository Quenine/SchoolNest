import { redirect } from "next/navigation";
import { getUserRoles } from "@/lib/tenant/get-school-context";

export default async function DashboardPage() {
  const context = await getUserRoles();
  redirect(context.redirectTo);
}
