import Link from "next/link";
import { School } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/landing" className="inline-flex items-center gap-3 font-bold">
      <span className="grid size-10 place-items-center rounded-xl bg-primary text-white shadow-sm">
        <School className="size-5" />
      </span>
      {!compact && <span className="text-xl tracking-tight">SchoolNest</span>}
    </Link>
  );
}
