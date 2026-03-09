"use client";

import { useState } from "react";

export interface OnboardingData {
  monthly_basic_salary: number;
  work_type: "office" | "manual";
}

export function OnboardingForm({
  onSubmit,
  initialSalary,
  initialWorkType,
}: {
  onSubmit: (data: OnboardingData) => void;
  initialSalary?: number;
  initialWorkType?: "office" | "manual";
}) {
  const [salary, setSalary] = useState(initialSalary?.toString() ?? "");
  const [workType, setWorkType] = useState<"office" | "manual">(initialWorkType ?? "office");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(salary);
    if (Number.isNaN(num) || num < 0) {
      onSubmit({ monthly_basic_salary: 0, work_type: workType });
      return;
    }
    onSubmit({ monthly_basic_salary: num, work_type: workType });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="font-serif text-lg font-bold text-navy-950">Context (Optional)</h3>
      <p className="mt-1 text-sm text-slate-500 mb-6">
        Providing this helps, but isn't required for the analysis.
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-navy-900 mb-1">Monthly Basic Salary (SGD)</label>
          <div className="relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-slate-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              min={0}
              step={100}
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className="block w-full rounded-md border-slate-300 pl-7 focus:border-navy-500 focus:ring-navy-500 sm:text-sm py-2"
              placeholder="0.00"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-navy-900 mb-1">Work Type</label>
          <select
            value={workType}
            onChange={(e) => setWorkType(e.target.value as "office" | "manual")}
            className="block w-full rounded-md border-slate-300 focus:border-navy-500 focus:ring-navy-500 sm:text-sm py-2"
          >
            <option value="office">Office-based / Non-workman</option>
            <option value="manual">Manual / Workman</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="mt-6 w-full rounded-md bg-navy-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-navy-900 transition-colors"
      >
        Continue to Upload
      </button>
    </form>
  );
}
