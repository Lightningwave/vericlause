import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b88a44]">
          Checkout Cancelled
        </p>

        <h1 className="mt-4 text-3xl font-semibold text-navy-950">
          No worries, your plan was not changed
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-600">
          You can return to pricing anytime and start again when you are ready.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="/pricing"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-navy-950 px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Back to Pricing
          </Link>
        </div>
      </div>
    </main>
  );
}