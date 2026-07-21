import { Bell, CircleUserRound } from "lucide-react";
import { logout } from "@/app/dashboard/actions";
import { Sidebar } from "@/components/dashboard/sidebar";
import { getUserRoles } from "@/lib/tenant/get-school-context";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const context = await getUserRoles();
  const { data: profile } = await context.supabase.from("users_profile").select("school_id, schools(name)").eq("id", context.userId).maybeSingle();
  const school = Array.isArray(profile?.schools) ? profile?.schools[0] : profile?.schools;
  const workspaceName = school?.name ?? (context.roles.includes("platform_super_admin") ? "Platform workspace" : "SchoolNest workspace");

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="flex h-20 items-center justify-between border-b bg-white/90 px-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-sm font-semibold">{workspaceName}</p>
            <p className="text-xs text-muted-foreground">{context.roles.join(", ") || "Authenticated user"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button aria-label="Notifications" className="grid size-11 place-items-center rounded-xl hover:bg-muted"><Bell className="size-5" /></button>
            <form action={logout}>
              <button aria-label="Sign out" className="grid size-11 place-items-center rounded-xl bg-secondary text-primary"><CircleUserRound className="size-6" /></button>
            </form>
          </div>
        </header>
        <main className="p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
