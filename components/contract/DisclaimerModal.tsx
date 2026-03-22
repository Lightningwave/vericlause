"use client";

import { useState, useEffect } from "react";

const DISCLAIMER_KEY = "vericlause_disclaimer_accepted";

export function useDisclaimerAccepted(): [boolean, () => void] {
  const [isAccepted, setIsAccepted] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    // Check storage on mount
    try {
      const stored = sessionStorage.getItem(DISCLAIMER_KEY);
      if (stored === "1") {
        setIsAccepted(true);
      }
    } catch (e) {
      console.error("Failed to access sessionStorage:", e);
    } finally {
      setIsChecked(true);
    }
  }, []);

  const accept = () => {
    try {
      sessionStorage.setItem(DISCLAIMER_KEY, "1");
    } catch (e) {
      console.error("Failed to write to sessionStorage:", e);
    }
    setIsAccepted(true);
  };

  // Return false initially (to ensure we don't flash content before checking)
  // We can return a loading state if we want, but for now boolean is fine.
  // If we haven't checked yet, we assume not accepted, but we might want to handle 'loading' in the parent.
  // For the boolean interface: false means "show disclaimer".
  
  // If we return false while loading, the disclaimer shows briefly then disappears if accepted.
  // This is acceptable or we can export isChecked to show a spinner.
  
  return [isAccepted, accept];
}

export function DisclaimerModal({
  accepted,
  onAccept,
}: {
  accepted: boolean;
  onAccept: () => void;
}) {
  const [checked, setChecked] = useState(false);
  
  // If already accepted, render nothing
  if (accepted) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/80 p-4 backdrop-blur-sm font-sans animate-in fade-in duration-200">
      <div className="max-w-md w-full rounded-lg border border-slate-200 bg-white p-8 shadow-2xl">
        <div className="mb-4 flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 text-amber-600 mx-auto">
          <span className="text-xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-serif font-bold text-center text-navy-950 mb-2">Legal Disclaimer</h2>
        <div className="text-slate-600 text-sm leading-relaxed text-center mb-6">
          <p>
            VeriClause is an automated compliance checking tool. It does <strong>not</strong> constitute legal advice or create a lawyer-client relationship.
          </p>
          <p className="mt-2">
            Always consult a qualified Singapore lawyer for professional advice regarding your employment contract.
          </p>
        </div>
        
        <label className="flex items-start gap-3 rounded-md bg-slate-50 p-3 cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy-900 focus:ring-navy-500"
          />
          <span className="text-xs font-medium text-slate-700 select-none">
            I understand that this tool is for informational purposes only and I agree to the terms.
          </span>
        </label>
        
        <button
          type="button"
          onClick={onAccept}
          disabled={!checked}
          className={`mt-6 w-full rounded-md px-4 py-2.5 text-sm font-medium shadow-sm transition-all ${
            checked
              ? "bg-navy-950 text-white hover:bg-navy-900"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          Acknowledge & Continue
        </button>
      </div>
    </div>
  );
}
