import { assignSubjectToClass, createSubject, updateSubject } from "@/app/dashboard/school-admin/setup/actions";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Field, ReadOnlyField, SelectField } from "@/components/dashboard/field";
import { DisclosurePanel, PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ActionForm } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { getSchoolContext } from "@/lib/school-context";

type Subject = { id: string; section_id: string | null; name: string; code: string; subject_type: string; is_active: boolean };

export default async function SubjectsPage() {
  const context = await getSchoolContext();
  const [{ data: subjects }, { data: sections }, { data: classes }, { data: assignments }] = await Promise.all([
    context.supabase.from("subjects").select("*").eq("school_id", context.schoolId).order("name"),
    context.supabase.from("school_sections").select("id, name").eq("school_id", context.schoolId).order("sort_order"),
    context.supabase.from("classes").select("id, name").eq("school_id", context.schoolId).order("level_order"),
    context.supabase.from("class_subjects").select("*").eq("school_id", context.schoolId),
  ]);
  const rows = (subjects ?? []) as Subject[];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="School setup" title="Subjects" description="Create subjects and assign them to the classes where they are taught." />
      <div className="grid gap-5 lg:grid-cols-2"><DisclosurePanel label="Add subject"><ActionForm action={createSubject} submitLabel="Add subject" pendingLabel="Creating..." resetOnSuccess><SelectField label="Section" name="section_id"><option value="">All sections</option>{(sections ?? []).map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</SelectField><Field label="Name" name="name" required /><Field label="Code" name="code" required helpText="Fixed after creation for clean reporting." /><SelectField label="Type" name="subject_type" defaultValue="core"><option value="core">Core</option><option value="elective">Elective</option><option value="vocational">Vocational</option><option value="language">Language</option><option value="co_curricular">Co-curricular</option></SelectField><input type="hidden" name="is_active" value="true" /></ActionForm></DisclosurePanel><DisclosurePanel label="Assign to class"><ActionForm action={assignSubjectToClass} submitLabel="Assign subject" pendingLabel="Assigning..." resetOnSuccess><SelectField label="Class" name="class_id" required><option value="">Choose class</option>{(classes ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField><SelectField label="Subject" name="subject_id" required><option value="">Choose subject</option>{rows.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField><input type="hidden" name="is_compulsory" value="false" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_compulsory" value="true" defaultChecked /> Compulsory subject</label></ActionForm></DisclosurePanel></div>
      {rows.length === 0 ? <EmptyState title="No subjects yet" message="Add the subjects your school offers, then assign them to the appropriate classes." /> : <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-muted text-muted-foreground"><tr><th className="p-4">Subject</th><th>Code</th><th>Type</th><th>Assigned classes</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map((subject) => <tr className="border-t align-top" key={subject.id}><td className="p-4 font-medium">{subject.name}</td><td>{subject.code}</td><td>{subject.subject_type.replace("_", " ")}</td><td>{(assignments ?? []).filter((item) => item.subject_id === subject.id).length}</td><td><StatusBadge tone={subject.is_active ? "green" : "gray"}>{subject.is_active ? "Active" : "Inactive"}</StatusBadge></td><td className="min-w-[240px] py-3"><DisclosurePanel label="Edit subject"><ActionForm action={updateSubject} submitLabel="Save subject" pendingLabel="Updating..."><input type="hidden" name="id" value={subject.id} /><SelectField label="Section" name="section_id" defaultValue={subject.section_id}><option value="">All sections</option>{(sections ?? []).map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</SelectField><Field label="Name" name="name" defaultValue={subject.name} required /><ReadOnlyField label="Code" name="code" value={subject.code} /><SelectField label="Type" name="subject_type" defaultValue={subject.subject_type}><option value="core">Core</option><option value="elective">Elective</option><option value="vocational">Vocational</option><option value="language">Language</option><option value="co_curricular">Co-curricular</option></SelectField><input type="hidden" name="is_active" value="false" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" value="true" defaultChecked={subject.is_active} /> Active</label></ActionForm></DisclosurePanel></td></tr>)}</tbody></table></div></Card>}
    </div>
  );
}
