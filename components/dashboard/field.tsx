import { Input } from "@/components/ui/input";

export function Field({ label, name, type = "text", defaultValue, required, helpText, readOnly }: { label: string; name: string; type?: string; defaultValue?: string | number | null; required?: boolean; helpText?: string; readOnly?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <Input name={name} type={type} defaultValue={defaultValue ?? ""} required={required} readOnly={readOnly} className={readOnly ? "bg-muted text-muted-foreground" : undefined} />
      {helpText ? <span className="mt-1 block text-xs text-muted-foreground">{helpText}</span> : null}
    </label>
  );
}

export function TextAreaField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string | null }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <textarea name={name} defaultValue={defaultValue ?? ""} className="min-h-28 w-full rounded-xl border bg-white px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
    </label>
  );
}

export function SelectField({ label, name, defaultValue, children, required }: { label: string; name: string; defaultValue?: string | null; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <select name={name} defaultValue={defaultValue ?? ""} required={required} className="h-12 w-full rounded-xl border bg-white px-4 text-base outline-none focus:ring-2 focus:ring-ring">
        {children}
      </select>
    </label>
  );
}

export function ReadOnlyField({ label, value, name, helper = "This identifier is fixed after creation." }: { label: string; value: string | number | null | undefined; name?: string; helper?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      <Input value={value ?? ""} readOnly className="bg-muted text-muted-foreground" />
      <span className="mt-1 block text-xs text-muted-foreground">{helper}</span>
    </label>
  );
}
