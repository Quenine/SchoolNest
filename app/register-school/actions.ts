"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizePhoneNumber } from "@/lib/school-records";

export interface RegisterSchoolState {
  ok: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

const registerSchema = z.object({
  schoolName: z.string().trim().min(3, "Enter the school name"),
  schoolSlug: z.string().trim().optional(),
  schoolType: z.enum(["nursery", "primary", "secondary", "combined"]),
  contactEmail: z.email("Enter a valid school email"),
  contactPhone: z.string().trim().min(10, "Enter a valid phone number"),
  state: z.string().trim().min(2, "Enter the state"),
  cityLga: z.string().trim().min(2, "Enter the city or LGA"),
  address: z.string().trim().min(5, "Enter the school address"),
  ownerName: z.string().trim().min(3, "Enter the owner full name"),
  ownerEmail: z.email("Enter a valid owner email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm your password"),
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] ?? "School", lastName: parts.slice(1).join(" ") || "Owner" };
}

function compactErrors(errors: Record<string, string[] | undefined>) {
  return Object.fromEntries(Object.entries(errors).filter((entry): entry is [string, string[]] => Array.isArray(entry[1])));
}

export async function registerSchool(_prev: RegisterSchoolState, formData: FormData): Promise<RegisterSchoolState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: compactErrors(parsed.error.flatten().fieldErrors) };

  const values = parsed.data;
  const admin = createAdminClient();
  const slug = slugify(values.schoolSlug || values.schoolName);
  const { firstName, lastName } = splitName(values.ownerName);
  let createdUserId: string | null = null;
  let createdSchoolId: string | null = null;

  try {
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: values.ownerEmail,
      password: values.password,
      email_confirm: false,
      user_metadata: { full_name: values.ownerName, school_name: values.schoolName },
    });
    if (authError || !authUser.user) throw new Error(authError?.message ?? "Could not create auth user.");
    createdUserId = authUser.user.id;

    const { data: school, error: schoolError } = await admin.from("schools").insert({
      name: values.schoolName,
      slug,
      email: values.contactEmail,
      phone: normalizePhoneNumber(values.contactPhone),
      address: values.address,
      state: values.state,
      city_lga: values.cityLga,
      school_type: values.schoolType,
    }).select("id").single();
    if (schoolError || !school) throw new Error(schoolError?.message ?? "Could not create school.");
    createdSchoolId = school.id;

    const { error: profileError } = await admin.from("users_profile").insert({
      id: createdUserId,
      school_id: createdSchoolId,
      first_name: firstName,
      last_name: lastName,
      phone: normalizePhoneNumber(values.contactPhone),
    });
    if (profileError) throw new Error(profileError.message);

    const [{ data: ownerRole }, { data: freePlan }] = await Promise.all([
      admin.from("roles").select("id").eq("code", "school_owner").single(),
      admin.from("subscription_plans").select("id").eq("code", "free").single(),
    ]);
    if (!ownerRole?.id || !freePlan?.id) throw new Error("Seed roles and subscription plans before registering schools.");

    const { error: roleError } = await admin.from("user_roles").insert({ school_id: createdSchoolId, user_id: createdUserId, role_id: ownerRole.id });
    if (roleError) throw new Error(roleError.message);

    const { error: subscriptionError } = await admin.from("school_subscriptions").insert({ school_id: createdSchoolId, plan_id: freePlan.id, status: "active", billing_cycle: "none" });
    if (subscriptionError) throw new Error(subscriptionError.message);

    await admin.from("school_profile_settings").upsert({
      school_id: createdSchoolId,
      display_name: values.schoolName,
      address: values.address,
      city: values.cityLga,
      state: values.state,
      contact_email: values.contactEmail,
      contact_phone: normalizePhoneNumber(values.contactPhone),
    }, { onConflict: "school_id" });

    await admin.from("audit_logs").insert({ school_id: createdSchoolId, actor_user_id: createdUserId, action: "school.registered", entity_type: "schools", entity_id: createdSchoolId, metadata: { slug, school_type: values.schoolType } });
  } catch (error) {
    if (createdSchoolId) await admin.from("schools").delete().eq("id", createdSchoolId);
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
    return { ok: false, message: error instanceof Error ? error.message : "School registration failed." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: values.ownerEmail, password: values.password });
  if (signInError) return { ok: true, message: "School workspace created. Check your email if confirmation is enabled, then sign in." };
  redirect("/dashboard/school-admin");
}


