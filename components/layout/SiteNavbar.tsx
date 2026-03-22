"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import LanguageSwitcher from "./language-switcher";
import { useLanguage } from "../providers/language-provider";

type NavSubItem = {
  href: string;
  label: string;
};

type NavGroup = {
  href: string;
  label: string;
  items?: NavSubItem[];
};

type SiteNavbarProps = {
  rightSlot?: React.ReactNode;
  compact?: boolean;
};

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SiteNavbar({ rightSlot, compact = false }: SiteNavbarProps) {
  const { t } = useLanguage();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);

  const navGroups = useMemo<NavGroup[]>(
    () => [
      {
        href: "/",
        label: "nav_home",
      },
      {
        href: "/resume",
        label: "nav_resume",
        items: [
  { href: "/resume", label: "nav_resume_review" },
  { href: "/resume/voice", label: "nav_voice_resume" },
  { href: "/resume/builder", label: "nav_resume_builder" },
  { href: "/jobs", label: "nav_job_matching" },
],
      },
      {
        href: "/contract",
        label: "nav_contracts",
        items: [
          { href: "/contract", label: "nav_contract_analysis" },
          { href: "/contract/compare", label: "nav_compare_contracts" },
        ],
      },
      {
        href: "/interview",
        label: "nav_interview",
      },
    ],
    [],
  );

  function isPathActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function isGroupActive(group: NavGroup) {
    if (!group.items?.length) {
      return isPathActive(group.href);
    }

    return group.items.some((item) => isPathActive(item.href));
  }

  function topLinkClasses(active: boolean) {
    return [
      "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-all",
      active
        ? "bg-navy-950 text-white"
        : "text-slate-600 hover:bg-slate-100 hover:text-navy-950",
    ].join(" ");
  }

  function subLinkClasses(active: boolean) {
    return [
      "block rounded-md px-3 py-2 text-sm transition-all",
      active
        ? "bg-slate-100 font-medium text-navy-950"
        : "text-slate-600 hover:bg-slate-50 hover:text-navy-950",
    ].join(" ");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className={`flex items-center justify-between ${compact ? "py-3" : "py-4"}`}>
          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={() => setMobileOpen(false)}
          >
            <span className="font-sans text-lg font-semibold tracking-tight text-navy-950 sm:text-xl">
              veri<span className="font-bold">\</span>clause
            </span>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {navGroups.map((group) => {
              const active = isGroupActive(group);

              if (!group.items?.length) {
                return (
                  <Link key={group.label} href={group.href} className={topLinkClasses(active)}>
                    <span>{t(group.label)}</span>
                  </Link>
                );
              }

              return (
                <div key={group.label} className="group relative">
                  <Link href={group.href} className={topLinkClasses(active)}>
                    <span>{t(group.label)}</span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </Link>

                  <div className="invisible absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
                    <div className="flex flex-col gap-1">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={subLinkClasses(isPathActive(item.href))}
                        >
                          {t(item.label)}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSwitcher />
            {rightSlot}
          </div>

          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-50 lg:hidden"
          >
            {mobileOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-200 py-4 lg:hidden">
            <nav className="flex flex-col gap-2">
              {navGroups.map((group) => {
                const active = isGroupActive(group);
                const expanded = openMobileGroup === group.label;

                if (!group.items?.length) {
                  return (
                    <Link
                      key={group.label}
                      href={group.href}
                      className={topLinkClasses(active)}
                      onClick={() => setMobileOpen(false)}
                    >
                      {t(group.label)}
                    </Link>
                  );
                }

                return (
                  <div key={group.label} className="rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between p-2">
                      <Link
                        href={group.href}
                        className={topLinkClasses(active)}
                        onClick={() => setMobileOpen(false)}
                      >
                        {t(group.label)}
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          setOpenMobileGroup((prev) =>
                            prev === group.label ? null : group.label,
                          )
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                        aria-label={`Toggle ${t(group.label)} submenu`}
                      >
                        <ChevronDownIcon
                          className={`h-4 w-4 transition-transform ${
                            expanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>

                    {expanded && (
                      <div className="border-t border-slate-200 p-2">
                        <div className="flex flex-col gap-1">
                          {group.items.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={subLinkClasses(isPathActive(item.href))}
                              onClick={() => setMobileOpen(false)}
                            >
                              {t(item.label)}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4">
              <div className="w-fit">
                <LanguageSwitcher />
              </div>
              {rightSlot}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}