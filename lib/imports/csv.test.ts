import { describe,expect,it } from "vitest";
import { exportCsv,formulaSafe,MAX_CSV_ROWS,parseCsv,validateColumns } from "./csv";
describe("CSV security and parsing",()=>{
 it("handles BOM, quoted commas, and empty lines",()=>{const r=parseCsv('\uFEFFname,code\r\n"Smith, Ada",A1\r\n\r\n');expect(r.rows).toEqual([{name:'Smith, Ada',code:'A1'}]);});
 it("rejects duplicate headers",()=>expect(()=>parseCsv('name,name\nA,B')).toThrow(/Duplicate/));
 it("validates required and unexpected columns",()=>{expect(()=>validateColumns(["name"],["name","code"],["name","code"])).toThrow(/Missing/);expect(()=>validateColumns(["name","school_id"],["name"],["name"])).toThrow(/Unexpected/);});
 it("enforces row limits",()=>expect(()=>parseCsv('a\n'+Array.from({length:MAX_CSV_ROWS+1},()=>1).join('\n'))).toThrow(/row limit/));
 it("makes spreadsheet formulas safe",()=>{expect(formulaSafe('=2+2')).toBe("'=2+2");expect(exportCsv([{value:'@SUM(A1)'}])).toContain("'@SUM");});
});


