"use client";

import type { JobStatus } from "@/lib/api";

interface JobStatusBadgeProps {
  status: JobStatus | string;
  size?: "sm" | "md";
}

export function JobStatusBadge({ status, size = "md" }: JobStatusBadgeProps) {
  const config: Record<
    string,
    { label: string; color: string; dot: string }
  > = {
    pending: {
      label: "Queued",
      color: "bg-slate-800 text-slate-200 border border-slate-600",
      dot: "bg-slate-400",
    },
    running: {
      label: "Running",
      color: "bg-amber-500/15 text-amber-300 border border-amber-400/60",
      dot: "bg-amber-400 animate-pulse",
    },
    completed: {
      label: "Completed",
      color: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/60",
      dot: "bg-emerald-400",
    },
    completed_with_warnings: {
      label: "Completed",
      color: "bg-yellow-500/15 text-yellow-300 border border-yellow-400/60",
      dot: "bg-yellow-400",
    },
    failed: {
      label: "Failed",
      color: "bg-rose-500/15 text-rose-300 border border-rose-400/60",
      dot: "bg-rose-400",
    },
    cancelled: {
      label: "Cancelled",
      color: "bg-slate-500/15 text-slate-300 border border-slate-400/60",
      dot: "bg-slate-400",
    },
    ai_pending: {
      label: "AI Processing",
      color: "bg-blue-500/15 text-blue-300 border border-blue-400/60",
      dot: "bg-blue-400 animate-pulse",
    },
  };

  const { label, color, dot } = config[status] || config.pending;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  const dotSize = size === "sm" ? "h-1 w-1" : "h-1.5 w-1.5";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-medium ${color} ${sizeClasses}`}
    >
      <span className={`${dotSize} rounded-full ${dot}`} />
      {label}
    </span>
  );
}

