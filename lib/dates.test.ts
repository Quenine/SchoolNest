import { describe,expect,it } from "vitest";
import { isFutureInSchoolTimezone,todayForSchoolTimezone,validateDateRange } from "./dates";
describe("school timezone dates",()=>{const now=new Date('2026-07-22T10:00:00Z');it("calculates Lagos today",()=>expect(todayForSchoolTimezone('Africa/Lagos',now)).toBe('2026-07-22'));it("rejects future completed dates",()=>expect(isFutureInSchoolTimezone('2026-07-23','Africa/Lagos',now)).toBe(true));it("validates ranges",()=>expect(validateDateRange('2026-09-01','2026-08-01')).toBe(false));});
