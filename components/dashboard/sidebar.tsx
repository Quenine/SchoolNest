"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, Building2, CalendarCheck, GraduationCap, Home, Settings, ShieldCheck, UserRoundCog, UsersRound, WalletCards, Upload } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/school-admin/setup", label: "School Setup", icon: Building2 },
  { href: "/dashboard/school-admin/setup/classes", label: "Classes & Arms", icon: BookOpen },
  { href: "/dashboard/school-admin/setup/subjects", label: "Subjects", icon: GraduationCap },
  { href: "/dashboard/school-admin/setup/class-staff", label: "Class Staff", icon: UserRoundCog },
  { href: "/dashboard/school-admin/staff", label: "Staff", icon: UserRoundCog },
  { href: "/dashboard/school-admin/students", label: "Students", icon: UsersRound },
  { href: "/dashboard/school-admin/parents", label: "Parents/Guardians", icon: UsersRound },
  { href: "/dashboard/school-admin/imports", label: "Data Imports", icon: Upload },
  { href: "/dashboard/school-admin/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/dashboard/school-admin/announcements", label: "Announcements", icon: Bell },
  { href: "/dashboard/school-admin/finance", label: "Finance", icon: WalletCards },
  { href: "/dashboard/school-admin/finance/fees", label: "Fee Setup", icon: WalletCards },
  { href: "/dashboard/school-admin/finance/student-addons", label: "Student Add-ons", icon: WalletCards },
  { href: "/dashboard/school-admin/finance/invoices", label: "Invoices", icon: BookOpen },
  { href: "/dashboard/school-admin/finance/payments", label: "Payments", icon: WalletCards },
  { href: "/dashboard/school-admin/finance/receipts", label: "Receipts", icon: BookOpen },
  { href: "/dashboard/school-admin/finance/debtors", label: "Debtors", icon: UsersRound },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/super-admin", label: "Platform", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="border-b bg-white lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex h-20 items-center justify-between px-5 lg:px-7">
        <Logo />
        <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Step 5</span>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={cn("flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition", active ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="m-4 hidden rounded-2xl bg-[#102f26] p-5 text-white lg:block">
        <WalletCards className="size-5 text-[#70e0bd]" />
        <p className="mt-3 text-sm font-semibold">Current plan limits</p>
        <p className="mt-1 text-xs leading-5 text-white/65">Upgrade messaging appears when a quota is reached.</p>
      </div>
    </aside>
  );
}
