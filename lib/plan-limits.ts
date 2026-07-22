export type PlanLimits = { maxStudents: number | null; maxStaff: number | null; maxClasses: number | null };
export function isPlanLimitEnforcementEnabled(value = process.env.SCHOOLNEST_ENFORCE_PLAN_LIMITS) { return value === "true"; }
export function getEffectivePlanLimits(limits: PlanLimits, enabled = isPlanLimitEnforcementEnabled()): PlanLimits { return enabled ? limits : { maxStudents: null, maxStaff: null, maxClasses: null }; }
export function assertWithinPlanLimit(current: number, limit: number | null, label: string, enabled = isPlanLimitEnforcementEnabled()) { if (enabled && limit !== null && current >= limit) throw new Error(`${label} limit reached for your current plan. Upgrade to add more.`); }

