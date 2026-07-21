import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getRoleRedirect } from "@/lib/auth/roles";
import type { PlanCode, SubscriptionLimits } from "@/lib/types";

type JoinOne<T> = T | T[] | null;
type RoleJoin = { roles: JoinOne<{ code: string }> };
type ProfileJoin = { id: string; school_id: string | null; schools: JoinOne<{ name: string }> };
type PlanJoin = { subscription_plans: JoinOne<{ code: string; name: string; max_students: number | null; max_staff: number | null; max_classes: number | null; watermarked_report_cards: boolean; enabled_feature_keys?: string[] }> };

function firstJoin<T>(value: JoinOne<T> | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function getUserRoles() {
  const { supabase, user } = await requireUser();
  const { data: rows } = await supabase.from("user_roles").select("school_id, roles(code)").eq("user_id", user.id);
  const roles = ((rows ?? []) as Array<RoleJoin & { school_id: string | null }>).map((row) => firstJoin(row.roles)?.code).filter((role): role is string => Boolean(role));
  return { supabase, user, userId: user.id, roles, redirectTo: getRoleRedirect(roles) };
}

export interface TenantSchoolContext {
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"];
  userId: string;
  profileId: string;
  schoolId: string;
  schoolName: string;
  roles: string[];
  planCode: PlanCode;
  planName: string;
  planFeatures: string[];
  limits: SubscriptionLimits;
}

export async function getTenantSchoolContext(): Promise<TenantSchoolContext> {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase.from("users_profile").select("id, school_id, schools(name)").eq("id", user.id).single();
  if (error || !profile) redirect("/dashboard/setup-required");
  const typedProfile = profile as ProfileJoin;
  if (!typedProfile.school_id) redirect("/dashboard/super-admin");
  const school = firstJoin(typedProfile.schools);
  const { roles } = await getUserRoles();
  const { data: subscription } = await supabase
    .from("school_subscriptions")
    .select("subscription_plans(code, name, max_students, max_staff, max_classes, watermarked_report_cards, enabled_feature_keys)")
    .eq("school_id", typedProfile.school_id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const plan = firstJoin((subscription as PlanJoin | null)?.subscription_plans);
  return {
    supabase,
    userId: user.id,
    profileId: typedProfile.id,
    schoolId: typedProfile.school_id,
    schoolName: school?.name ?? "School workspace",
    roles,
    planCode: (plan?.code ?? "free") as PlanCode,
    planName: plan?.name ?? "Free",
    planFeatures: plan?.enabled_feature_keys ?? ["student_management", "staff_management", "parent_management", "fees_manual"],
    limits: {
      maxStudents: plan?.max_students ?? 50,
      maxStaff: plan?.max_staff ?? 5,
      maxClasses: plan?.max_classes ?? 3,
      watermarkedReportCards: plan?.watermarked_report_cards ?? true,
    },
  };
}
