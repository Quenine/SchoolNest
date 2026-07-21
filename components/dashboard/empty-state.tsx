import { Card } from "@/components/ui/card";

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <Card className="p-6 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{message}</p>
    </Card>
  );
}
