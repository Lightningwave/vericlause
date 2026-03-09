import Link from "next/link";
import { SiteNavbar } from "@/components/SiteNavbar";

export default function HomePage() {
  const featureCards = [
    {
      title: "Statutory Ground Truth",
      desc: "RAG engine grounded exclusively in Singapore Statutes Online. Zero hallucinations.",
    },
    {
      title: "Intelligent Extraction",
      desc: "Instantly extracts salary, notice periods, and non-competes from complex PDFs.",
    },
    {
      title: "Session-Only Privacy",
      desc: "Your data exists in volatile memory only. Wiped instantly upon session end.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <SiteNavbar
        links={[
          { href: "#features", label: "Features" },
          { href: "#how-it-works", label: "How it works" },
          { href: "#faq", label: "FAQ" },
        ]}
        rightSlot={
          <>
            <Link
              href="/auth/sign-in"
              className="hidden text-sm font-medium text-slate-700 transition-colors hover:text-navy-950 md:inline-block"
            >
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-md border border-navy-950 bg-white px-5 py-2 text-sm font-medium text-navy-950 shadow-sm transition-all hover:bg-navy-950 hover:text-white"
            >
              Get Started
            </Link>
          </>
        }
      />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="grid gap-16 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600 mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-500"></span>
                Singapore Employment Law
              </div>
              <h1 className="font-serif text-4xl font-bold leading-tight text-navy-950 md:text-6xl lg:leading-tight">
                Know what you’re signing <span className="text-gold-600 italic">before</span> it’s too late.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-slate-600 md:max-w-lg">
                VeriClause instantly analyzes your employment contract against the Singapore Employment Act 1968 (Revised 2026). Identify risky clauses with precision.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/auth/sign-up"
                  className="rounded-md border border-navy-950 bg-white px-6 py-3 text-base font-medium text-navy-950 shadow-md transition-all hover:bg-navy-950 hover:text-white"
                >
                  Analyze Contract Free
                </Link>
                <Link
                  href="/dashboard"
                  className="group flex items-center gap-2 rounded-md border border-slate-200 bg-white px-6 py-3 text-base font-medium text-slate-700 hover:border-navy-200 hover:text-navy-950 transition-all"
                >
                  Try Demo
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4 text-gold-500 transition-transform group-hover:translate-x-0.5"
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
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Secure & Confidential. No legal advice provided.
              </p>
            </div>
            
            {/* Hero Visual */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-xl bg-gold-50/50 -z-10 rotate-2"></div>
              <div className="rounded-lg border border-slate-200 bg-white p-1 shadow-2xl">
                <div className="rounded border border-slate-100 bg-slate-50 p-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 font-serif font-bold">
                        VC
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-navy-950">Contract Analysis</p>
                        <p className="text-xs text-slate-500">Employment_Agreement_Final.pdf</p>
                      </div>
                    </div>
                    <div className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
                      Score: 85%
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="rounded border-l-4 border-amber-500 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">Clause 12.3: Retirement</p>
                      <p className="font-serif text-sm font-medium text-slate-800 mb-2">
                        “The Employee's retirement age shall be 62 years.”
                      </p>
                      <div className="text-xs text-slate-600 bg-amber-50 p-3 rounded">
                        <p className="mb-1"><span className="font-bold text-amber-700">Caution:</span> The statutory retirement age is <strong>64</strong> as of 1 July 2026.</p>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">Ref: Employment Act, Part IV</p>
                      </div>
                    </div>
                    
                    <div className="rounded border-l-4 border-emerald-500 bg-white p-4 shadow-sm opacity-60">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">Clause 4.1: Annual Leave</p>
                      <div className="h-2 w-3/4 bg-slate-200 rounded mb-2"></div>
                      <div className="h-2 w-1/2 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-slate-100 bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <h2 className="font-serif text-3xl font-bold text-navy-950 md:text-4xl">Precision Legal Tech</h2>
              <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
                Built for accuracy and privacy. We strictly follow the letter of the law.
              </p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3">
              {featureCards.map((f, i) => (
                <div key={i} className="group rounded-lg border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-sm border border-gold-200 bg-gold-50 text-navy-950">
                    {i === 0 && (
                      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                        <path d="M12 4v13m0-13 7 3.5L12 11 5 7.5 12 4Zm-7 3.5V16l7 4 7-4V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {i === 1 && (
                      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                        <path d="M8 3.75h6.586a1 1 0 0 1 .707.293l3.664 3.664a1 1 0 0 1 .293.707V19.25A1.75 1.75 0 0 1 17.5 21h-9A1.75 1.75 0 0 1 6.75 19.25v-13.75A1.75 1.75 0 0 1 8.5 3.75Z" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M14.75 3.75v4.5h4.5M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                    {i === 2 && (
                      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                        <path d="M16.5 10.5V8a4.5 4.5 0 1 0-9 0v2.5M8 10.5h8A1.5 1.5 0 0 1 17.5 12v6A1.5 1.5 0 0 1 16 19.5H8A1.5 1.5 0 0 1 6.5 18v-6A1.5 1.5 0 0 1 8 10.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <h3 className="font-serif text-xl font-bold text-navy-950 mb-3 group-hover:text-gold-600 transition-colors">{f.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-20 mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-serif text-3xl font-bold text-navy-950 mb-6">How VeriClause works</h2>
              <div className="space-y-8">
                {[
                  { step: "01", title: "Upload Contract", desc: "Securely upload your PDF. We handle scanned docs via LlamaParse." },
                  { step: "02", title: "Automated Analysis", desc: "Our engine cross-references clauses against 2026 mandates." },
                  { step: "03", title: "Review Report", desc: "Get a clear compliance scorecard with actionable red flags." }
                ].map((s, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full border border-navy-100 bg-white text-navy-950 font-serif font-bold text-lg shadow-sm">
                      {s.step}
                    </div>
                    <div>
                      <h4 className="font-bold text-navy-900 text-lg">{s.title}</h4>
                      <p className="text-slate-600 text-sm mt-1">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-navy-950 rounded-lg p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-gold-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <blockquote className="relative z-10 font-serif text-xl italic leading-relaxed text-slate-200">
                "The most accurate compliance tool I've used. It caught a holiday entitlement error that would have cost me days of leave."
              </blockquote>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-700"></div>
                <div>
                  <p className="font-semibold text-white text-sm">Sarah Lim.</p>
                  <p className="text-xs text-slate-400">Marketing Executive, Singapore</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-slate-50 py-20 border-t border-slate-200">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="font-serif text-3xl font-bold text-center text-navy-950 mb-12">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {[
                { q: "Is this legal advice?", a: "No. VeriClause provides information based on statutes but cannot replace a qualified lawyer." },
                { q: "Do you store my contracts?", a: "No. We use session-only memory. Once you close the tab, your data is permanently wiped." },
                { q: "Does it work for other countries?", a: "Currently, VeriClause is specialized strictly for Singapore Employment Law." }
              ].map((faq, i) => (
                <div key={i} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-navy-900 mb-2">{faq.q}</h4>
                  <p className="text-sm text-slate-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6 bg-white">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-serif text-4xl font-bold text-navy-950 mb-6">Ready to verify your contract?</h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              Join hundreds of Singaporean professionals ensuring their rights are protected.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/sign-up"
                className="w-full sm:w-auto rounded-md border border-navy-950 bg-white px-8 py-3.5 text-base font-medium text-navy-950 shadow-lg transition-all hover:bg-navy-950 hover:text-white"
              >
                Create Free Account
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto rounded-md border border-slate-300 bg-white px-8 py-3.5 text-base font-medium text-slate-700 hover:bg-slate-50 transition-all"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-navy-950 py-12 px-6 text-slate-400 text-sm">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-bold text-white">VeriClause</span>
            <span className="text-xs px-2 py-0.5 rounded border border-slate-700 bg-navy-900">Beta</span>
          </div>
          <p>© {new Date().getFullYear()} VeriClause. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
