import { describe, expect, it } from "vitest";
import { assertWithinPlanLimit, getEffectivePlanLimits, isPlanLimitEnforcementEnabled } from "../plan-limits";
describe("plan limit enforcement", () => {
 it("bypasses limits when false", () => { expect(isPlanLimitEnforcementEnabled("false")).toBe(false); expect(() => assertWithinPlanLimit(50, 50, "Student", false)).not.toThrow(); expect(getEffectivePlanLimits({maxStudents:50,maxStaff:5,maxClasses:3},false).maxStudents).toBeNull(); });
 it("enforces limits when true", () => { expect(() => assertWithinPlanLimit(50, 50, "Student", true)).toThrow(/limit reached/); });
});


