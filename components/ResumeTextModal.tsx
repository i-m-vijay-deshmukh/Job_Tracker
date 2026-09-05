"use client";

import { useEffect, useState } from "react";
import { X, Loader2, FileEdit } from "lucide-react";
import { getMyResumeText, saveMyResumeText } from "@/lib/profile";

export default function ResumeTextModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const existing = await getMyResumeText();
        setText(existing);
      } catch (err: any) {
        setError(err.message ?? "Could not load your saved resume text.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await saveMyResumeText(text);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message ?? "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-8 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-card border border-ink/10 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium">
            <FileEdit size={18} className="text-steel-500" />
            Your resume text
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-ink/40 hover:bg-ink/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 px-6 py-5">
          <p className="text-sm text-ink/60">
            Paste your resume as plain text here once. It's saved to your account
            and reused every time you ask for an AI match score on a job — no
            need to paste it again.
          </p>

          {loading ? (
            <div className="flex justify-center py-10 text-ink/40">
              <Loader2 className="animate-spin" size={18} />
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder="Paste your resume text here..."
              className="w-full resize-none rounded-card border border-ink/15 px-3 py-2 text-sm outline-none focus:border-steel-500"
            />
          )}

          {error && (
            <p className="rounded-card bg-status-rejected/10 px-3 py-2 text-xs text-status-rejected">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-ink/10 px-6 py-4">
          {saved && <span className="text-xs text-status-offer">Saved</span>}
          <button
            onClick={onClose}
            className="rounded-card px-4 py-2 text-sm font-medium text-ink/60 hover:bg-ink/5"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-card bg-steel-500 px-4 py-2 text-sm font-medium text-white hover:bg-steel-600 disabled:opacity-60"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
