import { Input } from "@/components/ui/input";

export function RequiredLabel({ label, required }: { label: string; required?: boolean }) {
  return <span className="mb-2 block text-sm font-semibold">{label}{required ? <><span className="ml-1 text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span></> : null}</span>;
}

type FieldProps = { label: string; name: string; type?: string; defaultValue?: string | number | null; required?: boolean; helpText?: string; readOnly?: boolean; min?: string | number; max?: string | number; step?: string | number };
export function Field({ label, name, type = "text", defaultValue, required, helpText, readOnly, min, max, step }: FieldProps) {
  return <label className="block"><RequiredLabel label={label} required={required} /><Input name={name} type={type} defaultValue={defaultValue ?? ""} required={required} aria-required={required} readOnly={readOnly} min={min} max={max} step={step} className={readOnly ? "bg-muted text-muted-foreground" : undefined} />{helpText ? <span className="mt-1 block text-xs text-muted-foreground">{helpText}</span> : null}</label>;
}
export function TextAreaField({ label, name, defaultValue, required, helpText }: { label: string; name: string; defaultValue?: string | null; required?: boolean; helpText?: string }) {
  return <label className="block"><RequiredLabel label={label} required={required} /><textarea name={name} defaultValue={defaultValue ?? ""} required={required} aria-required={required} className="min-h-28 w-full rounded-xl border bg-white px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />{helpText ? <span className="mt-1 block text-xs text-muted-foreground">{helpText}</span> : null}</label>;
}
export function SelectField({ label, name, defaultValue, children, required, disabled }: { label: string; name: string; defaultValue?: string | null; children: React.ReactNode; required?: boolean; disabled?: boolean }) {
  return <label className="block"><RequiredLabel label={label} required={required} /><select name={name} defaultValue={defaultValue ?? ""} required={required} aria-required={required} disabled={disabled} className="h-12 w-full rounded-xl border bg-white px-4 text-base outline-none focus:ring-2 focus:ring-ring disabled:bg-muted"><>{children}</></select></label>;
}
export function ReadOnlyField({ label, value, name, helper = "This identifier is fixed after creation." }: { label: string; value: string | number | null | undefined; name?: string; helper?: string }) {
  return <label className="block"><RequiredLabel label={label} />{name ? <input type="hidden" name={name} value={value ?? ""} /> : null}<Input value={value ?? ""} readOnly className="bg-muted text-muted-foreground" /><span className="mt-1 block text-xs text-muted-foreground">{helper}</span></label>;
}

