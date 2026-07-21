import { ActionForm } from "@/components/forms/action-form";
import { Field, TextAreaField } from "@/components/dashboard/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSchoolContext } from "@/lib/school-context";
import { updateSchoolProfileSettings } from "@/app/dashboard/school-admin/setup/actions";

export default async function ProfilePage() {
  const context = await getSchoolContext();
  const { data: profile } = await context.supabase.from("school_profile_settings").select("*").eq("school_id", context.schoolId).maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">School setup</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Profile settings</h1>
        <p className="mt-2 text-muted-foreground">Keep official school details and branding ready for receipts, reports, and parent-facing screens.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>School identity</CardTitle></CardHeader>
        <CardContent>
          <ActionForm action={updateSchoolProfileSettings} submitLabel="Save profile">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Display name" name="display_name" defaultValue={profile?.display_name ?? context.schoolName} required />
              <Field label="Motto" name="motto" defaultValue={profile?.motto} />
              <Field label="Primary color" name="primary_color" defaultValue={profile?.primary_color} />
              <Field label="Secondary color" name="secondary_color" defaultValue={profile?.secondary_color} />
              <Field label="Contact email" name="contact_email" type="email" defaultValue={profile?.contact_email} />
              <Field label="Contact phone" name="contact_phone" type="tel" defaultValue={profile?.contact_phone} />
              <Field label="Website" name="website" defaultValue={profile?.website} />
              <Field label="City" name="city" defaultValue={profile?.city} />
              <Field label="State" name="state" defaultValue={profile?.state} />
              <Field label="Country" name="country" defaultValue={profile?.country ?? "Nigeria"} />
              <Field label="Principal name" name="principal_name" defaultValue={profile?.principal_name} />
              <Field label="Head teacher name" name="head_teacher_name" defaultValue={profile?.head_teacher_name} />
              <Field label="Logo URL" name="logo_url" defaultValue={profile?.logo_url} />
              <Field label="Report card signature URL" name="report_card_signature_url" defaultValue={profile?.report_card_signature_url} />
              <Field label="Default currency" name="default_currency" defaultValue={profile?.default_currency ?? "NGN"} />
              <Field label="Timezone" name="timezone" defaultValue={profile?.timezone ?? "Africa/Lagos"} />
            </div>
            <TextAreaField label="Address" name="address" defaultValue={profile?.address} />
            <p className="text-sm text-muted-foreground">Logo and signature upload will use storage in a later step. Paste URLs for now if available.</p>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
