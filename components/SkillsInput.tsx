"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

export default function SkillsInput({
  skills,
  onChange,
}: {
  skills: string[];
  onChange: (skills: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const value = draft.trim();
    if (value && !skills.includes(value)) {
      onChange([...skills, value]);
    }
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && skills.length > 0) {
      onChange(skills.slice(0, -1));
    }
  }

  function removeSkill(skill: string) {
    onChange(skills.filter((s) => s !== skill));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-card border border-ink/15 px-2.5 py-2 focus-within:border-steel-500">
      {skills.map((skill) => (
        <span
          key={skill}
          className="flex items-center gap-1 rounded-full bg-steel-50 px-2.5 py-1 text-xs font-medium text-steel-700"
        >
          {skill}
          <button
            type="button"
            onClick={() => removeSkill(skill)}
            aria-label={`Remove ${skill}`}
            className="text-steel-500 hover:text-steel-700"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        placeholder={skills.length === 0 ? "Add a skill and press Enter" : ""}
        className="min-w-[100px] flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-ink/30"
      />
    </div>
  );
}
