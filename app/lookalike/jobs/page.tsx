"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import type { LookalikeJob, LookalikeJobStatus } from "@/types/lookalike";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";

function StatusBadge({ status }: { status: LookalikeJobStatus }) {
  const map: Record<LookalikeJobStatus, string> = {
    pending: "bg-slate-700 text-slate-100",
    running: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
    completed: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40",
    failed: "bg-rose-500/15 text-rose-300 border border-rose-500/40",
  };

  const label: Record<LookalikeJobStatus, string> = {
    pending: "Queued",
    running: "Running",
    completed: "Completed",
    failed: "Failed",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${map[status]}`}
    >
      {label[status]}
    </span>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getSourceInfo(job: LookalikeJob): { type: string; name: string } {
  if (job.source_segment_id) {
    return { type: "segment", name: `Segment #${job.source_segment_id}` };
  }
  if (job.source_list_id) {
    return { type: "list", name: `List #${job.source_list_id}` };
  }
  if (job.source_campaign_id) {
    return { type: "campaign", name: `Campaign #${job.source_campaign_id}` };
  }
  return { type: "unknown", name: "Unknown source" };
}

export default function LookalikeJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<LookalikeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LookalikeJobStatus>("all");

  async function load() {
    setLoading(true);
    try {
      const data = await apiClient.listLookalikeJobs();
      setJobs(data as LookalikeJob[]);
    } catch (err) {
      console.error("Error loading lookalike jobs:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const hasJobs = jobs.length > 0;
  const totalCandidates = jobs.reduce((sum, job) => sum + job.candidates_found, 0);
  const runningJobs = jobs.filter((job) => job.status === "running").length;
  const failedJobs = jobs.filter((job) => job.status === "failed").length;
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const filteredJobs = jobs.filter((job) => {
    if (statusFilter !== "all" && job.status !== statusFilter) {
      return false;
    }
    if (!query.trim()) {
      return true;
    }
    const sourceInfo = getSourceInfo(job);
    const haystack = `lookalike job ${job.id} ${sourceInfo.name} ${sourceInfo.type} ${job.status}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800">
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
                AI Lookalike Jobs
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Find similar leads based on your best-performing segments, lists, or campaigns.
              </p>
            </div>

            <button
              onClick={() => router.push("/lookalike/new")}
              className="inline-flex items-center rounded-lg bg-indigo-500 hover:bg-indigo-400 text-xs font-medium px-4 py-2 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Lookalike Job
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-6 pt-6 pb-10">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading jobs...</div>
          ) : (
            <>
              {hasJobs && (
                <div className="space-y-4 mb-4">
                  <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
                      <p className="text-[11px] text-slate-400">Total Jobs</p>
                      <p className="text-lg font-semibold text-slate-100">{jobs.length}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
                      <p className="text-[11px] text-slate-400">Completed</p>
                      <p className="text-lg font-semibold text-slate-100">{completedJobs}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
                      <p className="text-[11px] text-slate-400">Running</p>
                      <p className="text-lg font-semibold text-slate-100">{runningJobs}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
                      <p className="text-[11px] text-slate-400">Candidates Found</p>
                      <p className="text-lg font-semibold text-slate-100">{totalCandidates.toLocaleString()}</p>
                    </div>
                  </section>

                  <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <Input
                        label="Search jobs"
                        icon={Search}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search by job id or source"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(["all", "pending", "running", "completed", "failed"] as const).map((status) => (
                        <button
                          key={status}
                          className={`text-[11px] font-medium px-3 py-2 rounded-lg border transition-colors ${
                            statusFilter === status
                              ? "border-indigo-400/60 text-indigo-200 bg-indigo-500/10"
                              : "border-slate-700 text-slate-300 hover:border-slate-500"
                          }`}
                          onClick={() => setStatusFilter(status)}
                        >
                          {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                      {failedJobs > 0 && (
                        <span className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2 py-1 rounded-lg">
                          {failedJobs} failed
                        </span>
                      )}
                    </div>
                  </section>
                </div>
              )}

              {hasJobs ? (
                filteredJobs.length === 0 ? (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-2xl bg-slate-900/80 border border-slate-800 px-6 py-10 text-center"
                  >
                    <p className="text-sm text-slate-200 mb-2">No jobs match your filters.</p>
                    <p className="text-xs text-slate-400 mb-4">Try clearing the search or status filters.</p>
                    <button
                      onClick={() => {
                        setQuery("");
                        setStatusFilter("all");
                      }}
                      className="inline-flex items-center rounded-lg bg-indigo-500 hover:bg-indigo-400 text-xs font-medium px-4 py-2 shadow-sm transition-colors"
                    >
                      Clear Filters
                    </button>
                  </motion.section>
                ) : (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden"
                  >
                    <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800">
                      <div className="text-xs text-slate-400">
                        Showing {filteredJobs.length} lookalike job{filteredJobs.length !== 1 ? "s" : ""}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-900">
                          <tr className="text-slate-400">
                            <th className="px-4 py-2 text-left font-medium">Job</th>
                            <th className="px-4 py-2 text-left font-medium">Source</th>
                            <th className="px-4 py-2 text-left font-medium">Created</th>
                            <th className="px-4 py-2 text-left font-medium">Candidates</th>
                            <th className="px-4 py-2 text-left font-medium">Status</th>
                            <th className="px-4 py-2 text-left font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredJobs.map((job) => {
                            const sourceInfo = getSourceInfo(job);
                            return (
                              <tr
                                key={job.id}
                                className="border-t border-slate-800 hover:bg-slate-900/70 transition-colors cursor-pointer"
                                onClick={() =>
                                  job.status === "completed" && router.push(`/lookalike/jobs/${job.id}`)
                                }
                              >
                                <td className="px-4 py-2">
                                  <div className="font-semibold text-slate-100">
                                    Lookalike Job #{job.id}
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {job.positive_lead_count} example{job.positive_lead_count !== 1 ? "s" : ""}
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  <div className="text-slate-200">{sourceInfo.name}</div>
                                  <div className="text-[11px] text-slate-500 capitalize mt-0.5">
                                    {sourceInfo.type}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-slate-200">
                                  {formatDate(job.created_at)}
                                </td>
                                <td className="px-4 py-2 text-slate-200">
                                  {job.candidates_found.toLocaleString()}
                                </td>
                                <td className="px-4 py-2">
                                  <StatusBadge status={job.status} />
                                </td>
                                <td className="px-4 py-2">
                                  {job.status === "completed" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/lookalike/jobs/${job.id}`);
                                      }}
                                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                                    >
                                      View Results
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </motion.section>
                )
              ) : (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 border border-slate-800 px-6 py-10 flex flex-col items-center text-center"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/40 mb-4">
                    <span className="text-xl">+</span>
                  </div>

                  <h2 className="text-lg font-semibold mb-1 text-slate-100">
                    No lookalike jobs yet
                  </h2>
                  <p className="text-xs text-slate-400 max-w-md mb-6">
                    Use AI to discover new leads that look like your best performers.
                    Start from a segment, list, or campaign with strong replies or wins,
                    and we&apos;ll find similar accounts for you.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-3 text-left w-full max-w-3xl mb-8">
                    <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
                      <p className="text-[11px] font-semibold text-slate-200 mb-1">
                        1. Choose a source
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Pick a high-performing segment, list, or campaign as your
                        &quot;example set&quot;.
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
                      <p className="text-[11px] font-semibold text-slate-200 mb-1">
                        2. Let AI learn
                      </p>
                      <p className="text-[11px] text-slate-400">
                        We analyze common patterns - industry, size, tech, region, and more.
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
                      <p className="text-[11px] font-semibold text-slate-200 mb-1">
                        3. Review lookalikes
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Approve the AI-ranked list and add the best-fit leads to a new segment.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push("/lookalike/new")}
                    className="inline-flex items-center rounded-lg bg-indigo-500 hover:bg-indigo-400 text-xs font-medium px-5 py-2.5 shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create First Job
                  </button>
                </motion.section>
              )}
            </>
          )}
        </main>

      </div>
  );
}
