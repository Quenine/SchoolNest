import Link from "next/link";
import {
  ArrowRight, BellRing, BookOpenCheck, CalendarDays, Check,
  CreditCard, ReceiptText, ShieldCheck, Trophy, Users,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const features = [
  ["Admissions & students", Users],
  ["Fees & receipts", ReceiptText],
  ["Attendance & results", BookOpenCheck],
  ["Parents & report cards", ShieldCheck],
  ["Sports, clubs & events", Trophy],
  ["Online payments & alerts", BellRing],
] as const;

export default function LandingPage() {
  return (
    <main>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}>
            Log in
          </Link>
          <Link href="/register-school" className={buttonVariants()}>
            Register your school
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:py-24">
        <div>
          <span className="inline-flex rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-primary">
            Built for Nigerian schools
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            Simple school management software for Nigerian nursery, primary, and secondary schools.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Keep admissions, students, staff, fees, receipts, attendance,
            results, parents, and report cards organised in one friendly place.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register-school" className={buttonVariants({ size: "lg" })}>
              Start with the free plan <ArrowRight className="size-5" />
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Log in to your school
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Easy to use", "Mobile-friendly", "Secure school data"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <Check className="size-4 text-primary" /> {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative rounded-[2rem] bg-[#103c30] p-5 shadow-2xl shadow-emerald-950/15 sm:p-7">
          <div className="rounded-2xl bg-white p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Good morning</p>
                <p className="text-xl font-bold">Greenfield Academy</p>
              </div>
              <CalendarDays className="size-7 text-primary" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[["Students", "648"], ["Present today", "94%"], ["Fees received", "₦2.4m"], ["Results ready", "12"]].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-muted p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-bold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-secondary p-2 text-primary"><CreditCard className="size-5" /></span>
                <div>
                  <p className="text-sm font-semibold">Premium payments</p>
                  <p className="text-xs text-muted-foreground">Simple, trackable fee collection</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="max-w-2xl">
            <p className="font-semibold text-primary">Everything in its place</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Run the school without the paperwork maze.</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, Icon]) => (
              <div key={title} className="rounded-2xl border p-6">
                <span className="inline-grid size-11 place-items-center rounded-xl bg-secondary text-primary"><Icon className="size-5" /></span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Clear workflows your school team can learn quickly and use confidently.
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            Premium plans add online payments, email, SMS and WhatsApp alerts,
            inter-house sports, clubs, extracurricular activities, and events.
          </p>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Logo />
        <p>© {new Date().getFullYear()} SchoolNest. Made for growing schools.</p>
      </footer>
    </main>
  );
}
