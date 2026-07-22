import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const pages=["app/dashboard/school-admin/students/page.tsx","app/dashboard/school-admin/staff/page.tsx","app/dashboard/school-admin/parents/page.tsx","app/dashboard/school-admin/setup/subjects/page.tsx","app/dashboard/school-admin/finance/fees/page.tsx","app/dashboard/school-admin/finance/student-addons/page.tsx"];
describe("implemented import pages",()=>{it("contain no obsolete import placeholder copy",()=>{const source=pages.map(path=>readFileSync(path,"utf8")).join("\n");expect(source).not.toMatch(/CSV template download placeholder|Excel\/CSV import with validation will be implemented later|import coming soon|bulk import will be added|prepare for bulk import/i)})});
