"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { AuthForm, type AuthFormValues } from "@/components/AuthForm";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

    router.push("/dashboard");
    router.refresh();
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
