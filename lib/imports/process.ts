/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TenantSchoolContext } from "@/lib/tenant/get-school-context";
import { isFutureInSchoolTimezone } from "@/lib/dates";
import { normalizeCode, normalizePhoneNumber } from "@/lib/school-records";
import { definitions } from "./templates";
import type { CsvRow, ImportModule, ImportResult, RowIssue, ValidatedRow } from "./types";

type DbRow=Record<string,any>;
const bool=(v:string,defaultValue=true)=>v===""?defaultValue:["true","1","yes","y"].includes(v.toLowerCase());
const issue=(code:string,message:string,field?:string,severity:"error"|"warning"="error"):RowIssue=>({code,message,field,severity});
const dateOk=(v:string)=>!v||/^\d{4}-\d{2}-\d{2}$/.test(v);
const lower=(v:string)=>v.trim().toLowerCase();

async function loadLookups(context:TenantSchoolContext){
 const s=context.supabase, id=context.schoolId;
 const [classes,arms,sections,students,staff,guardians,subjects,categories,items,sessions,terms,fees,addons]=await Promise.all([
 s.from("classes").select("id,code").eq("school_id",id),s.from("class_arms").select("id,class_id,code").eq("school_id",id),s.from("school_sections").select("id,code").eq("school_id",id),
 s.from("students").select("id,admission_number,current_class_id,current_arm_id").eq("school_id",id),s.from("staff_profiles").select("id,staff_number,email,phone").eq("school_id",id),s.from("parent_guardians").select("id,phone,email").eq("school_id",id),
 s.from("subjects").select("id,code").eq("school_id",id),s.from("fee_categories").select("id,code").eq("school_id",id),s.from("fee_items").select("id,code,is_mandatory").eq("school_id",id),
 s.from("academic_sessions").select("id,name").eq("school_id",id),s.from("terms").select("id,name,academic_session_id").eq("school_id",id),s.from("class_fee_structures").select("id,academic_session_id,term_id,class_id,arm_id,fee_item_id,amount,is_required").eq("school_id",id),
 s.from("student_optional_fees").select("id,student_id,academic_session_id,term_id,class_fee_structure_id,status").eq("school_id",id).eq("status","active")]);
 return {classes:classes.data??[],arms:arms.data??[],sections:sections.data??[],students:students.data??[],staff:staff.data??[],guardians:guardians.data??[],subjects:subjects.data??[],categories:categories.data??[],items:items.data??[],sessions:sessions.data??[],terms:terms.data??[],fees:fees.data??[],addons:addons.data??[]};
}
function find(rows:DbRow[],key:string,value:string){return rows.find(r=>lower(String(r[key]??""))===lower(value));}

