"use client";
import { useState } from "react";
import { ActionForm } from "@/components/forms/action-form";
import { TextAreaField } from "@/components/dashboard/field";
import type { ActionState } from "@/app/dashboard/school-admin/setup/actions";
import { formatMoney } from "@/lib/finance/helpers";

type Fee = { id: string; amount: number | string; name: string };
export function StudentAddonForm({ action, studentId, sessionId, termId, fees }: { action: (state: ActionState, data: FormData) => Promise<ActionState>; studentId: string; sessionId: string; termId: string; fees: Fee[] }) {
  const [feeId, setFeeId] = useState(""); const selected = fees.find((fee) => fee.id === feeId); const [amount, setAmount] = useState("");
  const choose = (id: string) => { setFeeId(id); setAmount(id ? String(fees.find((fee) => fee.id === id)?.amount ?? "") : ""); };
  const custom = selected && amount !== "" && Number(amount) !== Number(selected.amount);
  return <ActionForm action={action} submitLabel="Assign add-on" pendingLabel="Assigning..." resetOnSuccess>
    <input type="hidden" name="student_id" value={studentId} /><input type="hidden" name="academic_session_id" value={sessionId} /><input type="hidden" name="term_id" value={termId} />
    <label className="block"><span className="mb-2 block text-sm font-semibold">Optional Fee <span className="text-red-600">*</span></span><select className="h-12 w-full rounded-xl border bg-white px-4" name="class_fee_structure_id" required value={feeId} onChange={(e) => choose(e.target.value)}><option value="">Choose optional fee</option>{fees.map((fee) => <option key={fee.id} value={fee.id}>{fee.name} - {formatMoney(Number(fee.amount))}</option>)}</select></label>
    <label className="block"><span className="mb-2 block text-sm font-semibold">Amount for this student <span className="text-red-600">*</span></span><input className="h-12 w-full rounded-xl border px-4" name="amount" type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /><span className="mt-1 block text-xs text-muted-foreground">Pre-filled from the selected optional fee. Adjust only when this student has an approved special amount.</span>{selected ? <span className="mt-1 block text-xs">Configured amount: {formatMoney(Number(selected.amount))}{custom ? " · Custom student amount" : ""}</span> : null}</label>
    <TextAreaField label="Notes" name="notes" />
  </ActionForm>;
}


