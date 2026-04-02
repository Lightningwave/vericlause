"use client";

import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Create New Password"
      subtitle="Enter a secure password for your VeriClause account"
      footer={
        <>
          Remembered your password?{" "}
          <Link href="/auth/sign-in" className="font-bold text-navy-950 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
