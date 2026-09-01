"use client";

import { useState } from "react";
import {
  X,
  Pencil,
  Trash2,
  FileText,
  Calendar,
  Loader2,
  IndianRupee,
  Building2,
  Tag,
} from "lucide-react";
import { JobCard, JobStatus } from "@/lib/types";
import { formatDate, formatRupees } from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import { getResumeUrl } from "@/lib/jobs";

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

          {job.status === "Interview" && job.interview_date && (
            <div className="flex items-center gap-2 rounded-card bg-status-interview/5 px-3 py-2 text-sm font-medium text-status-interview">
              <Calendar size={15} />
              Interview scheduled for {formatDate(job.interview_date)}
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
