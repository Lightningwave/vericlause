"use client";

import Link from "next/link";

type NavLink = {
  href: string;
  label: string;
};

type SiteNavbarProps = {
  links?: NavLink[];
  rightSlot?: React.ReactNode;
};

export function SiteNavbar({ links = [], rightSlot }: SiteNavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="font-sans text-lg font-medium tracking-tight text-navy-950">
            veri<span className="font-semibold">\</span>clause
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          {links.map((link) =>
            link.href.startsWith("#") ? (
              <a
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-navy-900"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-navy-900"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-4">{rightSlot}</div>
      </div>
    </header>
  );
}
