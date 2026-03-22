"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm, type AuthFormValues } from "@/components/auth/AuthForm";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/resume";
  return next;
}

function SignInContent() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (values: AuthFormValues) => {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    const dest = safeNextPath(searchParams.get("next"));
    router.push(dest);
    router.refresh();
  };

  return (
    <AuthShell
      title="Sign in to VeriClause"
      subtitle="Start with your resume, then open contract analysis from the nav"
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

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Sign in to VeriClause" subtitle="Loading…">
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-navy-950" />
          </div>
        </AuthShell>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
