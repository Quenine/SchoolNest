import Link from "next/link";
import { BookOpen, Building2, GraduationCap, Settings, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { QuotaCard } from "@/components/dashboard/quota-card";
import { getSchoolContext, getSchoolCounts } from "@/lib/school-context";

const setupLinks = [
  ["Profile", "/dashboard/school-admin/setup/profile", Settings, "School identity, branding, contact details, and report card signature fields."],
  ["Sessions", "/dashboard/school-admin/setup/sessions", BookOpen, "Academic sessions and terms used across enrollments and future reports."],
  ["Classes & Arms", "/dashboard/school-admin/setup/classes", Building2, "Sections, classes, arms, class teachers, and Nigerian defaults."],
  ["Subjects", "/dashboard/school-admin/setup/subjects", GraduationCap, "Subjects offered by the school and class assignments."],
  ["People", "/dashboard/school-admin/students", UsersRound, "Students, staff, parents, and guardian links."],
] as const;

export default async function SetupPage() {
  const context = await getSchoolContext();
  const counts = await getSchoolCounts(context.supabase, context.schoolId);
  const { data: profile } = await context.supabase.from("school_profile_settings").select("display_name, contact_email, contact_phone, address").eq("school_id", context.schoolId).maybeSingle();
  const completed = [profile?.display_name, profile?.contact_email, profile?.contact_phone, profile?.address].filter(Boolean).length;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold text-primary">School setup</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Core records</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">Set up the records every Nigerian school needs before fees, attendance, results, and parent portal workflows are switched on.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QuotaCard label="Students" count={counts.students} limit={context.limits.maxStudents} />
        <QuotaCard label="Staff" count={counts.staff} limit={context.limits.maxStaff} />
        <QuotaCard label="Classes" count={counts.classes} limit={context.limits.maxClasses} />
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Current plan</p>
          <p className="mt-2 text-2xl font-bold">{context.planName}</p>
          <p className="mt-2 text-sm text-muted-foreground">Profile completion: {completed}/4 essentials</p>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {setupLinks.map(([title, href, Icon, description]) => (
          <Link href={href} key={href} className="rounded-2xl border bg-white p-5 transition hover:border-primary hover:shadow-sm">
            <Icon className="size-5 text-primary" />
            <h2 className="mt-4 font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5"><p className="text-sm text-muted-foreground">Sections</p><p className="mt-2 text-2xl font-bold">{counts.sections}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted-foreground">Class arms</p><p className="mt-2 text-2xl font-bold">{counts.arms}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted-foreground">Subjects</p><p className="mt-2 text-2xl font-bold">{counts.subjects}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted-foreground">Parents/guardians</p><p className="mt-2 text-2xl font-bold">{counts.guardians}</p></Card>
      </div>
    </div>
  );
}
