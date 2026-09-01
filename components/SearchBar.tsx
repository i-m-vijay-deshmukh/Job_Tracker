"use client";

import { Search, X } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-card border border-ink/15 bg-white px-3 py-2 focus-within:border-steel-500">
      <Search size={16} className="text-ink/40" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title or company..."
        className="w-full bg-transparent text-sm outline-none placeholder:text-ink/35"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="text-ink/30 hover:text-ink/60"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
