"use client";

import { useId } from "react";
import { STATUS_OPTIONS } from "@/lib/library";

// The status dropdown, shared so Explore/Library and the Backward
// Compatibility tab can't drift apart. `label` is optional: FilterBar wants
// the bare select (it sits inline with the other filter controls there),
// while the Backward Compatibility tab wants a label on top so this box
// matches the height of the labeled controls next to it, rather than
// looking short/undersized without one.
export function StatusFilterSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const id = useId();
  const select = (
    <select
      id={label ? id : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ${label ? "mt-1 block" : ""}`}
    >
      <option value="">All statuses</option>
      {STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (!label) return select;

  return (
    <div>
      <label className="text-xs text-zinc-400" htmlFor={id}>
        {label}
      </label>
      {select}
    </div>
  );
}
