"use client";

import { useRouter } from "next/navigation";
import { useJobsPolling } from "@/hooks/useJobsPolling";

export function RunningJobsIndicator() {
  const { jobs } = useJobsPolling(7000);
  const router = useRouter();

  const running = jobs.filter(
    (j) => j.status === "running" || j.status === "pending" || j.status === "ai_pending"
  );

  if (running.length === 0) return null;

  return (
    <button
      onClick={() => router.push("/jobs")}
      className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/20 transition-colors"
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
      {running.length} job{running.length > 1 ? "s" : ""} running
    </button>
  );
}

