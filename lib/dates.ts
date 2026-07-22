export const DEFAULT_SCHOOL_TIMEZONE = "Africa/Lagos";
function parts(date: Date, timeZone: string) { return Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).map((p) => [p.type, p.value])); }
export function todayForSchoolTimezone(timeZone = DEFAULT_SCHOOL_TIMEZONE, now = new Date()) { const p = parts(now, timeZone); return `${p.year}-${p.month}-${p.day}`; }
export const maxDateForCompletedAction = todayForSchoolTimezone;
export function maxDateTimeForCompletedAction(timeZone = DEFAULT_SCHOOL_TIMEZONE, now = new Date()) { const p = parts(now, timeZone); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`; }
export function isFutureInSchoolTimezone(value: string, timeZone = DEFAULT_SCHOOL_TIMEZONE, now = new Date()) { if (!value) return false; return value.includes("T") ? value.slice(0, 16) > maxDateTimeForCompletedAction(timeZone, now) : value.slice(0, 10) > todayForSchoolTimezone(timeZone, now); }
export function validateDateRange(start: string, end: string) { return !start || !end || start <= end; }

