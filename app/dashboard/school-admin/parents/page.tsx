import { createParentGuardian, updateParentGuardian } from "@/app/dashboard/school-admin/setup/actions";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Field, TextAreaField } from "@/components/dashboard/field";
import { DisclosurePanel, PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ActionForm } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { getSchoolContext } from "@/lib/school-context";
import { formatGuardianName, formatStudentName } from "@/lib/school-records";

type Guardian = { id: string; first_name: string; last_name: string; other_names: string | null; relationship_label: string | null; phone: string; alternate_phone: string | null; email: string | null; occupation: string | null; address: string | null; city: string | null; state: string | null; is_primary_contact: boolean };

export default async function ParentsPage() {
  const context = await getSchoolContext();
  const [{ data: guardians }, { data: students }, { data: links }] = await Promise.all([
    context.supabase.from("parent_guardians").select("*").eq("school_id", context.schoolId).order("created_at", { ascending: false }),
    context.supabase.from("students").select("id, first_name, last_name, other_names, preferred_name").eq("school_id", context.schoolId),
    context.supabase.from("student_guardians").select("*").eq("school_id", context.schoolId),
  ]);
  const rows = (guardians ?? []) as Guardian[];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Core records" title="Parents & guardians" description="Keep parent contact records clean and link them to students for future portal, SMS, and email workflows." />
      <Card className="p-5"><p className="font-semibold">Bulk import</p><p className="mt-2 text-sm text-muted-foreground">CSV template download placeholder. Excel/CSV import with validation will be implemented later.</p></Card>
      <DisclosurePanel label="Add parent or guardian"><ActionForm action={createParentGuardian} submitLabel="Add guardian" pendingLabel="Creating..." resetOnSuccess><div className="grid gap-4 md:grid-cols-3"><Field label="First name" name="first_name" required /><Field label="Last name" name="last_name" required /><Field label="Other names" name="other_names" /><Field label="Relationship label" name="relationship_label" /><Field label="Phone" name="phone" type="tel" required /><Field label="Alternate phone" name="alternate_phone" type="tel" /><Field label="Email" name="email" type="email" /><Field label="Occupation" name="occupation" /><Field label="City" name="city" /><Field label="State" name="state" /></div><TextAreaField label="Address" name="address" /><input type="hidden" name="is_primary_contact" value="false" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_primary_contact" value="true" /> Primary contact</label></ActionForm></DisclosurePanel>
      {rows.length === 0 ? <EmptyState title="No guardians yet" message="Add parent records and link them to students so contact details are ready when communication tools arrive." /> : <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-muted text-muted-foreground"><tr><th className="p-4">Guardian</th><th>Phone</th><th>Email</th><th>Children</th><th>Primary</th><th>Action</th></tr></thead><tbody>{rows.map((guardian) => { const childNames = (links ?? []).filter((link) => link.guardian_id === guardian.id).map((link) => (students ?? []).find((student) => student.id === link.student_id)).filter((student): student is NonNullable<typeof student> => Boolean(student)).map((student) => formatStudentName(student)); return <tr className="border-t align-top" key={guardian.id}><td className="p-4 font-medium">{formatGuardianName(guardian)}</td><td>{guardian.phone}</td><td>{guardian.email ?? "-"}</td><td>{childNames.join(", ") || "No linked children"}</td><td><StatusBadge tone={guardian.is_primary_contact ? "green" : "gray"}>{guardian.is_primary_contact ? "Yes" : "No"}</StatusBadge></td><td className="min-w-[260px] py-3"><DisclosurePanel label="Edit guardian"><ActionForm action={updateParentGuardian} submitLabel="Save guardian" pendingLabel="Updating..."><input type="hidden" name="id" value={guardian.id} /><Field label="First name" name="first_name" defaultValue={guardian.first_name} required /><Field label="Last name" name="last_name" defaultValue={guardian.last_name} required /><Field label="Other names" name="other_names" defaultValue={guardian.other_names} /><Field label="Relationship label" name="relationship_label" defaultValue={guardian.relationship_label} /><Field label="Phone" name="phone" type="tel" defaultValue={guardian.phone} required /><Field label="Alternate phone" name="alternate_phone" type="tel" defaultValue={guardian.alternate_phone} /><Field label="Email" name="email" type="email" defaultValue={guardian.email} /><Field label="Occupation" name="occupation" defaultValue={guardian.occupation} /><Field label="City" name="city" defaultValue={guardian.city} /><Field label="State" name="state" defaultValue={guardian.state} /><TextAreaField label="Address" name="address" defaultValue={guardian.address} /><input type="hidden" name="is_primary_contact" value="false" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_primary_contact" value="true" defaultChecked={guardian.is_primary_contact} /> Primary contact</label></ActionForm></DisclosurePanel></td></tr>; })}</tbody></table></div></Card>}
    </div>
  );
}
