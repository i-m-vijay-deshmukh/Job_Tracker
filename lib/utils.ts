import { JobCard, JobStatus } from "./types";

/** Merge class names, skipping falsy values. */
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Tailwind color classes keyed by job status, used for badges and card spines. */
export function statusColorClasses(status: JobStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const map: Record<JobStatus, { bg: string; text: string; border: string; dot: string }> = {
    Applied: {
      bg: "bg-status-applied/10",
      text: "text-status-applied",
      border: "border-status-applied",
      dot: "bg-status-applied",
    },
    OA: {
      bg: "bg-status-oa/10",
      text: "text-status-oa",
      border: "border-status-oa",
      dot: "bg-status-oa",
    },
    Interview: {
      bg: "bg-status-interview/10",
      text: "text-status-interview",
      border: "border-status-interview",
      dot: "bg-status-interview",
    },
    Offer: {
      bg: "bg-status-offer/10",
      text: "text-status-offer",
      border: "border-status-offer",
      dot: "bg-status-offer",
    },
    Rejected: {
      bg: "bg-status-rejected/10",
      text: "text-status-rejected",
      border: "border-status-rejected",
      dot: "bg-status-rejected",
    },
  };
  return map[status];
}

/** Formats a stipend amount as Indian rupees, e.g. 45000 -> "₹45,000". */
export function formatRupees(amount: number | null): string {
  if (amount === null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Parse a comma or enter separated skills string into a clean tag array. */
export function parseSkillsInput(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

// ---------------------------------------------------------------------------
// Follow-up reminders
// ---------------------------------------------------------------------------

/** Applications sitting this long with no update are flagged for follow-up. */
export const STALE_DAYS_THRESHOLD = 14;

/** Whole days elapsed since the given ISO timestamp. */
export function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  const diffMs = Date.now() - then;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * A job is "stale" (worth a follow-up nudge) if it's still waiting on a
 * response — Applied or OA — and hasn't been updated in a while. Interview,
 * Offer, and Rejected all mean something already moved, so they're excluded.
 */
export function isStale(job: JobCard): boolean {
  if (job.status !== "Applied" && job.status !== "OA") return false;
  return daysSince(job.updated_at) >= STALE_DAYS_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Add to calendar
// ---------------------------------------------------------------------------

/**
 * Builds and downloads a .ics file for a job's interview date, as an
 * all-day event. Works with Google Calendar, Apple Calendar, and Outlook —
 * no calendar API or account connection required.
 */
export function downloadInterviewICS(job: JobCard): void {
  if (!job.interview_date) return;

  const pad = (n: number) => String(n).padStart(2, "0");
  const asICSDate = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  const escapeICSText = (text: string) =>
    text.replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");

  const start = new Date(job.interview_date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const stamp =
    `${asICSDate(new Date())}T` +
    `${pad(new Date().getUTCHours())}${pad(new Date().getUTCMinutes())}${pad(
      new Date().getUTCSeconds()
    )}Z`;

  const summary = escapeICSText(`Interview: ${job.job_title} at ${job.company_name}`);
  const description = escapeICSText(
    `Interview for the ${job.job_title} role at ${job.company_name}.` +
      (job.job_field ? ` (${job.job_field})` : "")
  );

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Job Tracker//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${job.id}@job-tracker`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${asICSDate(start)}`,
    `DTEND;VALUE=DATE:${asICSDate(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeName = job.company_name.trim().replace(/\s+/g, "-").toLowerCase() || "interview";
  link.download = `interview-${safeName}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
