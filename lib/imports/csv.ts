import Papa from "papaparse";
import type { CsvRow } from "./types";
export const MAX_CSV_BYTES=2*1024*1024;export const MAX_CSV_ROWS=2000;
export function parseCsv(text:string){const clean=text.replace(/^\uFEFF/,"");const first=Papa.parse<string[]>(clean,{preview:1,skipEmptyLines:"greedy"});const rawHeaders=(first.data[0]??[]).map(String).map(h=>h.trim());const duplicate=rawHeaders.filter((h,i)=>rawHeaders.indexOf(h)!==i);if(duplicate.length)throw new Error(`Duplicate columns: ${[...new Set(duplicate)].join(", ")}`);const parsed=Papa.parse<CsvRow>(clean,{header:true,skipEmptyLines:"greedy",transformHeader:h=>h.trim(),transform:v=>v.trim()});const fatal=parsed.errors.find(e=>e.code!=="UndetectableDelimiter");if(fatal)throw new Error(fatal.message);if(parsed.data.length>MAX_CSV_ROWS)throw new Error(`CSV exceeds the ${MAX_CSV_ROWS} row limit.`);return {headers:parsed.meta.fields??[],rows:parsed.data};}
export function formulaSafe(value:unknown){const s=String(value??"");return /^[=+\-@]/.test(s)?`'${s}`:s;}
export function exportCsv(rows:Record<string,unknown>[]){return Papa.unparse(rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,formulaSafe(v)]))));}
export function validateColumns(headers:string[],required:readonly string[],allowed:readonly string[]){const missing=required.filter(c=>!headers.includes(c)),unexpected=headers.filter(c=>!allowed.includes(c));if(missing.length)throw new Error(`Missing required columns: ${missing.join(", ")}`);if(unexpected.length)throw new Error(`Unexpected columns: ${unexpected.join(", ")}`);}

