"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: { ok: boolean; message: string; errors?: Record<string, string[]> } = { ok: false, message: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form className="space-y-5" action={formAction}>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">Email address</span>
        <Input name="email" type="email" autoComplete="email" placeholder="you@school.com" required />
        {state.errors?.email ? <span className="mt-1 block text-xs text-red-600">{state.errors.email[0]}</span> : null}
      </label>
      <label className="block">
        <span className="mb-2 flex justify-between text-sm font-semibold">
          Password <Link href="#" className="font-medium text-primary">Forgot password?</Link>
        </span>
        <Input name="password" type="password" autoComplete="current-password" placeholder="Your password" required />
        {state.errors?.password ? <span className="mt-1 block text-xs text-red-600">{state.errors.password[0]}</span> : null}
      </label>
      {state.message ? <p className={state.ok ? "text-sm font-medium text-primary" : "text-sm font-medium text-red-600"}>{state.message}</p> : null}
      <Button className="w-full" type="submit" disabled={pending}>{pending ? "Signing in..." : "Sign in"}</Button>
    </form>
  );
}

