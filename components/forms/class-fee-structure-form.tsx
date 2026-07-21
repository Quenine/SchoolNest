"use client";

import { ActionForm } from "@/components/forms/action-form";
import { Field, SelectField } from "@/components/dashboard/field";
import type { ActionState } from "@/app/dashboard/school-admin/setup/actions";

type FeeItemOption = { id: string; name: string; categoryName?: string };
type Option = { id: string; name: string };
type TermOption = Option & { academic_session_id: string };
type ArmOption = Option & { class_id: string };

export function ClassFeeStructureForm({
  action,
  feeItems,
  sessions,
  terms,
  classes,
  arms,
  isRequiredDefault = true,
  submitLabel = "Assign fee",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  feeItems: FeeItemOption[];
  sessions: Option[];
  terms: TermOption[];
  classes: Option[];
  arms: ArmOption[];
  isRequiredDefault?: boolean;
  submitLabel?: string;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} pendingLabel="Assigning..." resetOnSuccess>
      <SelectField label="Session" name="academic_session_id" required><option value="">Choose session</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}</SelectField>
      <SelectField label="Term" name="term_id"><option value="">Session fee</option>{terms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}</SelectField>
      <SelectField label="Class" name="class_id" required><option value="">Choose class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
      <SelectField label="Arm" name="arm_id"><option value="">All arms</option>{arms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
      <SelectField label="Fee item" name="fee_item_id" required>
        <option value="">Choose fee item</option>
        {feeItems.map((item) => <option key={item.id} value={item.id}>{item.categoryName ? `${item.name} (${item.categoryName})` : item.name}</option>)}
      </SelectField>
      <Field label="Amount for this class" name="amount" type="number" defaultValue={0} helpText="This is the actual amount billed to students in the selected class/arm for the selected session or term." />
      <input type="hidden" name="is_required" value={isRequiredDefault ? "true" : "false"} />
    </ActionForm>
  );
}
