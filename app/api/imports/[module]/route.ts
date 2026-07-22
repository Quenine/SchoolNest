import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSchoolContext, assertCanManageSetup } from "@/lib/school-context";
import { parseCsv, MAX_CSV_BYTES, exportCsv, validateColumns } from "@/lib/imports/csv";
import { definitions, templateCsv } from "@/lib/imports/templates";
import { isImportModule } from "@/lib/imports/types";
import { persistRows, validateRows } from "@/lib/imports/process";

const safeMessage=(error:unknown)=>error instanceof Error&&/^(CSV|Duplicate|Missing|Unexpected)/.test(error.message)?error.message:"The CSV could not be processed. Check the template and try again.";
export async function GET(request:NextRequest,{params}:{params:Promise<{module:string}>}){
 const {module}=await params;if(!isImportModule(module))return NextResponse.json({error:"Unknown import module."},{status:404});
 const context=await getSchoolContext();assertCanManageSetup(context);
 if(request.nextUrl.searchParams.has("template"))return new NextResponse(templateCsv(module),{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":`attachment; filename="schoolnest-${module}-template.csv"`}});
 const job=request.nextUrl.searchParams.get("job");if(!job)return NextResponse.json({error:"Missing job."},{status:400});
 const {data:rows}=await context.supabase.from("data_import_errors").select("row_number,field_name,error_code,error_message,row_data").eq("school_id",context.schoolId).eq("import_job_id",job).order("row_number");
 return new NextResponse(exportCsv((rows??[]).map(r=>({...((r.row_data as Record<string,unknown>)??{}),row_number:r.row_number,error_field:r.field_name,error_code:r.error_code,error_message:r.error_message}))),{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":`attachment; filename="schoolnest-${module}-errors.csv"`}});
}
export async function POST(request:NextRequest,{params}:{params:Promise<{module:string}>}){
 const {module}=await params;if(!isImportModule(module))return NextResponse.json({error:"Unknown import module."},{status:404});
 try{const context=await getSchoolContext();assertCanManageSetup(context);const form=await request.formData(),file=form.get("file"),mode=form.get("mode");
  if(!(file instanceof File))return NextResponse.json({error:"Choose a CSV file."},{status:400});
  if(!file.name.toLowerCase().endsWith(".csv")||!['text/csv','application/vnd.ms-excel','application/csv','text/plain',''].includes(file.type))return NextResponse.json({error:"Only CSV files are accepted."},{status:415});
  if(file.size>MAX_CSV_BYTES)return NextResponse.json({error:`File exceeds the ${MAX_CSV_BYTES/1024/1024} MB limit.`},{status:413});
  let text:string;try{text=new TextDecoder("utf-8",{fatal:true}).decode(await file.arrayBuffer());}catch{return NextResponse.json({error:"CSV must use UTF-8 encoding."},{status:400});}
  const parsed=parseCsv(text),def=definitions[module]; validateColumns(parsed.headers,def.required,def.columns);
  const validation=await validateRows(module,parsed.rows,context);if(mode!=="import")return NextResponse.json({...validation,rows:validation.rows.slice(0,50)});
  if(validation.valid===0)return NextResponse.json({error:"There are no valid rows to import."},{status:400});
  const {data:job,error:jobError}=await context.supabase.from("data_import_jobs").insert({school_id:context.schoolId,module,original_filename:file.name,status:"processing",total_rows:validation.total,valid_rows:validation.valid,failed_rows:validation.invalid,created_by_user_profile_id:context.profileId,metadata:{warning_rows:validation.warnings}}).select("id").single();if(jobError||!job)return NextResponse.json({error:"Import history could not be created. Apply the Step 4.9 migration first."},{status:500});
  const result=await persistRows(module,validation,context);const blocked=validation.rows.filter(r=>r.issues.some(i=>i.severity==='error')).flatMap(r=>r.issues.filter(i=>i.severity==='error').map(i=>({row:r,field:i.field,code:i.code,message:i.message})));const allErrors=[...blocked,...result.errors.map(e=>({row:e.row,field:undefined,code:'persistence_failed',message:e.message}))];
  if(allErrors.length){await context.supabase.from("data_import_errors").insert(allErrors.map(e=>({school_id:context.schoolId,import_job_id:job.id,row_number:e.row.rowNumber,field_name:e.field??null,error_code:e.code,error_message:e.message,row_data:Object.fromEntries(Object.entries(e.row.original).filter(([k])=>!['medical_notes','allergies'].includes(k)))})));}
  const status=allErrors.length||result.failed?'completed_with_errors':'completed';await context.supabase.from("data_import_jobs").update({status,imported_rows:result.created,skipped_rows:result.skipped,failed_rows:validation.invalid+result.failed,completed_at:new Date().toISOString()}).eq("school_id",context.schoolId).eq("id",job.id);
  await context.supabase.from("audit_logs").insert({school_id:context.schoolId,actor_user_id:context.userId,action:"data_import.completed",entity_type:"data_import_jobs",entity_id:job.id,metadata:{module,total:validation.total,created:result.created,skipped:result.skipped,failed:validation.invalid+result.failed}});
  revalidatePath(def.recordsPath);revalidatePath("/dashboard/school-admin/imports");return NextResponse.json({...validation,rows:validation.rows.slice(0,50),created:result.created,skipped:result.skipped,failed:validation.invalid+result.failed,jobId:job.id,status});
 }catch(error){return NextResponse.json({error:safeMessage(error)},{status:400});}
}


