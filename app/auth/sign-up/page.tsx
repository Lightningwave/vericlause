"use client";

import { useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { AuthForm, type AuthFormValues } from "@/components/AuthForm";
import Link from "next/link";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (_values: AuthFormValues) => {
    // Placeholder: wire this up to Supabase, e.g.
    // const { error } = await supabase.auth.signUp({ email, password });
    // setError(error?.message ?? null);
    setError(null);
  };

  return (
    <AuthShell
      title="Create your VeriClause account"
      subtitle="Set up an account to save analyses"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="font-medium text-slate-900 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <AuthForm mode="sign-up" onSubmit={handleSubmit} error={error} />
    </AuthShell>
  );
}

