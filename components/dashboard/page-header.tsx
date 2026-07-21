import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? <p className="text-sm font-semibold text-primary">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function DisclosurePanel({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <details className={cn("group rounded-lg border bg-white", className)}>
      <summary className="cursor-pointer list-none rounded-lg px-4 py-3 text-sm font-semibold hover:bg-muted">
        <span>{label}</span>
      </summary>
      <div className="border-t p-4">{children}</div>
    </details>
  );
}
