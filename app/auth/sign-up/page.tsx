"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { AuthForm, type AuthFormValues } from "@/components/AuthForm";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (values: AuthFormValues) => {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="We sent a confirmation link to your inbox. Click it to activate your account."
      >
        <div className="text-center">
          <button
            onClick={() => router.push("/auth/sign-in")}
            className="mt-4 text-sm font-medium text-navy-950 hover:underline"
          >
            Go to Sign In
          </button>
        </div>
      </AuthShell>
    );
  }

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
