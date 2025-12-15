"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Plus, Search } from "lucide-react";
import Link from "next/link";
import { apiClient, type Job, type JobStatus, type SavedView, type LlmHealth } from "@/lib/api";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { SavedViewsBar } from "@/components/saved-views/SavedViewsBar";
import { useJobsPolling } from "@/hooks/useJobsPolling";

type JobStatusType = JobStatus | "all";

function StatusBadge({ status }: { status: JobStatus | string }) {
  const map: Record<JobStatus, string> = {
    pending: "bg-slate-700 text-slate-100 border border-slate-600",
    running: "bg-amber-500/15 text-amber-300 border border-amber-400/60",
    completed: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/60",
    failed: "bg-rose-500/15 text-rose-300 border border-rose-400/60",
    cancelled: "bg-slate-500/15 text-slate-300 border border-slate-400/60",
    ai_pending: "bg-blue-500/15 text-blue-300 border border-blue-400/60",
    completed_with_warnings: "bg-yellow-500/15 text-yellow-300 border border-yellow-400/60",
  };

  const label: Record<JobStatus | string, string> = {
    pending: "Queued",
    running: "Running",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
    ai_pending: "AI Processing",
    completed_with_warnings: "Completed",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${map[status as JobStatus] || map.pending}`}
    >
      {label[status] || "Unknown"}
    </span>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "info" | "success" | "danger";
}) {
  const toneMap: Record<typeof tone, string> = {
    default: "text-slate-50",
    info: "text-cyan-400",
    success: "text-emerald-400",
    danger: "text-rose-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3"
    >
      <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneMap[tone]}`}>
        {value.toLocaleString()}
      </p>
    </motion.div>
  );
}

