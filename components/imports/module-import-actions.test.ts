import { describe, expect, it } from "vitest";
import { moduleImportUrls } from "./module-import-actions";
describe("module import routes",()=>{it("constructs canonical URLs",()=>expect(moduleImportUrls("staff")).toEqual({template:"/api/imports/staff?template=1",importRoute:"/dashboard/school-admin/imports/staff",history:"/dashboard/school-admin/imports"}))});
