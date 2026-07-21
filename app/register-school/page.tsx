import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { RegisterSchoolForm } from "@/components/forms/register-school-form";

export default function RegisterSchoolPage() {
  return (
    <AuthCard
      title="Register your school"
      description="Start on the free plan. You can choose a paid plan when your school is ready."
      footer={<>Already registered? <Link className="font-semibold text-primary" href="/login">Log in</Link></>}
    >
      <RegisterSchoolForm />
    </AuthCard>
  );
}
