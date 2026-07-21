"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getRoleRedirect } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type LoginState = { ok: boolean; message: string; errors?: Record<string, string[]> };

const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function compactErrors(errors: Record<string, string[] | undefined>) {
  return Object.fromEntries(Object.entries(errors).filter((entry): entry is [string, string[]] => Array.isArray(entry[1])));
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Please check your email and password.", errors: compactErrors(parsed.error.flatten().fieldErrors) };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: error.message };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Could not read the signed-in user." };
  const { data: rows } = await supabase.from("user_roles").select("roles(code)").eq("user_id", user.id);
  const roles = (rows ?? []).map((row) => {
    const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
    return role?.code;
  }).filter((role): role is string => Boolean(role));
  redirect(getRoleRedirect(roles));
}
