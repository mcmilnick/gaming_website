"use client";

import { STATUS_OPTIONS } from "@/lib/library";

// The bare status dropdown - no label above it, on purpose, matching how it
// first appeared in FilterBar. Pulled out so Explore/Library and the
// Backward Compatibility tab share the exact same control instead of each
// keeping their own copy that could quietly drift apart.
export function StatusFilterSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
    >
      <option value="">All statuses</option>
      {STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