function FilterChip({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-[11px] font-medium transition-all ${
        active
          ? "bg-slate-100 text-slate-900 border-slate-100"
          : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatusType>("all");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [llmHealth, setLlmHealth] = useState<LlmHealth | null>(null);
  const [llmHealthError, setLlmHealthError] = useState<string | null>(null);

  // Use the polling hook - handles loading, error, and polling automatically
  const { jobs, loading, error } = useJobsPolling(5000);
  
  // Debug logging - helps identify the issue
  useEffect(() => {
    console.log("[JobsPage] Render state:", { 
      jobsCount: jobs.length, 
      loading, 
      error,
      jobsIsArray: Array.isArray(jobs),
      jobsSample: jobs.length > 0 ? jobs[0] : null
    });
  }, [jobs, loading, error]);

  // Fetch LLM diagnostics once on mount
  useEffect(() => {
    let active = true;
    apiClient
      .getLlmHealth()
      .then((data) => {
        if (!active) return;
        setLlmHealth(data);
        setLlmHealthError(null);
      })
      .catch((err: any) => {
        if (!active) return;
        const message = err?.response?.data?.detail || err?.message || "Unable to fetch LLM diagnostics.";
        setLlmHealthError(message);
      });

    return () => {
      active = false;
    };
  }, []);

  // Command palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleApplyView = (view: SavedView) => {
    if (view.filters.search) {
      setSearchQuery(view.filters.search);
    } else {
      setSearchQuery("");
    }
    if (view.filters.status && view.filters.status !== "all") {
      setStatusFilter(view.filters.status as JobStatusType);
    } else {
      setStatusFilter("all");
    }
  };

  // Jobs are already normalized by useJobsPolling hook, but add defensive check
  const normalizedJobs: Job[] = Array.isArray(jobs) ? jobs : [];

  const filteredJobs = normalizedJobs.filter((job) => {
    const matchesSearch =
      job.niche?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.location && job.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: normalizedJobs.length,
    running: normalizedJobs.filter((j) => j.status === "running" || j.status === "ai_pending").length,
    completed: normalizedJobs.filter((j) => j.status === "completed" || j.status === "completed_with_warnings").length,
    failed: normalizedJobs.filter((j) => j.status === "failed").length,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Modern Animated Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-20 glass border-b border-slate-200/50 dark:border-slate-800/50 shadow-lg"
        >
          <div className="px-6 py-5 flex items-center justify-between gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-50 dark:via-slate-100 dark:to-slate-50 bg-clip-text text-transparent">
                Jobs
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
                Track scraping & AI enrichment runs in real time
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Link href="/jobs/new">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 hover:from-cyan-400 hover:via-blue-400 hover:to-cyan-400 text-sm font-semibold px-6 py-3 shadow-xl shadow-cyan-500/25 dark:shadow-cyan-500/40 transition-all text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Job
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </motion.header>
        {llmHealth && llmHealth.status !== "ok" && (
          <div className="px-6 pt-4">
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 flex items-start gap-3 text-sm text-amber-100">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <p className="font-semibold text-amber-50">AI Insights Unavailable</p>
                <p className="text-amber-100/80">
                  {llmHealth.message} {llmHealth.provider ? `(provider: ${llmHealth.provider})` : ""}
                </p>
              </div>
            </div>
          </div>
        )}
        {llmHealthError && (
          <div className="px-6 pt-4">
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-200" />
              <div>
                <p className="font-semibold text-rose-50">LLM Health Check Failed</p>
                <p className="text-rose-100/80">{llmHealthError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-8 pb-12">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats row - Enhanced */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <MetricCard label="Total jobs" value={stats.total} />
              <MetricCard label="Running" value={stats.running} tone="info" />
              <MetricCard label="Completed" value={stats.completed} tone="success" />
              <MetricCard label="Failed" value={stats.failed} tone="danger" />
            </motion.section>

          {/* Saved Views Bar */}
          <SavedViewsBar
            pageType="jobs"
            currentFilters={{
              search: searchQuery.trim() || undefined,
              status: statusFilter !== "all" ? statusFilter : undefined,
            }}
            onApplyView={handleApplyView}
          />

          {/* Search + filters */}
          <section className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1 flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by niche or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-0 outline-none text-xs flex-1 placeholder:text-slate-500 text-slate-200"
              />
            </div>
            <div className="flex gap-2 text-[11px]">
              <FilterChip
                label="All"
                active={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
              />
              <FilterChip
                label="Running"
                active={statusFilter === "running"}
                onClick={() => setStatusFilter("running")}
              />
              <FilterChip
                label="Completed"
                active={statusFilter === "completed"}
                onClick={() => setStatusFilter("completed")}
              />
              <FilterChip
                label="Failed"
                active={statusFilter === "failed"}
                onClick={() => setStatusFilter("failed")}
              />
            </div>
          </section>

          {/* Jobs table - Modern Design */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-2xl"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-900">
                  <tr className="text-slate-400">
                    <th className="px-4 py-2 text-left font-medium">Job</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-left font-medium">Progress</th>
                    <th className="px-4 py-2 text-right font-medium">Leads</th>
                    <th className="px-4 py-2 text-right font-medium">Sites</th>
                    <th className="px-4 py-2 text-right font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {error ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-red-400">
                        <div className="flex flex-col items-center gap-2">
                          <p>Failed to load jobs: {error}</p>
                          <button
                            onClick={() => window.location.reload()}
                            className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                          >
                            Reload page
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : loading && jobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Loading jobs...
                      </td>
                    </tr>
                  ) : filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        {normalizedJobs.length === 0 ? (
                          <>
                            No jobs yet. Click{" "}
                            <Link href="/jobs/new" className="font-medium text-cyan-400 hover:text-cyan-300">
                              "New Job"
                            </Link>{" "}
                            to start a scrape or enrichment run.
                          </>
                        ) : (
                          "No jobs match your filters."
                        )}
                      </td>
                    </tr>
                  ) : (
                    <AnimatePresence>
                      {filteredJobs.map((job, idx) => (
                        <motion.tr
                          key={job.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className={`border-t border-slate-800 hover:bg-slate-900/70 transition-colors cursor-pointer ${
                            idx % 2 === 1 ? "bg-slate-900/40" : ""
                          }`}
                          onClick={() => {
                            window.location.href = `/jobs/${job.id}`;
                          }}
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-100">
                              {job.niche}
                              {job.location && ` • ${job.location}`}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Job #{job.id}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={job.status} />
                          </td>
                          <td className="px-4 py-3">
                            {(job.status === "running" || job.status === "pending" || job.status === "ai_pending") && job.total_targets && job.total_targets > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-20 bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-cyan-400 transition-all"
                                    style={{ width: `${Math.round((job.processed_targets || 0) / job.total_targets * 100)}%` }}
                                  />
                                </div>
                                <span className="text-[11px] text-slate-400">
                                  {job.processed_targets || 0}/{job.total_targets}
                                </span>
                              </div>
                            ) : job.status === "pending" ? (
                              <span className="text-[11px] text-slate-400">Queued...</span>
                            ) : job.status === "completed" || job.status === "completed_with_warnings" ? (
                              <span className="text-[11px] text-emerald-400">Done</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-100">
                            {(job.result_count || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-100">
                            {(job.sites_crawled || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400">
                            {formatDate(job.created_at)}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>
          </div>
        </main>

        {/* Command Palette */}
        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />
      </div>
  );
}
