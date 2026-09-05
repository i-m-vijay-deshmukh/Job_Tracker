"use client";

import { useState } from "react";
import {
  Pencil,
  Trash2,
  FileText,
  Calendar,
  ChevronDown,
  IndianRupee,
  BellRing,
} from "lucide-react";
import { JobCard, JOB_STATUSES, STATUS_LABELS, JobStatus } from "@/lib/types";
import {
  statusColorClasses,
  formatDate,
  formatRupees,
  cn,
  isStale,
  daysSince,
} from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import { getResumeUrl } from "@/lib/jobs";

export default function JobCardItem({
  job,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  job: JobCard;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: JobStatus, interviewDate?: string) => void;
}) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [resolvingResume, setResolvingResume] = useState(false);
  const colors = statusColorClasses(job.status);

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
      onClick={onView}
      className={cn(
        "flex cursor-pointer flex-col rounded-card border border-ink/10 border-l-4 bg-white p-4 transition hover:border-ink/20 hover:shadow-sm",
        colors.border
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-medium">
            {job.job_title}
          </h3>
          <p className="truncate text-sm text-ink/60">{job.company_name}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label="Edit application"
            className="rounded-card p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete application"
            className="rounded-card p-1.5 text-ink/40 hover:bg-status-rejected/10 hover:text-status-rejected"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {job.job_field && (
          <span className="text-xs font-medium text-ink/40">{job.job_field}</span>
        )}
        {job.compensation_type === "Paid" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-status-offer/10 px-2 py-0.5 text-[11px] font-medium text-status-offer">
            <IndianRupee size={10} />
            {formatRupees(job.stipend_amount)}/mo
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-ink/45">
            Unpaid
          </span>
        )}
      </div>

      {isStale(job) && (
        <div className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-status-oa/10 px-2 py-0.5 text-[11px] font-medium text-status-oa">
          <BellRing size={10} />
          No update in {daysSince(job.updated_at)}d — follow up?
        </div>
      )}

      {job.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-ink/60"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 4 && (
            <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-ink/40">
              +{job.skills.length - 4}
            </span>
          )}
        </div>
      )}

      {job.job_description && (
        <p className="mt-3 line-clamp-2 text-sm text-ink/60">
          {job.job_description}
        </p>
      )}

      {job.status === "Interview" && job.interview_date && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-status-interview">
          <Calendar size={13} />
          Interview on {formatDate(job.interview_date)}
        </div>
      )}

      {job.status === "OA" && job.oa_date && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-status-oa">
          <Calendar size={13} />
          OA on {formatDate(job.oa_date)}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setStatusMenuOpen((v) => !v);
            }}
            className="flex items-center gap-1"
          >
            <StatusBadge status={job.status} />
            <ChevronDown size={13} className="text-ink/40" />
          </button>

          {statusMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusMenuOpen(false);
                }}
              />
              <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-card border border-ink/10 bg-white py-1 shadow-lg">
                {JOB_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(s);
                      setStatusMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-ink/5",
                      s === job.status && "font-medium"
                    )}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {job.resume_url && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openResume();
            }}
            disabled={resolvingResume}
            className="flex items-center gap-1 text-xs font-medium text-ink/50 hover:text-steel-500 disabled:opacity-50"
          >
            <FileText size={13} />
            Resume
          </button>
        )}
      </div>
    </div>
  );
}