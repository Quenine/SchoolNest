import type { FeatureFlagKey } from "@/lib/types";

export interface FeatureAccessInput {
  planFeatures: readonly FeatureFlagKey[];
  overrides?: Partial<Record<FeatureFlagKey, boolean>>;
}

export function hasFeature(
  feature: FeatureFlagKey,
  { planFeatures, overrides = {} }: FeatureAccessInput,
) {
  if (feature in overrides) return overrides[feature] ?? false;
  return planFeatures.includes(feature);
}
