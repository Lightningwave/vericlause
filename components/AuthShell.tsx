"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/SiteNavbar";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <SiteNavbar
        rightSlot={
          <Link
            href="/"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Home
          </Link>
        }
      />

      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_460px]">
          <div className="hidden rounded-3xl border border-slate-200 bg-white p-10 shadow-sm lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b88a44]">
              VeriClause
            </p>
            <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-navy-950">
              Contracts, careers, and interview preparation in one place
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">
              Sign in to access contract analysis, compare agreements, build resumes, match jobs,
              and prepare with the AI interview agent.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <h2 className="text-3xl font-semibold text-navy-950">{title}</h2>
            {subtitle ? <p className="mt-3 text-sm leading-6 text-slate-600">{subtitle}</p> : null}
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-6">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}