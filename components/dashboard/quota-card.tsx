import { Card } from "@/components/ui/card";

export function QuotaCard({ label, count, limit }: { label: string; count: number; limit: number | null }) {
  const reached = limit !== null && count >= limit;
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{count}{limit === null ? "" : ` / ${limit}`}</p>
      <p className={reached ? "mt-2 text-sm font-medium text-red-600" : "mt-2 text-sm text-muted-foreground"}>
        {limit === null ? "Unlimited on this plan" : reached ? "Limit reached. Upgrade to add more." : "Current plan allowance"}
      </p>
    </Card>
  );
}
