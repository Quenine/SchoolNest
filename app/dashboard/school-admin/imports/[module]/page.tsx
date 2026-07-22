import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { CsvTemplateButton, ImportWorkflow } from "@/components/imports/import-workflow";
import { definitions } from "@/lib/imports/templates";
import { isImportModule, IMPORT_MODULES } from "@/lib/imports/types";
import { getSchoolContext, assertCanManageSetup } from "@/lib/school-context";
export function generateStaticParams(){return IMPORT_MODULES.map(module=>({module}))}
export default async function ImportModulePage({params}:{params:Promise<{module:string}>}){const {module}=await params;if(!isImportModule(module))notFound();const context=await getSchoolContext();assertCanManageSetup(context);const definition=definitions[module];return <div className="space-y-6"><PageHeader eyebrow="Data Imports" title={`Import ${definition.title}`} description={definition.purpose} action={<CsvTemplateButton module={module}/>}/><Link className="text-sm font-semibold text-primary" href="/dashboard/school-admin/imports">← All imports and history</Link><ImportWorkflow module={module} definition={definition}/></div>}
