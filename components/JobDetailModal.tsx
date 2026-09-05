"use client";

import { useState } from "react";
import {
  X,
  Pencil,
  Trash2,
  FileText,
  Calendar,
  CalendarPlus,
  Loader2,
  IndianRupee,
  Building2,
  Tag,
  BellRing,
  Sparkles,
} from "lucide-react";
import { JobCard, JobStatus } from "@/lib/types";
import {
  formatDate,
  formatRupees,
  isStale,
  daysSince,
  downloadInterviewICS,
} from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import { getResumeUrl } from "@/lib/jobs";
import { getMyResumeText } from "@/lib/profile";

export default function JobDetailModal({
  job,
  onClose,
  onEdit,
  onDelete,
}: {
  job: JobCard;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [resolvingResume, setResolvingResume] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<{
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    summary: string;
  } | null>(null);

  async function handleMatchScore() {
    setMatchError(null);
    setMatchLoading(true);
    setMatchResult(null);
    try {
      const resumeText = await getMyResumeText();
      if (!resumeText.trim()) {
        setMatchError(
          "Add your resume text first — click \"Resume text\" in the top bar."
        );
        return;
      }
      if (!job.job_description || !job.job_description.trim()) {
        setMatchError("This application doesn't have a job description saved to match against.");
        return;
      }

      const res = await fetch("/api/match-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: job.job_description,
          resumeText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not compute a match score.");
      setMatchResult(data);
    } catch (err: any) {
      setMatchError(err.message ?? "Could not compute a match score right now.");
    } finally {
      setMatchLoading(false);
    }
  }

  async function openResume() {
    if (!job.resume_url) return;
    setResolvingResume(true);
    try {
      const url = await getResumeUrl(job.resume_url);
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setResolvingResume(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-8 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-card border border-ink/10 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-ink/10 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-medium">
              {job.job_title}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink/60">
              <Building2 size={14} className="text-ink/35" />
              {job.company_name}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-ink/40 hover:bg-ink/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <CompensationBadge job={job} />
            {job.job_field && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium text-ink/60">
                <Tag size={11} />
                {job.job_field}
              </span>
            )}
          </div>

          {isStale(job) && (
            <div className="flex items-center gap-2 rounded-card bg-status-oa/5 px-3 py-2 text-sm font-medium text-status-oa">
              <BellRing size={15} />
              No update in {daysSince(job.updated_at)} days — might be worth following up.
            </div>
          )}

          {job.status === "Interview" && job.interview_date && (
            <div className="flex items-center justify-between gap-2 rounded-card bg-status-interview/5 px-3 py-2 text-sm font-medium text-status-interview">
              <span className="flex items-center gap-2">
                <Calendar size={15} />
                Interview scheduled for {formatDate(job.interview_date)}
              </span>
              <button
                onClick={() => downloadInterviewICS(job)}
                className="flex items-center gap-1.5 rounded-card bg-white px-2.5 py-1.5 text-xs font-medium text-status-interview hover:bg-status-interview/10"
              >
                <CalendarPlus size={13} />
                Add to calendar
              </button>
            </div>
          )}

          {job.skills.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">
                Required skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-steel-50 px-2.5 py-1 text-xs font-medium text-steel-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {job.job_description && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">
                Job description
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/75">
                {job.job_description}
              </p>
            </div>
          )}

          <div className="rounded-card border border-ink/10 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">
                <Sparkles size={13} className="text-steel-500" />
                AI resume match
              </h3>
              {!matchResult && (
                <button
                  onClick={handleMatchScore}
                  disabled={matchLoading}
                  className="flex items-center gap-1.5 rounded-card bg-steel-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-steel-600 disabled:opacity-60"
                >
                  {matchLoading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  Get match score
                </button>
              )}
            </div>

            {matchError && (
              <p className="mt-2 text-xs text-status-rejected">{matchError}</p>
            )}

            {matchResult && (
              <div className="mt-3 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-steel-50 font-display text-lg font-medium text-steel-700">
                    {matchResult.score}
                  </div>
                  <p className="text-sm text-ink/70">{matchResult.summary}</p>
                </div>
                {matchResult.matchedSkills.length > 0 && (
                  <div>
                    <span className="text-[11px] font-medium text-ink/40">
                      Matched
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {matchResult.matchedSkills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-status-offer/10 px-2 py-0.5 text-[11px] font-medium text-status-offer"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {matchResult.missingSkills.length > 0 && (
                  <div>
                    <span className="text-[11px] font-medium text-ink/40">
                      Consider adding
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {matchResult.missingSkills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-status-oa/10 px-2 py-0.5 text-[11px] font-medium text-status-oa"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={handleMatchScore}
                  disabled={matchLoading}
                  className="text-xs font-medium text-steel-500 hover:text-steel-600"
                >
                  Re-run
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-ink/10 pt-4 text-xs text-ink/45">
            <div>
              <span className="block font-medium text-ink/60">Added</span>
              {formatDate(job.created_at)}
            </div>
            <div>
              <span className="block font-medium text-ink/60">Last updated</span>
              {formatDate(job.updated_at)}
            </div>
          </div>

          {job.resume_url && (
            <button
              onClick={openResume}
              disabled={resolvingResume}
              className="flex items-center gap-2 rounded-card bg-ink/5 px-3.5 py-2 text-sm font-medium text-ink/70 hover:bg-ink/10 disabled:opacity-60"
            >
              {resolvingResume ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <FileText size={15} />
              )}
              View attached resume
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-ink/10 px-6 py-4">
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-card px-4 py-2 text-sm font-medium text-status-rejected hover:bg-status-rejected/10"
          >
            <Trash2 size={15} />
            Delete
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-card bg-steel-500 px-4 py-2 text-sm font-medium text-white hover:bg-steel-600"
          >
            <Pencil size={15} />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function CompensationBadge({ job }: { job: JobCard }) {
  if (job.compensation_type === "Paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-status-offer/10 px-2.5 py-1 text-xs font-medium text-status-offer">
        <IndianRupee size={11} />
        {formatRupees(job.stipend_amount)}/mo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium text-ink/50">
      Unpaid
    </span>
  );
}