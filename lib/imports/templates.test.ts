import {describe,expect,it} from "vitest";
import {definitions,templateCsv} from "./templates";
describe("import templates",()=>{it("provides all eight templates without tenant or fee-item amount columns",()=>{expect(Object.keys(definitions)).toHaveLength(8);expect(definitions['fee-items'].columns).not.toContain('amount');for(const key of Object.keys(definitions) as (keyof typeof definitions)[]){expect(templateCsv(key)).not.toContain('school_id');}});});
