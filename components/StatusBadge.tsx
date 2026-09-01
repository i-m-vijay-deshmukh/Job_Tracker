import { JobStatus, STATUS_LABELS } from "@/lib/types";
import { statusColorClasses, cn } from "@/lib/utils";

export default function StatusBadge({
  status,
  className,
}: {
  status: JobStatus;
  className?: string;
}) {
  const c = statusColorClasses(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        c.bg,
        c.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {STATUS_LABELS[status]}
    </span>
  );
}
