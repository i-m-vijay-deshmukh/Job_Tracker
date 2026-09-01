"use client";

import { useState } from "react";
import { X, Loader2, Paperclip, Link as LinkIcon } from "lucide-react";
import { JobCard, JobCardInput, JOB_STATUSES, STATUS_LABELS } from "@/lib/types";
import SkillsInput from "./SkillsInput";
import { uploadResume } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/client";

export default function JobForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: JobCard | null;
  onCancel: () => void;
  onSubmit: (input: JobCardInput) => Promise<void>;
}) {
  const [companyName, setCompanyName] = useState(initial?.company_name ?? "");
  const [jobTitle, setJobTitle] = useState(initial?.job_title ?? "");
  const [jobField, setJobField] = useState(initial?.job_field ?? "");
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [description, setDescription] = useState(initial?.job_description ?? "");
  const [status, setStatus] = useState(initial?.status ?? "Applied");
  const [interviewDate, setInterviewDate] = useState(
    initial?.interview_date?.slice(0, 10) ?? ""
  );
  const [resumeMode, setResumeMode] = useState<"link" | "file">(
    "link"
  );
  const [resumeUrl, setResumeUrl] = useState(initial?.resume_url ?? "");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      let finalResumeUrl = resumeUrl || null;

      if (resumeMode === "file" && resumeFile) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in.");
        finalResumeUrl = await uploadResume(resumeFile, user.id);
      }

      await onSubmit({
        company_name: companyName.trim(),
        job_title: jobTitle.trim(),
        job_field: jobField.trim() || null,
        skills,
        job_description: description.trim() || null,
        resume_url: finalResumeUrl,
        status,
        interview_date:
          status === "Interview" && interviewDate
            ? new Date(interviewDate).toISOString()
            : null,
      });
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-8 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-card border border-ink/10 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
          <h2 className="font-display text-lg font-medium">
            {initial ? "Edit application" : "Add application"}
          </h2>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="rounded-full p-1 text-ink/40 hover:bg-ink/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company name">
              <input
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                className="input"
              />
            </Field>
            <Field label="Job title">
              <input
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Frontend Engineer"
                className="input"
              />
            </Field>
          </div>

          <Field label="Job field / category">
            <input
              value={jobField}
              onChange={(e) => setJobField(e.target.value)}
              placeholder="Software Engineering"
              className="input"
            />
          </Field>

          <Field label="Required skills">
            <SkillsInput skills={skills} onChange={setSkills} />
          </Field>

          <Field label="Job description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the job description or key notes here..."
              rows={4}
              className="input resize-none"
            />
          </Field>

          <Field label="Resume">
            <div className="mb-2 flex gap-1 rounded-card bg-ink/5 p-1 text-xs">
              <button
                type="button"
                onClick={() => setResumeMode("link")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[4px] py-1.5 font-medium transition ${
                  resumeMode === "link" ? "bg-white shadow-sm" : "text-ink/50"
                }`}
              >
                <LinkIcon size={13} /> Link
              </button>
              <button
                type="button"
                onClick={() => setResumeMode("file")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[4px] py-1.5 font-medium transition ${
                  resumeMode === "file" ? "bg-white shadow-sm" : "text-ink/50"
                }`}
              >
                <Paperclip size={13} /> Upload
              </button>
            </div>
            {resumeMode === "link" ? (
              <input
                type="url"
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="input"
              />
            ) : (
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm file:mr-3 file:rounded-card file:border-0 file:bg-steel-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-steel-700"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as JobCard["status"])}
                className="input"
              >
                {JOB_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            {status === "Interview" && (
              <Field label="Interview date">
                <input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="input"
                />
              </Field>
            )}
          </div>

          {error && (
            <p className="rounded-card bg-status-rejected/10 px-3 py-2 text-xs text-status-rejected">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-card px-4 py-2 text-sm font-medium text-ink/60 hover:bg-ink/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-card bg-steel-500 px-4 py-2 text-sm font-medium text-white hover:bg-steel-600 disabled:opacity-60"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {initial ? "Save changes" : "Add application"}
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 6px;
          border: 1px solid rgba(27, 36, 48, 0.15);
          padding: 0.5rem 0.65rem;
          font-size: 0.875rem;
          background: white;
        }
        .input:focus {
          outline: none;
          border-color: #3d5a80;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-ink/70">{label}</span>
      {children}
    </label>
  );
}
