import { Building2, CreditCard, ShieldCheck, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

const sections = [
  ["School profile", "Name, contact details, logo, and branding.", Building2],
  ["People and access", "Invite staff and manage their roles.", Users],
  ["Subscription", "Review plan limits, billing cycle, and features.", CreditCard],
  ["Security", "Authentication, audit history, and data controls.", ShieldCheck],
] as const;

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <p className="mt-2 text-muted-foreground">Manage your school workspace and account preferences.</p>
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {sections.map(([title, description, Icon]) => (
          <Card key={title} className="flex items-start gap-4 p-6 transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="rounded-xl bg-secondary p-3 text-primary"><Icon className="size-5" /></span>
            <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p></div>
          </Card>
        ))}
      </div>
    </div>
  );
}
