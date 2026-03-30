"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm, type AuthFormValues } from "@/components/auth/AuthForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

function SignUpContent() {
  const searchParams = useSearchParams();
  const urlError =
    searchParams.get("error") === "oauth"
      ? "Google sign-in could not be completed. Try again."
      : null;
  const [error, setError] = useState<string | null>(null);
  const displayError = error ?? urlError;
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
      <div className="space-y-4">
        <GoogleSignInButton next={searchParams.get("next")} onError={setError} />
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400">or email</span>
          </div>
        </div>
        <AuthForm mode="sign-up" onSubmit={handleSubmit} error={displayError} />
      </div>
    </AuthShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Create your VeriClause account" subtitle="Set up an account to save analyses">
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-navy-950" />
          </div>
        </AuthShell>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
