"use client";

import { Briefcase, LogOut, Plus, FileEdit } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function Navbar({
  userEmail,
  onAddNew,
  onOpenResumeText,
}: {
  userEmail?: string | null;
  onAddNew: () => void;
  onOpenResumeText: () => void;
}) {
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    // Full reload (not router.replace) so all client state, cached data,
    // and in-memory forms are wiped clean on logout.
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-card bg-steel-500 text-paper">
            <Briefcase size={16} />
          </span>
          <span className="font-display text-lg font-medium">Job Tracker</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenResumeText}
            aria-label="Edit resume text for AI matching"
            className="hidden items-center gap-1.5 rounded-card border border-ink/15 px-3 py-2 text-sm font-medium text-ink/70 hover:bg-ink/5 sm:flex"
          >
            <FileEdit size={15} />
            Resume text
          </button>
          <button
            onClick={onAddNew}
            className="flex items-center gap-1.5 rounded-card bg-steel-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-steel-600"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Add application</span>
          </button>
          <div className="hidden items-center gap-2 border-l border-ink/10 pl-3 sm:flex">
            <span className="max-w-[160px] truncate text-sm text-ink/50">
              {userEmail}
            </span>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="rounded-card p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}