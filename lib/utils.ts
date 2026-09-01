import { JobStatus } from "./types";

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
