"use client";

import { useState } from "react";

export type AuthMode = "sign-in" | "sign-up";

export interface AuthFormValues {
  email: string;
  password: string;
}

export interface AuthFormProps {
  mode: AuthMode;
  onSubmit: (values: AuthFormValues) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
}

export function AuthForm({ mode, onSubmit, loading = false, error }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [internalLoading, setInternalLoading] = useState(false);

  const effectiveLoading = loading || internalLoading;
  const label = mode === "sign-in" ? "Sign In" : "Create Account";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInternalLoading(true);
    try {
      await onSubmit({ email, password });
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-navy-900">Email Address</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm px-3 py-2 border"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-navy-900">Password</label>
        <input
          type="password"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm px-3 py-2 border"
        />
      </div>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-100">{error}</div>}
      <button
        type="submit"
        disabled={effectiveLoading}
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-950 hover:bg-navy-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
      >
        {effectiveLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : label}
      </button>
    </form>
  );
}
