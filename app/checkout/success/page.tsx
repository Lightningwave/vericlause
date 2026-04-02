import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b88a44]">
          Payment Successful
        </p>

        <h1 className="mt-4 text-3xl font-semibold text-navy-950">
          Your Pro plan is now active
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-600">
          Thank you for subscribing to VeriClause Pro. You can now return to your dashboard and continue using the platform.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-navy-950 px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Go to Home
          </Link>

          <Link
            href="/pricing"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Pricing
          </Link>
        </div>
      </div>
    </main>
  );
}