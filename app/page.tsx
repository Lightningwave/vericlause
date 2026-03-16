"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteNavbar } from "@/components/SiteNavbar";
import { useLanguage } from "@/components/providers/language-provider";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const { t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsLoggedIn(!!user);
      } catch {
        setIsLoggedIn(false);
      }
    }

    loadUser();
  }, []);

  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M12 4v13m0-13 7 3.5L12 11 5 7.5 12 4Zm-7 3.5V16l7 4 7-4V7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      title: t("feature_1_title"),
      desc: t("feature_1_desc"),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M8 3.75h6.586a1 1 0 0 1 .707.293l3.664 3.664a1 1 0 0 1 .293.707V19.25A1.75 1.75 0 0 1 17.5 21h-9A1.75 1.75 0 0 1 6.75 19.25v-13.75A1.75 1.75 0 0 1 8.5 3.75Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M14.75 3.75v4.5h4.5M9 12h6M9 15h6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
      title: t("feature_2_title"),
      desc: t("feature_2_desc"),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M3 12h18M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      ),
      title: t("feature_3_title"),
      desc: t("feature_3_desc"),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2M15 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M12 3v18M9 9h6M9 12h6M9 15h6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
      title: t("feature_4_title"),
      desc: t("feature_4_desc"),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M3 3v18h18"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 17l4-8 4 4 5-10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      title: t("feature_5_title"),
      desc: t("feature_5_desc"),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M16.5 10.5V8a4.5 4.5 0 1 0-9 0v2.5M8 10.5h8A1.5 1.5 0 0 1 17.5 12v6A1.5 1.5 0 0 1 16 19.5H8A1.5 1.5 0 0 1 6.5 18v-6A1.5 1.5 0 0 1 8 10.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      title: t("feature_6_title"),
      desc: t("feature_6_desc"),
    },
  ];

  const steps = [
    {
      step: "01",
      title: t("step_1_title"),
      desc: t("step_1_desc"),
    },
    {
      step: "02",
      title: t("step_2_title"),
      desc: t("step_2_desc"),
    },
    {
      step: "03",
      title: t("step_3_title"),
      desc: t("step_3_desc"),
    },
  ];

  const faqs = [
    {
      q: t("faq_1_q"),
      a: t("faq_1_a"),
    },
    {
      q: t("faq_2_q"),
      a: t("faq_2_a"),
    },
    {
      q: t("faq_3_q"),
      a: t("faq_3_a"),
    },
    {
      q: t("faq_4_q"),
      a: t("faq_4_a"),
    },
    {
      q: t("faq_5_q"),
      a: t("faq_5_a"),
    },
    {
      q: t("faq_6_q"),
      a: t("faq_6_a"),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <SiteNavbar
        links={[
          { href: "#features", label: "nav_features" },
          { href: "#how-it-works", label: "nav_how_it_works" },
          { href: "#faq", label: "nav_faq" },
        ]}
        rightSlot={
          isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-navy-950 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-navy-800"
            >
              {t("dashboard")}
            </Link>
          ) : (
            <>
              <Link
                href="/auth/sign-in"
                className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-navy-950 md:inline-block"
              >
                {t("sign_in")}
              </Link>
              <Link
                href="/auth/sign-up"
                className="rounded-md bg-navy-950 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-navy-800"
              >
                {t("nav_get_started")}
              </Link>
            </>
          )
        }
      />

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gold-50/60 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-navy-950/[0.02] blur-3xl" />
          </div>

          <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pb-32 md:pt-28">
            <div className="grid gap-16 md:grid-cols-2 md:items-center">
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-200 bg-gold-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-gold-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-500" />
                  {t("hero_badge")}
                </div>

                <h1 className="font-serif text-4xl font-bold leading-[1.15] text-navy-950 md:text-5xl lg:text-[3.5rem]">
                  {t("hero_title")}
                </h1>

                <p className="mt-6 text-lg leading-relaxed text-slate-600 md:max-w-md">
                  {t("hero_description")}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href={isLoggedIn ? "/dashboard" : "/auth/sign-up"}
                    className="rounded-md bg-navy-950 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-navy-800 hover:shadow-lg"
                  >
                    {isLoggedIn ? t("dashboard") : t("hero_primary_cta")}
                  </Link>

                  {!isLoggedIn && (
                    <Link
                      href="/auth/sign-in"
                      className="group flex items-center gap-2 rounded-md border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950"
                    >
                      {t("hero_secondary_cta")}
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      >
                        <path
                          d="M4.167 10h11.666m0 0-4.166-4.167M15.833 10l-4.166 4.167"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                  )}
                </div>

                <p className="mt-4 text-xs text-slate-400">{t("hero_note")}</p>
              </div>

              <div className="relative hidden md:block">
                <div className="-z-10 absolute -inset-4 rotate-1 rounded-2xl bg-gradient-to-br from-gold-50 to-slate-50" />
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/50">
                  <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                      <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                      <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                    </div>
                    <div className="mx-8 flex-1">
                      <div className="mx-auto flex h-5 w-48 items-center justify-center rounded bg-slate-100 text-[9px] font-medium tracking-wide text-slate-400">
                        vericlause.vercel.app/dashboard
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-950 font-serif text-xs font-bold text-white">
                          VC
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-navy-950">
                            Compliance Report
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Employment_Agreement.pdf
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                          85%
                        </div>
                        <div className="h-5 w-px bg-slate-200" />
                        <div className="rounded border border-slate-100 bg-slate-50 px-2 py-0.5 text-[9px] font-medium text-slate-400">
                          EN / 中文 / தமிழ்
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-0.5">
                      <div className="flex-1 rounded-md bg-white px-2 py-1 text-center text-[10px] font-semibold text-navy-950 shadow-sm">
                        Clause Analysis
                      </div>
                      <div className="flex-1 rounded-md px-2 py-1 text-center text-[10px] font-medium text-slate-400">
                        Verdicts
                      </div>
                      <div className="flex-1 rounded-md px-2 py-1 text-center text-[10px] font-medium text-slate-400">
                        Benchmark
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="rounded-lg border border-red-100 border-l-[3px] border-l-red-400 bg-red-50/50 p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                            Non-Compete Clause
                          </p>
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-red-600">
                            Violated
                          </span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-slate-600">
                          24-month restriction exceeds reasonable duration under
                          Tripartite Guidelines.
                        </p>
                        <p className="mt-1.5 text-[8px] font-medium text-slate-400">
                          EA s88(1) | Tripartite Guidelines on NCC
                        </p>
                      </div>

                      <div className="rounded-lg border border-amber-100 border-l-[3px] border-l-amber-400 bg-amber-50/50 p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                            Retirement Age
                          </p>
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-600">
                            Caution
                          </span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-slate-600">
                          Stated 62 years, statutory minimum is 64 as of July 2026.
                        </p>
                      </div>

                      <div className="rounded-lg border border-emerald-100 border-l-[3px] border-l-emerald-400 bg-emerald-50/30 p-3 opacity-50">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            Annual Leave
                          </p>
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-600">
                            Compliant
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-3/4 rounded bg-emerald-100" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50/50 py-8">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-xs font-medium uppercase tracking-widest text-slate-400">
              <span>{t("trust_employment_act")}</span>
              <span className="hidden text-slate-200 md:inline">|</span>
              <span>{t("trust_workplace_fairness")}</span>
              <span className="hidden text-slate-200 md:inline">|</span>
              <span>{t("trust_tripartite")}</span>
              <span className="hidden text-slate-200 md:inline">|</span>
              <span>{t("trust_key_terms")}</span>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-14 max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold-600">
                {t("section_capabilities_badge")}
              </p>
              <h2 className="font-serif text-3xl font-bold text-navy-950 md:text-4xl">
                {t("section_capabilities_title")}
              </h2>
              <p className="mt-4 leading-relaxed text-slate-600">
                {t("section_capabilities_description")}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-gold-200 hover:shadow-md"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-navy-950 text-white transition-colors group-hover:bg-gold-600">
                    {f.icon}
                  </div>
                  <h3 className="mb-2 font-serif text-lg font-bold text-navy-950">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-t border-slate-100 bg-slate-50 py-20 md:py-24"
        >
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold-600">
                {t("process_badge")}
              </p>
              <h2 className="font-serif text-3xl font-bold text-navy-950 md:text-4xl">
                {t("process_title")}
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((s, i) => (
                <div key={i} className="relative">
                  {i < 2 && (
                    <div className="absolute left-full top-8 z-0 hidden w-full -ml-4 md:block">
                      <svg
                        className="h-4 w-full text-slate-200"
                        viewBox="0 0 200 16"
                        fill="none"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M0 8h180M180 8l-8-6M180 8l-8 6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="relative z-10 h-full rounded-xl border border-slate-200 bg-white p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy-950 font-serif text-lg font-bold text-white">
                      {s.step}
                    </div>
                    <h3 className="mb-2 font-serif text-lg font-bold text-navy-950">
                      {s.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24">
          <div className="mx-auto max-w-4xl px-6">
            <div className="relative overflow-hidden rounded-2xl bg-navy-950 p-10 md:p-14">
              <div className="absolute right-0 top-0 h-72 w-72 translate-x-1/3 -translate-y-1/3 rounded-full bg-gold-500/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/4 translate-y-1/2 rounded-full bg-navy-700/30 blur-3xl" />
              <div className="relative z-10">
                <svg
                  className="mb-6 h-8 w-8 text-gold-500/40"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179Zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179Z" />
                </svg>
                <blockquote className="font-serif text-xl italic leading-relaxed text-slate-200 md:text-2xl">
                  &ldquo;{t("testimonial_quote")}&rdquo;
                </blockquote>
                <div className="mt-8 flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 font-serif text-sm font-bold text-white">
                    SL
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {t("testimonial_name")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t("testimonial_role")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-slate-100 bg-slate-50 py-20 md:py-24">
          <div className="mx-auto max-w-3xl px-6">
            <div className="mb-14 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold-600">
                {t("nav_faq")}
              </p>
              <h2 className="font-serif text-3xl font-bold text-navy-950 md:text-4xl">
                {t("faq_title")}
              </h2>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h4 className="mb-2 font-serif font-bold text-navy-900">{faq.q}</h4>
                  <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 font-serif text-3xl font-bold text-navy-950 md:text-4xl">
              {t("cta_title")}
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-slate-600">
              {t("cta_description")}
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="w-full rounded-md bg-navy-950 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-navy-800 hover:shadow-xl sm:w-auto"
                >
                  {t("dashboard")}
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/sign-up"
                    className="w-full rounded-md bg-navy-950 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-navy-800 hover:shadow-xl sm:w-auto"
                  >
                    {t("cta_create_account")}
                  </Link>
                  <Link
                    href="/auth/sign-in"
                    className="w-full rounded-md border border-slate-200 bg-white px-8 py-3.5 text-base font-medium text-slate-700 transition-all hover:border-navy-200 hover:text-navy-950 sm:w-auto"
                  >
                    {t("sign_in")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-navy-950 px-6 py-12 text-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <span className="font-sans text-lg font-medium tracking-tight text-white">
              veri<span className="font-semibold">\</span>clause
            </span>
            <span className="rounded border border-slate-700 bg-navy-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <span>{t("footer_tagline")}</span>
            <span className="hidden text-slate-700 sm:inline">|</span>
            <span>© {new Date().getFullYear()} VeriClause</span>
          </div>
        </div>
      </footer>
    </div>
  );
}