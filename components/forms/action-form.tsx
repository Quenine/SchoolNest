"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/app/dashboard/school-admin/setup/actions";

const initialState: ActionState = { ok: false, success: false, message: "" };

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  className,
  resetOnSuccess = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (!state.message) return;
    window.dispatchEvent(new CustomEvent("schoolnest:toast", {
      detail: { type: state.ok ? "success" : "error", message: state.message },
    }));
    if (state.ok) {
      if (resetOnSuccess) formRef.current?.reset();
      router.refresh();
    }
  }, [router, resetOnSuccess, state.ok, state.message]);

  return (
    <form ref={formRef} action={formAction} className={className ?? "space-y-4"}>
      {children}
      {state.message ? (
        <p className={state.ok ? "text-sm font-medium text-primary" : "text-sm font-medium text-red-600"}>{state.message}</p>
      ) : null}
      {state.errors ? (
        <ul className="space-y-1 text-sm text-red-600">
          {Object.entries(state.errors).map(([field, messages]) => messages.map((message) => <li key={`${field}-${message}`}>{message}</li>))}
        </ul>
      ) : null}
      <Button type="submit" disabled={pending}>{pending ? (pendingLabel ?? "Saving...") : submitLabel}</Button>
    </form>
  );
}

