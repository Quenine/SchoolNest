import Link from "next/link";
import { Card } from "@/components/ui/card";

export type ImportModuleSlug = "students" | "staff" | "guardians" | "guardian-links" | "subjects" | "fee-items" | "class-fees" | "student-addons";
const moduleLabels: Record<ImportModuleSlug, string> = { students: "Student", staff: "Staff", guardians: "Guardian", "guardian-links": "Student-Guardian Links", subjects: "Subjects", "fee-items": "Fee Items", "class-fees": "Class Fees", "student-addons": "Student Add-ons" };
export function moduleImportUrls(module: ImportModuleSlug) { return { template: `/api/imports/${module}?template=1`, importRoute: `/dashboard/school-admin/imports/${module}`, history: "/dashboard/school-admin/imports" }; }
export function ModuleImportActions({ title, description, module, secondary, compact = false }: { title: string; description: string; module: ImportModuleSlug; compact?: boolean; secondary?: { label: string; module: ImportModuleSlug } }) {
 const urls=moduleImportUrls(module); const secondaryUrls=secondary?moduleImportUrls(secondary.module):null; const label=moduleLabels[module];
 return <Card className={compact?"p-4":"p-5"}><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p><div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap"><Link className="inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold" href={urls.template}>Download {label} Template</Link><Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white" href={urls.importRoute}>Import {label}</Link>{secondary&&secondaryUrls?<Link className="inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold" href={secondaryUrls.importRoute}>{secondary.label}</Link>:null}<Link className="inline-flex min-h-11 items-center justify-center px-3 text-sm font-semibold text-primary" href={urls.history}>View Import History</Link></div></Card>;
}