export async function validateRows(module:ImportModule,rows:CsvRow[],context:TenantSchoolContext):Promise<ImportResult>{
 const l=await loadLookups(context), seen=new Set<string>(), def=definitions[module]; const output:ValidatedRow[]=[];
 for(let i=0;i<rows.length;i++){const original=rows[i], normalized=Object.fromEntries(def.columns.map(c=>[c,(original[c]??"").trim()])), issues:RowIssue[]=[];
  for(const c of def.required)if(!normalized[c])issues.push(issue("required",`${c.replaceAll("_"," ")} is required.`,c));
  const duplicateKey=module==="students"?normalized.admission_number:module==="staff"?normalized.staff_number:module==="guardians"?normalizePhoneNumber(normalized.phone):["subjects","fee-items"].includes(module)?normalizeCode(normalized.code):"";
  if(duplicateKey){if(seen.has(duplicateKey))issues.push(issue("duplicate_in_file","Duplicate value in this CSV.",module==="students"?"admission_number":module==="staff"?"staff_number":module==="guardians"?"phone":"code"));seen.add(duplicateKey);}
  if(module==="students"){
   const cls=find(l.classes,"code",normalized.class_code); if(normalized.class_code&&!cls)issues.push(issue("unknown_class","Class code was not found in this school.","class_code"));
   if(normalized.arm_code&&cls&&!l.arms.find(a=>a.class_id===cls!.id&&lower(a.code)===lower(normalized.arm_code)))issues.push(issue("unknown_arm","Arm code was not found for this class.","arm_code"));
   if(find(l.students,"admission_number",normalized.admission_number))issues.push(issue("existing_duplicate","Admission number already exists and will be skipped.","admission_number","warning"));
   for(const f of ["date_of_birth","admission_date"]){if(!dateOk(normalized[f]))issues.push(issue("invalid_date","Use YYYY-MM-DD.",f));else if(isFutureInSchoolTimezone(normalized[f]))issues.push(issue("future_date","Future dates are not allowed.",f));}
   if(normalized.student_status&&!['active','graduated','withdrawn','suspended','transferred'].includes(normalized.student_status))issues.push(issue("invalid_status","Invalid student status.","student_status"));
   const anyGuardian=["guardian_first_name","guardian_last_name","guardian_phone","guardian_email","guardian_relationship"].some(f=>normalized[f]); if(anyGuardian&&(!normalized.guardian_first_name||!normalized.guardian_last_name||!normalized.guardian_phone||!normalized.guardian_relationship))issues.push(issue("incomplete_guardian","Guardian first name, last name, phone and relationship are required when adding a guardian.","guardian_phone"));
  } else if(module==="staff"){
   if(find(l.staff,"staff_number",normalized.staff_number))issues.push(issue("existing_duplicate","Staff number already exists and will be skipped.","staff_number","warning"));
   if(!['academic','non_academic','management','support'].includes(normalized.staff_category))issues.push(issue("invalid_category","Invalid staff category.","staff_category"));
   if(normalized.employment_status&&!['active','inactive','suspended','resigned','terminated'].includes(normalized.employment_status))issues.push(issue("invalid_status","Invalid employment status.","employment_status"));
   for(const f of ["date_of_birth","employment_date"]){if(!dateOk(normalized[f]))issues.push(issue("invalid_date","Use YYYY-MM-DD.",f));else if(isFutureInSchoolTimezone(normalized[f]))issues.push(issue("future_date","Future dates are not allowed.",f));}
   if(normalized.email&&l.staff.some(x=>lower(x.email??"")===lower(normalized.email)))issues.push(issue("duplicate_email","Another staff record uses this email.","email","warning"));
  } else if(module==="guardians"){
   if(l.guardians.some(g=>normalizePhoneNumber(g.phone)===normalizePhoneNumber(normalized.phone)))issues.push(issue("existing_duplicate","Guardian phone already exists and will be skipped.","phone","warning"));
  } else if(module==="guardian-links"){
   if(!normalized.guardian_phone&&!normalized.guardian_email)issues.push(issue("guardian_contact_required","Guardian phone or email is required.","guardian_phone"));
   if(!find(l.students,"admission_number",normalized.student_admission_number))issues.push(issue("unknown_student","Student was not found in this school.","student_admission_number"));
   if(!l.guardians.find(g=>(normalized.guardian_phone&&normalizePhoneNumber(g.phone)===normalizePhoneNumber(normalized.guardian_phone))||(normalized.guardian_email&&lower(g.email??"")===lower(normalized.guardian_email))))issues.push(issue("unknown_guardian","Guardian was not found in this school.","guardian_phone"));
  } else if(module==="subjects"){
   if(find(l.subjects,"code",normalized.code))issues.push(issue("existing_duplicate","Subject code already exists and will be skipped.","code","warning"));
   if(normalized.section_code&&!find(l.sections,"code",normalized.section_code))issues.push(issue("unknown_section","Section code was not found.","section_code"));
   if(!['core','elective','vocational','language','co_curricular'].includes(normalized.subject_type))issues.push(issue("invalid_type","Invalid subject type.","subject_type"));
  } else if(module==="fee-items"){
   if(find(l.items,"code",normalized.code))issues.push(issue("existing_duplicate","Fee item code already exists and will be skipped.","code","warning"));
   if(normalized.category_code&&!find(l.categories,"code",normalized.category_code))issues.push(issue("unknown_category","Fee category was not found.","category_code"));
   if(!['compulsory','optional'].includes(normalized.fee_type))issues.push(issue("invalid_fee_type","Fee type must be compulsory or optional.","fee_type"));
   if(!['termly','session','one_time','monthly','custom'].includes(normalized.billing_frequency))issues.push(issue("invalid_frequency","Invalid billing frequency.","billing_frequency"));
  } else if(module==="class-fees"){
   const session=find(l.sessions,"name",normalized.academic_session_name), cls=find(l.classes,"code",normalized.class_code), item=find(l.items,"code",normalized.fee_item_code);
   if(!session)issues.push(issue("unknown_session","Academic session was not found.","academic_session_name")); if(!cls)issues.push(issue("unknown_class","Class code was not found.","class_code")); if(!item)issues.push(issue("unknown_fee_item","Fee item was not found.","fee_item_code"));
   const term=normalized.term_name&&session?l.terms.find(t=>t.academic_session_id===session!.id&&lower(t.name)===lower(normalized.term_name)):null; if(normalized.term_name&&!term)issues.push(issue("unknown_term","Term was not found in the session.","term_name"));
   const arm=normalized.arm_code&&cls?l.arms.find(a=>a.class_id===cls!.id&&lower(a.code)===lower(normalized.arm_code)):null;if(normalized.arm_code&&!arm)issues.push(issue("unknown_arm","Arm was not found for the class.","arm_code"));
   if(!(Number(normalized.amount)>0))issues.push(issue("invalid_amount","Amount must be greater than zero.","amount")); if(!['compulsory','optional'].includes(normalized.fee_type))issues.push(issue("invalid_fee_type","Fee type must be compulsory or optional.","fee_type"));
   if(item&&item.is_mandatory!==(normalized.fee_type==='compulsory'))issues.push(issue("fee_type_mismatch","Fee type does not agree with the fee item.","fee_type"));
  } else if(module==="student-addons"){
   const student=find(l.students,"admission_number",normalized.student_admission_number),session=find(l.sessions,"name",normalized.academic_session_name),item=find(l.items,"code",normalized.optional_fee_item_code);
   if(!student)issues.push(issue("unknown_student","Student was not found.","student_admission_number"));if(!session)issues.push(issue("unknown_session","Academic session was not found.","academic_session_name"));if(!item||item.is_mandatory)issues.push(issue("unknown_optional_fee","Optional fee item was not found.","optional_fee_item_code"));
   const term=normalized.term_name&&session?l.terms.find(t=>t.academic_session_id===session!.id&&lower(t.name)===lower(normalized.term_name)):null;if(normalized.term_name&&!term)issues.push(issue("unknown_term","Term was not found.","term_name"));
   const fee=student&&session&&item?l.fees.find(f=>f.academic_session_id===session!.id&&(f.term_id??null)===(term?.id??null)&&f.class_id===student!.current_class_id&&(!f.arm_id||f.arm_id===student!.current_arm_id)&&f.fee_item_id===item!.id&&!f.is_required):null;
   if(student&&session&&item&&!item.is_mandatory&&!fee)issues.push(issue("missing_class_fee","No matching optional class fee is configured for this student.","optional_fee_item_code")); if(normalized.amount&&Number(normalized.amount)<0)issues.push(issue("invalid_amount","Amount cannot be negative.","amount"));
  }
  output.push({rowNumber:i+2,original,normalized,issues});
 }
 return {total:output.length,valid:output.filter(r=>!r.issues.some(i=>i.severity==='error')).length,warnings:output.filter(r=>r.issues.some(i=>i.severity==='warning')&&!r.issues.some(i=>i.severity==='error')).length,invalid:output.filter(r=>r.issues.some(i=>i.severity==='error')).length,rows:output};
}

