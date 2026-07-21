import { CalendarDays, CheckCircle2, Users, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";

export function RoleDashboard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="mb-7">
        <p className="text-sm font-semibold text-primary">Welcome back</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value="—" note="Connect Supabase to view" icon={Users} />
        <StatCard label="Attendance" value="—" note="No records yet" icon={CheckCircle2} />
        <StatCard label="Fees" value="—" note="Current term" icon={WalletCards} />
        <StatCard label="Events" value="—" note="Upcoming" icon={CalendarDays} />
      </div>
      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold">Getting started</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your SchoolNest workspace is ready. Add your school details, current
          session, term, classes, staff, and students to begin.
        </p>
      </Card>
    </div>
  );
}
