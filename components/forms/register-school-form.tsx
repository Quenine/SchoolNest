"use client";

import { useActionState } from "react";
import { registerSchool } from "@/app/register-school/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: { ok: boolean; message: string; errors?: Record<string, string[]> } = { ok: false, message: "" };

export function RegisterSchoolForm() {
  const [state, formAction, pending] = useActionState(registerSchool, initialState);

  return (
    <form className="space-y-4" action={formAction}><p className="text-xs text-muted-foreground">Fields marked * are required.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field name="schoolName" label="School name" placeholder="e.g. Greenfield Academy" error={state.errors?.schoolName?.[0]} required />
        <Field name="schoolSlug" label="School slug" placeholder="greenfield-academy" error={state.errors?.schoolSlug?.[0]} />
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">School type <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span></span>
          <select name="schoolType" required aria-required="true" className="h-12 w-full rounded-xl border bg-white px-4 text-base outline-none focus:ring-2 focus:ring-ring">
            <option value="combined">Combined</option>
            <option value="nursery">Nursery</option>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
          </select>
          {state.errors?.schoolType ? <span className="mt-1 block text-xs text-red-600">{state.errors.schoolType[0]}</span> : null}
        </label>
        <Field name="contactEmail" label="School email" type="email" placeholder="office@school.com" error={state.errors?.contactEmail?.[0]} required />
        <Field name="contactPhone" label="School phone" type="tel" placeholder="0801 234 5678" error={state.errors?.contactPhone?.[0]} required />
        <Field name="state" label="State" placeholder="Lagos" error={state.errors?.state?.[0]} required />
        <Field name="cityLga" label="City/LGA" placeholder="Ikeja" error={state.errors?.cityLga?.[0]} required />
        <Field name="ownerName" label="Owner full name" placeholder="School owner or administrator" error={state.errors?.ownerName?.[0]} required />
        <Field name="ownerEmail" label="Owner email" type="email" placeholder="you@school.com" error={state.errors?.ownerEmail?.[0]} required />
        <Field name="password" label="Password" type="password" error={state.errors?.password?.[0]} required />
        <Field name="confirmPassword" label="Confirm password" type="password" error={state.errors?.confirmPassword?.[0]} required />
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">Address <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span></span>
        <textarea name="address" required aria-required="true" className="min-h-24 w-full rounded-xl border bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring" />
        {state.errors?.address ? <span className="mt-1 block text-xs text-red-600">{state.errors.address[0]}</span> : null}
      </label>
      {state.message ? <p className={state.ok ? "text-sm font-medium text-primary" : "text-sm font-medium text-red-600"}>{state.message}</p> : null}
      <Button className="mt-2 w-full" type="submit" disabled={pending}>{pending ? "Creating your school..." : "Create school workspace"}</Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">By continuing, you agree to manage school data responsibly and follow applicable privacy requirements.</p>
    </form>
  );
}

function Field({ name, label, type = "text", placeholder, error, required }: { name: string; label: string; type?: string; placeholder?: string; error?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}{required ? <><span className="ml-1 text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span></> : null}</span>
      <Input name={name} type={type} placeholder={placeholder} required={required} aria-required={required} />
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}


