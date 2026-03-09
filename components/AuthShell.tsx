"use client";

import { SiteNavbar } from "@/components/SiteNavbar";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <SiteNavbar
        links={[
          { href: "/", label: "Home" },
          { href: "/dashboard", label: "Dashboard" },
        ]}
      />

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mb-3 text-base font-medium tracking-tight text-navy-950">
              veri<span className="font-semibold">\</span>clause
            </div>
            <h1 className="font-serif text-2xl font-bold text-navy-950">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
          </div>
          {children}
          {footer && <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
