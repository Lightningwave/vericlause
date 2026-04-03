"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function BusinessRequestPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b88a44]">
            Request Submitted
          </p>

          <h1 className="mt-4 text-3xl font-semibold text-navy-950">
            Thank you for your interest
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            Your request has been received. Our sales team will contact you within 2 working days.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-navy-950 px-5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Back to Pricing
            </Link>

            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-3xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b88a44]">
          Business Plan
        </p>

        <h1 className="mt-4 text-3xl font-semibold text-navy-950">
          Request Business access
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          Tell us a bit about your team and usage needs. Our sales team will contact you within 2 working days.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-1">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              type="text"
              required
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
              placeholder="Enter your full name"
            />
          </div>

          <div className="md:col-span-1">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Work email
            </label>
            <input
              type="email"
              required
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
              placeholder="name@company.com"
            />
          </div>

          <div className="md:col-span-1">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Company name
            </label>
            <input
              type="text"
              required
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
              placeholder="Enter company name"
            />
          </div>

          <div className="md:col-span-1">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Team size
            </label>
            <select
              required
              defaultValue=""
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="" disabled>
                Select team size
              </option>
              <option>1–5</option>
              <option>6–20</option>
              <option>21–50</option>
              <option>51–200</option>
              <option>200+</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Expected monthly contract volume
            </label>
            <input
              type="text"
              required
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
              placeholder="For example: 50 contracts per month"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              rows={5}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              placeholder="Tell us about your use case, workflow, or support needs"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-navy-950 px-5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Submit Request
            </button>

            <Link
              href="/pricing"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to Pricing
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}