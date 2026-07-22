export const IMPORT_MODULES = ["students","staff","guardians","guardian-links","subjects","fee-items","class-fees","student-addons"] as const;
export type ImportModule = typeof IMPORT_MODULES[number];
export type CsvRow = Record<string,string>;
export type RowIssue = { field?: string; code: string; message: string; severity: "error"|"warning" };
export type ValidatedRow = { rowNumber: number; original: CsvRow; normalized: CsvRow; issues: RowIssue[] };
export type ImportResult = { total: number; valid: number; warnings: number; invalid: number; rows: ValidatedRow[]; created?: number; skipped?: number; failed?: number; jobId?: string };
export function isImportModule(value:string): value is ImportModule { return (IMPORT_MODULES as readonly string[]).includes(value); }
