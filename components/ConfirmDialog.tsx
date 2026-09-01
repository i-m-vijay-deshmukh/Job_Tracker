"use client";

import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-card border border-ink/10 bg-white p-6 shadow-xl">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-status-rejected/10 text-status-rejected">
          <AlertTriangle size={18} />
        </div>
        <h3 className="mt-3 font-display text-base font-medium">{title}</h3>
        <p className="mt-1 text-sm text-ink/60">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-card px-4 py-2 text-sm font-medium text-ink/60 hover:bg-ink/5"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-card bg-status-rejected px-4 py-2 text-sm font-medium text-white hover:bg-status-rejected/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
