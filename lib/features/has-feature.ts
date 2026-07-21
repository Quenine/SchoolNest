import type { FeatureFlagKey } from "@/lib/types";
import { getTenantSchoolContext } from "@/lib/tenant/get-school-context";

export async function hasFeature(feature: FeatureFlagKey) {
  const context = await getTenantSchoolContext();
  const { data: overrides } = await context.supabase
    .from("school_feature_overrides")
    .select("is_enabled, feature_flags(key)")
    .eq("school_id", context.schoolId)
    .or("expires_at.is.null,expires_at.gt.now()");
  const override = (overrides ?? []).find((row) => {
    const flag = Array.isArray(row.feature_flags) ? row.feature_flags[0] : row.feature_flags;
    return flag?.key === feature;
  });
  if (override) return Boolean(override.is_enabled);
  return context.planFeatures.includes(feature);
}
