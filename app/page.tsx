import Link from "next/link";
import { SiteNavbar } from "@/components/SiteNavbar";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  let isLoggedIn = false;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  } catch {
    // Supabase not configured — treat as not logged in
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteNavbar
        links={[
          { href: "#features", label: "Features" },
          { href: "#how-it-works", label: "How it works" },
          { href: "#faq", label: "FAQ" },
        ]}
        rightSlot={
          isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-navy-950 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-navy-800"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/sign-in"
                className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-navy-950 md:inline-block"
              >
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className="rounded-md bg-navy-950 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-navy-800"
              >
                Get Started
              </Link>
            </>
          )
        }
      />

      <main>
        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-gold-50/60 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-navy-950/[0.02] blur-3xl" />
          </div>

          <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 md:pt-28 md:pb-32">
            <div className="grid gap-16 md:grid-cols-2 md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-gold-200 bg-gold-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-gold-700 mb-6">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-pulse" />
                  Singapore Employment Law
                </div>
                <h1 className="font-serif text-4xl font-bold leading-[1.15] text-navy-950 md:text-5xl lg:text-[3.5rem]">
                  Know what you&apos;re signing{" "}
                  <span className="relative inline-block text-gold-600 italic">
                    before
                    <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 120 8" fill="none" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M2 5.5C20 2 40 2 60 4s40 2 56 -0.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
                    </svg>
                  </span>{" "}
                  it&apos;s too late.
                </h1>
                <p className="mt-6 text-lg leading-relaxed text-slate-600 md:max-w-md">
                  Upload your employment contract and get an instant compliance analysis grounded in the Singapore Employment Act, Workplace Fairness Act, and Tripartite Guidelines.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href={isLoggedIn ? "/dashboard" : "/auth/sign-up"}
                    className="rounded-md bg-navy-950 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-navy-800 hover:shadow-lg"
                  >
                    {isLoggedIn ? "Go to Dashboard" : "Analyze Your Contract"}
                  </Link>
                  {!isLoggedIn && (
                    <Link
                      href="/auth/sign-in"
                      className="group flex items-center gap-2 rounded-md border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:border-navy-200 hover:text-navy-950 transition-all"
                    >
                      Sign in
                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                        <path d="M4.167 10h11.666m0 0-4.166-4.167M15.833 10l-4.166 4.167" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  )}
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  Free to use. No legal advice provided.
                </p>
              </div>

              {/* Hero mockup */}
              <div className="relative hidden md:block">
                <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-gold-50 to-slate-50 -z-10 rotate-1" />
                <div className="rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/50 overflow-hidden">
                  {/* Mockup header */}
                  <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 bg-slate-50/80">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                      <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                      <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                    </div>
                    <div className="flex-1 mx-8">
                      <div className="mx-auto h-5 w-48 rounded bg-slate-100 flex items-center justify-center text-[9px] text-slate-400 font-medium tracking-wide">
                        vericlause.vercel.app/dashboard
                      </div>
                    </div>
                  </div>
                  {/* Mockup body */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-navy-950 flex items-center justify-center text-white font-serif text-xs font-bold">VC</div>
                        <div>
                          <p className="text-xs font-semibold text-navy-950">Compliance Report</p>
                          <p className="text-[10px] text-slate-400">Employment_Agreement.pdf</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-100">85%</div>
                        <div className="h-5 w-px bg-slate-200" />
                        <div className="text-[9px] font-medium text-slate-400 bg-slate-50 rounded px-2 py-0.5 border border-slate-100">EN / 中文 / தமிழ்</div>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 mb-4">
                      <div className="flex-1 rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-navy-950 text-center shadow-sm">Clause Analysis</div>
                      <div className="flex-1 rounded-md px-2 py-1 text-[10px] font-medium text-slate-400 text-center">Verdicts</div>
                      <div className="flex-1 rounded-md px-2 py-1 text-[10px] font-medium text-slate-400 text-center">Benchmark</div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="rounded-lg border-l-[3px] border-red-400 bg-red-50/50 p-3 border border-l-[3px] border-red-100">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Non-Compete Clause</p>
                          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-600">Violated</span>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-relaxed">24-month restriction exceeds reasonable duration under Tripartite Guidelines.</p>
                        <p className="text-[8px] text-slate-400 mt-1.5 font-medium">EA s88(1) | Tripartite Guidelines on NCC</p>
                      </div>
                      <div className="rounded-lg border-l-[3px] border-amber-400 bg-amber-50/50 p-3 border border-amber-100">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Retirement Age</p>
                          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">Caution</span>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-relaxed">Stated 62 years, statutory minimum is 64 as of July 2026.</p>
                      </div>
                      <div className="rounded-lg border-l-[3px] border-emerald-400 bg-emerald-50/30 p-3 border border-emerald-100 opacity-50">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Annual Leave</p>
                          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600">Compliant</span>
                        </div>
                        <div className="mt-2 h-1.5 w-3/4 bg-emerald-100 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Trusted by bar ─── */}
        <section className="border-y border-slate-100 bg-slate-50/50 py-8">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-xs font-medium uppercase tracking-widest text-slate-400">
              <span>Grounded in the Employment Act 1968</span>
              <span className="hidden md:inline text-slate-200">|</span>
              <span>Workplace Fairness Act</span>
              <span className="hidden md:inline text-slate-200">|</span>
              <span>Tripartite Guidelines</span>
              <span className="hidden md:inline text-slate-200">|</span>
              <span>Key Employment Terms</span>
            </div>
          </div>
        </section>

        {/* ─── Features ─── */}
        <section id="features" className="py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-14 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 mb-3">Capabilities</p>
              <h2 className="font-serif text-3xl font-bold text-navy-950 md:text-4xl">
                Everything you need to understand your contract
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Five tools working together to give you a complete picture of your employment terms.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M12 4v13m0-13 7 3.5L12 11 5 7.5 12 4Zm-7 3.5V16l7 4 7-4V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                  title: "Agentic Compliance Check",
                  desc: "Every clause verified against the Employment Act, Workplace Fairness Act, and Tripartite Guidelines using RAG with cited legal provisions.",
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M8 3.75h6.586a1 1 0 0 1 .707.293l3.664 3.664a1 1 0 0 1 .293.707V19.25A1.75 1.75 0 0 1 17.5 21h-9A1.75 1.75 0 0 1 6.75 19.25v-13.75A1.75 1.75 0 0 1 8.5 3.75Z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M14.75 3.75v4.5h4.5M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ),
                  title: "Smart PDF Extraction",
                  desc: "Powered by LlamaParse with OCR support. Extracts every clause, salary, notice period, and leave entitlement — even from scanned documents.",
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M3 12h18M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9Z" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  ),
                  title: "Verdict Translation",
                  desc: "Instantly translate your compliance report into Chinese or Tamil. Legal citations stay in English for accuracy.",
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2M15 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M12 3v18M9 9h6M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ),
                  title: "Contract Comparison",
                  desc: "Upload two contracts and compare them side-by-side. See which terms are better, worse, or equal — from the employee's perspective.",
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M7 17l4-8 4 4 5-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                  title: "Market Benchmark",
                  desc: "Score your salary, leave, and notice period against Singapore market ranges for your role. Know if your offer is above, at, or below market.",
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M16.5 10.5V8a4.5 4.5 0 1 0-9 0v2.5M8 10.5h8A1.5 1.5 0 0 1 17.5 12v6A1.5 1.5 0 0 1 16 19.5H8A1.5 1.5 0 0 1 6.5 18v-6A1.5 1.5 0 0 1 8 10.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                  title: "Privacy First",
                  desc: "PII redaction strips NRIC, names, and contact details before analysis. Your contract stays private.",
                },
              ].map((f, i) => (
                <div key={i} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-gold-200 hover:shadow-md">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-navy-950 text-white transition-colors group-hover:bg-gold-600">
                    {f.icon}
                  </div>
                  <h3 className="font-serif text-lg font-bold text-navy-950 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How it works ─── */}
        <section id="how-it-works" className="border-t border-slate-100 bg-slate-50 py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-14 text-center max-w-2xl mx-auto">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 mb-3">Process</p>
              <h2 className="font-serif text-3xl font-bold text-navy-950 md:text-4xl">
                Three steps to a complete analysis
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Upload your contract",
                  desc: "Drop in any employment contract PDF — printed, scanned, or digital. Our parser handles them all with OCR support.",
                },
                {
                  step: "02",
                  title: "AI cross-references the law",
                  desc: "An agentic RAG engine searches the Employment Act, Workplace Fairness Act, and Tripartite Guidelines to evaluate every clause.",
                },
                {
                  step: "03",
                  title: "Review your report",
                  desc: "Get a compliance score, clause-by-clause verdicts with legal citations, market benchmarks, and the option to translate into Chinese or Tamil.",
                },
              ].map((s, i) => (
                <div key={i} className="relative">
                  {i < 2 && (
                    <div className="hidden md:block absolute top-8 left-full w-full -ml-4 z-0">
                      <svg className="w-full h-4 text-slate-200" viewBox="0 0 200 16" fill="none" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M0 8h180M180 8l-8-6M180 8l-8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  <div className="relative z-10 rounded-xl border border-slate-200 bg-white p-6 h-full">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy-950 text-white font-serif font-bold text-lg">
                      {s.step}
                    </div>
                    <h3 className="font-serif text-lg font-bold text-navy-950 mb-2">{s.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Testimonial ─── */}
        <section className="py-20 md:py-24">
          <div className="mx-auto max-w-4xl px-6">
            <div className="relative rounded-2xl bg-navy-950 p-10 md:p-14 overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-gold-500/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-navy-700/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
              <div className="relative z-10">
                <svg className="h-8 w-8 text-gold-500/40 mb-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179Zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179Z" />
                </svg>
                <blockquote className="font-serif text-xl md:text-2xl italic leading-relaxed text-slate-200">
                  &ldquo;VeriClause caught a retirement age error and a non-compete clause that exceeded reasonable duration. The compliance report was clear, cited the exact statutes, and saved me a potentially costly conversation with HR.&rdquo;
                </blockquote>
                <div className="mt-8 flex items-center gap-4">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-serif font-bold text-sm">SL</div>
                  <div>
                    <p className="font-semibold text-white text-sm">Sarah Lim</p>
                    <p className="text-xs text-slate-400">Marketing Executive, Singapore</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section id="faq" className="border-t border-slate-100 bg-slate-50 py-20 md:py-24">
          <div className="mx-auto max-w-3xl px-6">
            <div className="mb-14 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 mb-3">FAQ</p>
              <h2 className="font-serif text-3xl font-bold text-navy-950 md:text-4xl">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-4">
              {[
                {
                  q: "Is this legal advice?",
                  a: "No. VeriClause is an informational tool that cross-references your contract against published statutes and guidelines. It does not constitute legal advice. For binding legal opinions, consult a qualified Singapore employment lawyer.",
                },
                {
                  q: "Which laws does VeriClause reference?",
                  a: "The Singapore Employment Act 1968 (Revised 2026), Employment Claims Act 2016, Workplace Fairness Act, Key Employment Terms requirements, and all current Tripartite Guidelines (wrongful dismissal, flexible work, re-employment, and more).",
                },
                {
                  q: "Is my contract data stored?",
                  a: "Uploaded PDFs are stored in an encrypted Supabase bucket tied to your account. You can delete your documents at any time. PII (NRIC, names, emails, phone numbers) is redacted before any AI processing.",
                },
                {
                  q: "What languages are supported?",
                  a: "Analysis is performed in English. You can translate the compliance verdicts and explanations into Chinese (中文) or Tamil (தமிழ்) with one click.",
                },
                {
                  q: "Can I compare two contracts?",
                  a: "Yes. The Compare feature lets you upload two contracts side-by-side and see a structured clause-by-clause comparison with an assessment of which terms are more favorable.",
                },
                {
                  q: "Does it work for other countries?",
                  a: "Currently VeriClause is purpose-built for Singapore employment law only.",
                },
              ].map((faq, i) => (
                <div key={i} className="rounded-xl bg-white p-6 border border-slate-200 shadow-sm">
                  <h4 className="font-serif font-bold text-navy-900 mb-2">{faq.q}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-24 px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-serif text-3xl font-bold text-navy-950 md:text-4xl mb-4">
              Ready to verify your contract?
            </h2>
            <p className="text-lg text-slate-600 mb-10 max-w-xl mx-auto leading-relaxed">
              Upload your employment contract and get a detailed compliance report in minutes — for free.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto rounded-md bg-navy-950 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-navy-800 hover:shadow-xl"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/sign-up"
                    className="w-full sm:w-auto rounded-md bg-navy-950 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-navy-800 hover:shadow-xl"
                  >
                    Create Free Account
                  </Link>
                  <Link
                    href="/auth/sign-in"
                    className="w-full sm:w-auto rounded-md border border-slate-200 bg-white px-8 py-3.5 text-base font-medium text-slate-700 hover:border-navy-200 hover:text-navy-950 transition-all"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-200 bg-navy-950 py-12 px-6 text-sm">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="font-sans text-lg font-medium tracking-tight text-white">
              veri<span className="font-semibold">\</span>clause
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded border border-slate-700 bg-navy-900 text-slate-400 font-medium uppercase tracking-wider">Beta</span>
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <span>Singapore Employment Law Compliance</span>
            <span className="hidden sm:inline text-slate-700">|</span>
            <span>© {new Date().getFullYear()} VeriClause</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