export async function persistRows(module:ImportModule,validation:ImportResult,context:TenantSchoolContext){
 const l=await loadLookups(context),s=context.supabase,school_id=context.schoolId;let created=0,skipped=0,failed=0;const errors:{row:ValidatedRow;message:string}[]=[];
 for(const row of validation.rows.filter(r=>!r.issues.some(i=>i.severity==='error'))){const n=row.normalized; if(row.issues.some(i=>i.code==='existing_duplicate')){skipped++;continue;} try{
  let result:any;
  if(module==='students'){const cls=find(l.classes,'code',n.class_code),arm=n.arm_code?l.arms.find(a=>a.class_id===cls!.id&&lower(a.code)===lower(n.arm_code)):null;result=await s.from('students').insert({school_id,admission_number:n.admission_number,first_name:n.first_name,last_name:n.last_name,other_names:n.other_names||null,preferred_name:n.preferred_name||null,gender:n.gender||null,date_of_birth:n.date_of_birth||null,current_class_id:cls!.id,current_arm_id:arm?.id??null,admission_date:n.admission_date||null,student_status:n.student_status||'active',nationality:n.nationality||'Nigerian',state_of_origin:n.state_of_origin||null,lga:n.lga||null,home_address:n.home_address||null,blood_group:n.blood_group||null,genotype:n.genotype||null,allergies:n.allergies||null,medical_notes:n.medical_notes||null}).select('id').single(); if(!result.error&&n.guardian_phone){let guardian=l.guardians.find(g=>normalizePhoneNumber(g.phone)===normalizePhoneNumber(n.guardian_phone));if(!guardian){const g=await s.from('parent_guardians').insert({school_id,first_name:n.guardian_first_name,last_name:n.guardian_last_name,phone:normalizePhoneNumber(n.guardian_phone),email:n.guardian_email||null,relationship_label:n.guardian_relationship}).select('id,phone,email').single();if(g.error)throw new Error('Guardian could not be created.');guardian=g.data;l.guardians.push(guardian);}const link=await s.from('student_guardians').upsert({school_id,student_id:result.data.id,guardian_id:guardian!.id,relationship_to_student:n.guardian_relationship,is_primary:true},{onConflict:'school_id,student_id,guardian_id'});if(link.error)throw new Error('Guardian link could not be created.');}}
  else if(module==='staff')result=await s.from('staff_profiles').insert({school_id,staff_number:n.staff_number,first_name:n.first_name,last_name:n.last_name,other_names:n.other_names||null,gender:n.gender||null,phone:normalizePhoneNumber(n.phone)||null,email:n.email||null,address:n.address||null,date_of_birth:n.date_of_birth||null,employment_date:n.employment_date||null,employment_status:n.employment_status||'active',staff_category:n.staff_category,job_title:n.job_title||null,department:n.department||null,qualification:n.qualification||null,emergency_contact_name:n.emergency_contact_name||null,emergency_contact_phone:normalizePhoneNumber(n.emergency_contact_phone)||null});
  else if(module==='guardians')result=await s.from('parent_guardians').insert({school_id,first_name:n.first_name,last_name:n.last_name,other_names:n.other_names||null,relationship_label:n.relationship_label||null,phone:normalizePhoneNumber(n.phone),alternate_phone:normalizePhoneNumber(n.alternate_phone)||null,email:n.email||null,occupation:n.occupation||null,address:n.address||null,city:n.city||null,state:n.state||null});
  else if(module==='guardian-links'){const student=find(l.students,'admission_number',n.student_admission_number),guardian=l.guardians.find(g=>(n.guardian_phone&&normalizePhoneNumber(g.phone)===normalizePhoneNumber(n.guardian_phone))||(n.guardian_email&&lower(g.email??'')===lower(n.guardian_email)));result=await s.from('student_guardians').upsert({school_id,student_id:student!.id,guardian_id:guardian!.id,relationship_to_student:n.relationship_to_student,is_primary:bool(n.is_primary,false),can_pick_up:bool(n.can_pick_up,false),receives_sms:bool(n.receives_sms,true),receives_email:bool(n.receives_email,true)},{onConflict:'school_id,student_id,guardian_id',ignoreDuplicates:true});}
  else if(module==='subjects')result=await s.from('subjects').insert({school_id,name:n.name,code:normalizeCode(n.code),section_id:n.section_code?find(l.sections,'code',n.section_code)!.id:null,subject_type:n.subject_type,is_active:bool(n.is_active,true)});
  else if(module==='fee-items')result=await s.from('fee_items').insert({school_id,category_id:n.category_code?find(l.categories,'code',n.category_code)!.id:null,name:n.name,code:normalizeCode(n.code),description:n.description||null,billing_frequency:n.billing_frequency,is_mandatory:n.fee_type==='compulsory',applies_to:n.applies_to||'class',is_active:bool(n.is_active,true)});
  else if(module==='class-fees'){const session=find(l.sessions,'name',n.academic_session_name),cls=find(l.classes,'code',n.class_code),item=find(l.items,'code',n.fee_item_code),term=n.term_name?l.terms.find(t=>t.academic_session_id===session!.id&&lower(t.name)===lower(n.term_name)):null,arm=n.arm_code?l.arms.find(a=>a.class_id===cls!.id&&lower(a.code)===lower(n.arm_code)):null;result=await s.from('class_fee_structures').upsert({school_id,academic_session_id:session!.id,term_id:term?.id??null,class_id:cls!.id,arm_id:arm?.id??null,fee_item_id:item!.id,amount:Number(n.amount),is_required:n.fee_type==='compulsory'},{onConflict:'school_id,academic_session_id,term_id,class_id,arm_id,fee_item_id',ignoreDuplicates:true});}
  else {const student=find(l.students,'admission_number',n.student_admission_number),session=find(l.sessions,'name',n.academic_session_name),item=find(l.items,'code',n.optional_fee_item_code),term=n.term_name?l.terms.find(t=>t.academic_session_id===session!.id&&lower(t.name)===lower(n.term_name)):null,fee=l.fees.find(f=>f.academic_session_id===session!.id&&(f.term_id??null)===(term?.id??null)&&f.class_id===student!.current_class_id&&(!f.arm_id||f.arm_id===student!.current_arm_id)&&f.fee_item_id===item!.id&&!f.is_required);const exists=l.addons.find(a=>a.student_id===student!.id&&a.academic_session_id===session!.id&&(a.term_id??null)===(term?.id??null)&&a.class_fee_structure_id===fee!.id);if(exists){skipped++;continue;}result=await s.from('student_optional_fees').insert({school_id,student_id:student!.id,academic_session_id:session!.id,term_id:term?.id??null,class_fee_structure_id:fee!.id,amount:n.amount===''?Number(fee!.amount):Number(n.amount),notes:n.notes||null,status:'active',created_by_user_profile_id:context.profileId});}
  if(result?.error)throw new Error('Record could not be saved.');created++;
 }catch(e){failed++;errors.push({row,message:e instanceof Error?e.message:'Record could not be saved.'});}}
 return {created,skipped,failed,errors};
}



