"use client";

import { useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { AuthForm, type AuthFormValues } from "@/components/AuthForm";
import Link from "next/link";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (_values: AuthFormValues) => {
    // Placeholder: wire this up to Supabase, e.g.
    // const { error } = await supabase.auth.signInWithPassword({ email, password });
    // setError(error?.message ?? null);
    setError(null);
  };

  return (
    <AuthShell
      title="Sign in to VeriClause"
      subtitle="Access your compliance dashboard"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up" className="font-medium text-slate-900 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <AuthForm mode="sign-in" onSubmit={handleSubmit} error={error} />
    </AuthShell>
  );
}

