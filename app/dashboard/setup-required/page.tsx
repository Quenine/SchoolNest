import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function SetupRequiredPage() {
  return (
    <Card className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Workspace setup required</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Your account is authenticated, but SchoolNest could not find a linked school profile. Register a school workspace or contact your school administrator.</p>
      <Link className="mt-5 inline-block font-semibold text-primary" href="/register-school">Register a school</Link>
    </Card>
  );
}
