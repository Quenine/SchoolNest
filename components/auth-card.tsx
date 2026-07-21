import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center"><Logo /></div>
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        </Card>
      </div>
    </main>
  );
}
