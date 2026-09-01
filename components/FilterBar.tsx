"use client";

import { JobFilters, JOB_STATUSES, STATUS_LABELS } from "@/lib/types";
import { SlidersHorizontal } from "lucide-react";

export default function FilterBar({
  filters,
  fields,
  skills,
  onChange,
}: {
  filters: JobFilters;
  fields: string[];
  skills: string[];
  onChange: (filters: JobFilters) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-ink/40">
        <SlidersHorizontal size={13} />
        Filter
      </span>

      <select
        value={filters.status}
        onChange={(e) =>
          onChange({ ...filters, status: e.target.value as JobFilters["status"] })
        }
        className="filter-select"
      >
        <option value="All">All statuses</option>
        {JOB_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      <select
        value={filters.field}
        onChange={(e) => onChange({ ...filters, field: e.target.value })}
        className="filter-select"
      >
        <option value="All">All fields</option>
        {fields.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      <select
        value={filters.skill}
        onChange={(e) => onChange({ ...filters, skill: e.target.value })}
        className="filter-select"
      >
        <option value="All">All skills</option>
        {skills.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <style jsx global>{`
        .filter-select {
          border: 1px solid rgba(27, 36, 48, 0.15);
          border-radius: 6px;
          padding: 0.4rem 0.6rem;
          font-size: 0.8125rem;
          background: white;
          color: #1b2430;
        }
        .filter-select:focus {
          outline: none;
          border-color: #3d5a80;
        }
      `}</style>
    </div>
  );
}
