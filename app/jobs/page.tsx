"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Plus, Search, X, ExternalLink, Calendar, Download, Copy } from "lucide-react";
import Link from "next/link";
import { apiClient, type Job, type JobStatus, type SavedView, type LlmHealth, type JobLog } from "@/lib/api";
import { SavedViewsBar } from "@/components/saved-views/SavedViewsBar";
import { useJobsPolling } from "@/hooks/useJobsPolling";
import { useToast } from "@/components/ui/Toast";

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

function formatDateTime(dateString?: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString();
}

function getJobError(job: Job): string | null {
  const candidates = [
    job.error_message,
    job.error,
    job.ai_error,
    job.failure_reason,
    job.last_error,
  ];
  for (const value of candidates) {
    if (!value) continue;
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return null;
}

function getRetryHint(error: string | null): string {
  if (!error) return "Retry after updating inputs or reducing the scope.";
  const lowered = error.toLowerCase();
  if (lowered.includes("timeout")) {
    return "Consider reducing the number of sites or narrowing the niche.";
  }
  if (lowered.includes("rate limit") || lowered.includes("429")) {
    return "Wait a few minutes and retry, or lower the crawl volume.";
  }
  if (lowered.includes("auth") || lowered.includes("permission")) {
    return "Check credentials and workspace permissions before retrying.";
  }
  return "Retry after updating inputs or reducing the scope.";
}

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatusType>("all");
  const [llmHealth, setLlmHealth] = useState<LlmHealth | null>(null);
  const [llmHealthError, setLlmHealthError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedJobLoading, setSelectedJobLoading] = useState(false);
  const [selectedJobError, setSelectedJobError] = useState<string | null>(null);
  const [jobDetailsById, setJobDetailsById] = useState<Record<number, Job>>({});
  const [logsByJob, setLogsByJob] = useState<Record<number, JobLog[]>>({});
  const [logsLoading, setLogsLoading] = useState<number | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [jobLeads, setJobLeads] = useState<Record<number, any[]>>({});
  const [resultsLoading, setResultsLoading] = useState<number | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleCadence, setScheduleCadence] = useState("weekly");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const { showToast } = useToast();

  // Use the polling hook - handles loading, error, and polling automatically
  const { jobs, loading, error } = useJobsPolling({
    intervalMs: 15000,
    initialDelayMs: 250,
    pauseWhenHidden: true,
    request: { limit: 100, include_ai: false },
  });

  const handleSelectJob = async (job: Job) => {
    const cached = jobDetailsById[job.id];
    setSelectedJobError(null);
    setSelectedJob(cached || job);

    if (cached) return;

    setSelectedJobLoading(true);
    try {
      const full = await apiClient.getJob(job.id);
      setJobDetailsById((prev) => ({ ...prev, [job.id]: full }));
      setSelectedJob((current) => (current && current.id === job.id ? full : current));
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to load job details.";
      setSelectedJobError(msg);
    } finally {
      setSelectedJobLoading(false);
    }
  };
  
  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  const handleExportJobs = () => {
    if (filteredJobs.length === 0) {
      showToast({
        type: "error",
        title: "No jobs to export",
        message: "No jobs match the current filters.",
      });
      return;
    }
    const headers = [
      "id",
      "niche",
      "location",
      "status",
      "leads",
      "sites",
      "processed_targets",
      "total_targets",
      "created_at",
    ];
    const rows = [
      headers,
      ...filteredJobs.map((job) => [
        String(job.id),
        job.niche || "",
        job.location || "",
        job.status || "",
        String(job.result_count || 0),
        String(job.sites_crawled || 0),
        String(job.processed_targets || 0),
        String(job.total_targets || 0),
        job.created_at || "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jobs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJobLinks = async () => {
    if (filteredJobs.length === 0) {
      showToast({
        type: "info",
        title: "No jobs to copy",
        message: "No jobs match the current filters.",
      });
      return;
    }
    const baseUrl = window.location.origin;
    const links = filteredJobs.map((job) => `${baseUrl}/jobs/${job.id}`);
    try {
      await navigator.clipboard.writeText(links.join("\n"));
      showToast({
        type: "success",
        title: "Links copied",
        message: `Copied ${links.length} job links.`,
      });
    } catch {
      showToast({
        type: "error",
        title: "Copy failed",
        message: "Could not copy job links.",
      });
    }
  };

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

  const normalizedJobs: Job[] = useMemo(() => (Array.isArray(jobs) ? jobs : []), [jobs]);
  const searchTerm = searchQuery.trim().toLowerCase();

  const filteredJobs = useMemo(() => {
    return normalizedJobs.filter((job) => {
      const matchesSearch =
        !searchTerm ||
        job.niche?.toLowerCase().includes(searchTerm) ||
        (job.location && job.location.toLowerCase().includes(searchTerm));
      const matchesStatus = statusFilter === "all" || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [normalizedJobs, searchTerm, statusFilter]);

  const stats = useMemo(
    () => ({
      total: normalizedJobs.length,
      running: normalizedJobs.filter((j) => j.status === "running" || j.status === "ai_pending").length,
      completed: normalizedJobs.filter((j) => j.status === "completed" || j.status === "completed_with_warnings").length,
      failed: normalizedJobs.filter((j) => j.status === "failed").length,
    }),
    [normalizedJobs]
  );

  // Fetch job logs when drawer opens
  useEffect(() => {
    const fetchLogs = async () => {
      if (!selectedJob) return;
      if (logsByJob[selectedJob.id]) return;
      setLogsLoading(selectedJob.id);
      setLogsError(null);
      try {
        const logs = await apiClient.getJobLogs(selectedJob.id);
        setLogsByJob((prev) => ({ ...prev, [selectedJob.id]: logs }));
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err?.message || "Failed to load activity.";
        setLogsError(msg);
      } finally {
        setLogsLoading(null);
      }
    };
    fetchLogs();
  }, [selectedJob, logsByJob]);

  const handleRetry = async (jobId: number) => {
    try {
      setRetryingId(jobId);
      await apiClient.retryJob(jobId);
      // light refresh to pick up new status
      const isJSDOM = typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);
      try {
        if (!isJSDOM && typeof window !== "undefined" && window.location?.reload) {
          window.location.reload();
        }
      } catch {
        // ignore reload issues (e.g., in tests)
      }
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || "Failed to retry job.";
      alert(message);
    } finally {
      setRetryingId(null);
    }
  };

  const handleLoadResults = async (jobId: number) => {
    if (jobLeads[jobId]) return;
    try {
      setResultsLoading(jobId);
      const data = await apiClient.getJobLeads(jobId);
      setJobLeads((prev) => ({ ...prev, [jobId]: data || [] }));
    } catch (err) {
      // ignore
    } finally {
      setResultsLoading(null);
    }
  };

  const handleSaveSchedule = () => {
    showToast({
      type: "success",
      title: "Schedule saved",
      message: `${scheduleCadence} at ${scheduleTime}. Backend scheduler coming next.`,
    });
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
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={handleCopyJobLinks}
                className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy links
              </button>
              <button
                type="button"
                onClick={handleExportJobs}
                className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
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
            {error && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 flex items-center justify-between">
                <span>Failed to load jobs. Please try again.</span>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-100 hover:bg-rose-500/20"
                >
                  Try again
                </button>
              </div>
            )}
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

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-2xl space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Job templates</h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    { label: "Local services", niche: "dentist clinic", location: "New York" },
                    { label: "Restaurants", niche: "restaurant", location: "Dubai" },
                    { label: "SaaS leads", niche: "B2B SaaS", location: "" },
                  ].map((preset) => (
                    <Link
                      key={preset.label}
                      href={`/jobs/new?niche=${encodeURIComponent(preset.niche)}&location=${encodeURIComponent(preset.location)}`}
                      className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400/60"
                    >
                      {preset.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-500" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Schedule</h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setScheduleEnabled((value) => !value)}
                    className={`px-3 py-1.5 rounded-full border ${
                      scheduleEnabled
                        ? "border-cyan-500/40 text-cyan-300 bg-cyan-500/10"
                        : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {scheduleEnabled ? "Enabled" : "Disabled"}
                  </button>
                  <select
                    value={scheduleCadence}
                    onChange={(e) => setScheduleCadence(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-2 py-1"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-2 py-1"
                  />
                  <button
                    onClick={handleSaveSchedule}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  >
                    Save
                  </button>
                </div>
              </div>
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
                data-global-search="true"
                className="bg-transparent border-0 outline-none text-xs flex-1 placeholder:text-slate-500 text-slate-200"
              />
              <kbd className="px-2 py-0.5 text-[10px] rounded bg-slate-800 text-slate-400 border border-slate-700">
                /
              </kbd>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-500 hover:text-slate-200"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
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
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Reset
              </button>
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
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {error ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-red-400">
                        <div className="flex flex-col items-center gap-2">
                          <p>Failed to load jobs: {error}</p>
                          <button
                            onClick={() => window.location.reload()}
                            aria-label="Reload page"
                            className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                          >
                            Reload page
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : loading && jobs.length === 0 ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <tr key={`skeleton-${index}`} className="animate-pulse">
                        <td className="px-4 py-4">
                          <div className="h-4 w-32 rounded bg-slate-800/70" />
                          <div className="mt-2 h-3 w-20 rounded bg-slate-800/50" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-4 w-16 rounded bg-slate-800/70" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-3 w-28 rounded bg-slate-800/60" />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="ml-auto h-3 w-10 rounded bg-slate-800/60" />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="ml-auto h-3 w-10 rounded bg-slate-800/60" />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="ml-auto h-3 w-14 rounded bg-slate-800/60" />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="ml-auto h-3 w-8 rounded bg-slate-800/60" />
                        </td>
                      </tr>
                    ))
                  ) : filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        {normalizedJobs.length === 0 ? (
                          <>
                            No jobs yet. Click{" "}
                            <Link href="/jobs/new" className="font-medium text-cyan-400 hover:text-cyan-300">
                              New Job
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
                          onClick={() => handleSelectJob(job)}
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-100">
                              {job.niche}
                              {job.location && ` - ${job.location}`}
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
                          <td className="px-4 py-3 text-right">
                            {(job.status === "failed" || job.status === "completed" || job.status === "cancelled") && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetry(job.id);
                                }}
                                disabled={retryingId === job.id}
                                className="text-[11px] px-3 py-1 rounded-full border border-slate-600 text-slate-100 hover:bg-slate-800 disabled:opacity-50"
                              >
                                {retryingId === job.id ? "Retrying..." : "Retry"}
                              </button>
                            )}
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

        <AnimatePresence>
          {selectedJob && (
            <motion.div
              className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedJob(null)}
            >
              <motion.div
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 80, opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-slate-950 text-slate-50 shadow-2xl border-l border-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between p-5 border-b border-slate-800">
                  <div>
                    <p className="text-xs text-slate-400">Job #{selectedJob.id}</p>
                    <h3 className="text-xl font-semibold mt-1 leading-tight">
                      {selectedJob.niche} {selectedJob.location ? `- ${selectedJob.location}` : ""}
                    </h3>
                    <div className="mt-2">
                      <StatusBadge status={selectedJob.status} />
                    </div>
                    {selectedJobLoading && <p className="text-[11px] text-slate-400 mt-2">Loading details…</p>}
                    {selectedJobError && <p className="text-[11px] text-rose-300 mt-2">{selectedJobError}</p>}
                  </div>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="text-slate-400 hover:text-slate-100 rounded-full p-1 border border-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-sm">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Timeline</p>
                    <div className="mt-2 space-y-2 text-[12px] text-slate-200">
                      <div className="flex items-center justify-between">
                        <span>Created</span>
                        <span className="text-slate-400">{formatDateTime(selectedJob.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Started</span>
                        <span className="text-slate-400">{formatDateTime(selectedJob.started_at)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Completed</span>
                        <span className="text-slate-400">{formatDateTime(selectedJob.completed_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Created</p>
                      <p className="mt-1 font-semibold">{formatDateTime(selectedJob.created_at)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Completed</p>
                      <p className="mt-1 font-semibold">{formatDateTime(selectedJob.completed_at)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Leads</p>
                      <p className="mt-1 font-semibold">{(selectedJob.result_count || 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Sites</p>
                      <p className="mt-1 font-semibold">{(selectedJob.sites_crawled || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Progress</p>
                    <p className="mt-1 font-semibold">
                      {selectedJob.processed_targets ?? 0}/{selectedJob.total_targets ?? 0} processed
                    </p>
                    {selectedJob.ai_status && (
                      <p className="text-[11px] text-slate-400 mt-1">AI: {selectedJob.ai_status}</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Duration</p>
                    <p className="mt-1 font-semibold">
                      {(() => {
                        const duration =
                          selectedJob.duration_seconds ??
                          (selectedJob.completed_at && selectedJob.started_at
                            ? Math.round(
                                (new Date(selectedJob.completed_at).getTime() - new Date(selectedJob.started_at).getTime()) /
                                  1000
                              )
                            : null);
                        if (!duration || duration < 0) return "-";
                        if (duration < 60) return `${duration}s`;
                        const mins = Math.floor(duration / 60);
                        const secs = duration % 60;
                        return `${mins}m ${secs}s`;
                      })()}
                    </p>
                  </div>

                  {selectedJob.ai_summary && (
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">AI Summary</p>
                      <p className="mt-1 text-slate-100 text-sm leading-relaxed">{selectedJob.ai_summary}</p>
                    </div>
                  )}

                  {(selectedJob.status === "failed" || getJobError(selectedJob)) && (
                    <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-rose-200">Failure Details</p>
                      <p className="mt-2 text-sm text-rose-100">
                        {getJobError(selectedJob) || "Job failed without a detailed error message."}
                      </p>
                      <p className="mt-2 text-[11px] text-rose-200/80">
                        Retry hint: {getRetryHint(getJobError(selectedJob))}
                      </p>
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Activity</p>
                      {logsLoading === selectedJob.id && <span className="text-[11px] text-slate-400">Loading...</span>}
                      {logsError && <span className="text-[11px] text-rose-400">{logsError}</span>}
                    </div>
                    <div className="space-y-2 max-h-48 overflow-auto pr-1">
                      {(logsByJob[selectedJob.id] || []).length === 0 && !logsLoading ? (
                        <p className="text-[12px] text-slate-500">No activity yet.</p>
                      ) : (
                        (logsByJob[selectedJob.id] || []).map((log) => (
                          <div key={log.id} className="border border-slate-800 rounded-lg px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-400">
                                {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 uppercase tracking-wide">
                                {log.activity_type}
                              </span>
                            </div>
                            <p className="text-sm text-slate-100 mt-1">{log.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Results explorer</p>
                      <button
                        onClick={() => handleLoadResults(selectedJob.id)}
                        className="text-[11px] text-cyan-400"
                      >
                        {resultsLoading === selectedJob.id ? "Loading..." : "Load results"}
                      </button>
                    </div>
                    {jobLeads[selectedJob.id] && jobLeads[selectedJob.id].length > 0 ? (
                      <div className="space-y-2">
                        {jobLeads[selectedJob.id].slice(0, 5).map((lead: any) => (
                          <div key={lead.id} className="flex items-center justify-between text-xs text-slate-400">
                            <span className="text-slate-100">{lead.name || "Unknown lead"}</span>
                            <span>{lead.email || lead.emails?.[0] || "-"}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-slate-500">No results loaded.</p>
                    )}
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-slate-800 flex flex-wrap gap-2">
                  <Link
                    href={`/jobs/${selectedJob.id}`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-sm text-slate-100 hover:bg-slate-900"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open job page
                  </Link>
                  {(selectedJob.status === "failed" ||
                    selectedJob.status === "completed" ||
                    selectedJob.status === "cancelled") && (
                    <button
                      onClick={() => handleRetry(selectedJob.id)}
                      disabled={retryingId === selectedJob.id}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-500 text-sm text-cyan-100 hover:bg-cyan-500/10 disabled:opacity-60"
                    >
                      {retryingId === selectedJob.id ? "Retrying..." : "Retry from here"}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="ml-auto text-sm text-slate-400 hover:text-slate-100"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Command Palette */}
      </div>
  );
}
