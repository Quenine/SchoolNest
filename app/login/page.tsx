import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your school workspace."
      footer={<>New to SchoolNest? <Link className="font-semibold text-primary" href="/register-school">Register your school</Link></>}
    >
      <LoginForm />
    </AuthCard>
  );
}
