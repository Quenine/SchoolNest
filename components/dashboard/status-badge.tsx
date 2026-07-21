import { cn } from "@/lib/utils";

const toneClasses = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  gray: "bg-slate-100 text-slate-700 ring-slate-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
};

export function StatusBadge({ children, tone = "gray" }: { children: React.ReactNode; tone?: keyof typeof toneClasses }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1", toneClasses[tone])}>{children}</span>;
}
