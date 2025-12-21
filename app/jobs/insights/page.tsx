"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient, type Job } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import { BarChart3, Briefcase, Clock, Download } from "lucide-react";

export default function JobsInsightsPage() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendWindow, setTrendWindow] = useState(14);
  const [statusDrilldown, setStatusDrilldown] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiClient
      .getJobs()
      .then((data) => {
        if (!active) return;
        setJobs(data);
      })
      .catch(() => {
        if (!active) return;
        setJobs([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byNiche: Record<string, number> = {};
    let totalDuration = 0;
    let durationCount = 0;

    jobs.forEach((job) => {
      const status = job.status || "unknown";
      byStatus[status] = (byStatus[status] || 0) + 1;
      const niche = job.niche || "unknown";
      byNiche[niche] = (byNiche[niche] || 0) + 1;
      if (job.duration_seconds) {
        totalDuration += job.duration_seconds;
        durationCount += 1;
      }
    });

    const avgDurationMinutes =
      durationCount > 0 ? Math.round(totalDuration / durationCount / 60) : 0;
    const topNiches = Object.entries(byNiche)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return {
      total: jobs.length,
      byStatus,
      avgDurationMinutes,
      topNiches,
    };
  }, [jobs]);

  const statusEntries = Object.entries(stats.byStatus);
  const maxStatus = Math.max(1, ...statusEntries.map(([, count]) => count));
  const maxNiche = Math.max(1, ...stats.topNiches.map(([, count]) => count));

  const trendData = useMemo(() => {
    const days = trendWindow;
    const buckets: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i -= 1) {
      const current = new Date(now);
      current.setDate(now.getDate() - i);
      const label = current.toISOString().slice(0, 10);
      buckets.push({ date: label, count: 0 });
    }
    jobs.forEach((job) => {
      const created = new Date(job.created_at);
      const key = created.toISOString().slice(0, 10);
      const bucket = buckets.find((item) => item.date === key);
      if (bucket) {
        bucket.count += 1;
      }
    });
    return buckets;
  }, [jobs, trendWindow]);

  const maxTrend = Math.max(1, ...trendData.map((item) => item.count));

  const handleExportCsv = () => {
    const headers = [
      "id",
      "niche",
      "location",
      "status",
      "total_leads",
      "created_at",
      "completed_at",
      "duration_seconds",
    ];
    const rows = jobs.map((job) => [
      job.id,
      job.niche,
      job.location || "",
      job.status,
      job.total_leads,
      job.created_at,
      job.completed_at || "",
      job.duration_seconds || "",
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jobs_insights_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportInsights = () => {
    const payload = {
      total: stats.total,
      avgDurationMinutes: stats.avgDurationMinutes,
      byStatus: stats.byStatus,
      topNiches: stats.topNiches,
      trendWindow,
      trendData,
      generated_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jobs_insights_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShareLink = async () => {
    const params = new URLSearchParams();
    params.set("window", String(trendWindow));
    if (statusDrilldown) params.set("status", statusDrilldown);
    const shareUrl = `${window.location.origin}/jobs/insights?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast({
        type: "success",
        title: "Link copied",
        message: "Share link copied to clipboard.",
      });
    } catch {
      showToast({
        type: "error",
        title: "Copy failed",
        message: "Clipboard access was denied.",
      });
    }
  };

  const drilldownJobs = statusDrilldown
    ? jobs.filter((job) => (job.status || "unknown") === statusDrilldown)
    : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Jobs Insights"
        description="Cross-job analytics for volume, duration, and niches"
        icon={BarChart3}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShareLink}>
              Share Link
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportInsights} disabled={jobs.length === 0}>
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={jobs.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto space-y-6">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 p-8 text-center text-slate-500 dark:text-slate-400">
              Loading insights...
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Total jobs</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{stats.total}</p>
                </div>
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Avg duration</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    {stats.avgDurationMinutes} min
                  </p>
                </div>
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Active</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    {(stats.byStatus.running || 0) + (stats.byStatus.ai_pending || 0)}
                  </p>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">Status breakdown</h3>
                  {statusEntries.length === 0 ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400">No jobs yet.</p>
                  ) : (
                    <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                      {statusEntries.map(([status, count]) => (
                        <div key={status} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="capitalize">{status.replace(/_/g, " ")}</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-50">{count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200/70 dark:bg-slate-800">
                            <button
                              onClick={() => setStatusDrilldown(statusDrilldown === status ? null : status)}
                              className="h-2 rounded-full bg-cyan-500 w-full text-left"
                              style={{ width: `${(count / maxStatus) * 100}%` }}
                              title={`View ${status}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">Top niches</h3>
                  {stats.topNiches.length === 0 ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400">No jobs yet.</p>
                  ) : (
                    <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                      {stats.topNiches.map(([niche, count]) => (
                        <div key={niche} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-slate-400" />
                              {niche}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-50">{count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200/70 dark:bg-slate-800">
                            <div
                              className="h-2 rounded-full bg-emerald-500"
                              style={{ width: `${(count / maxNiche) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Jobs over time</h3>
                  <div className="flex items-center gap-2 text-xs">
                    {[7, 14, 30].map((window) => (
                      <button
                        key={window}
                        onClick={() => setTrendWindow(window)}
                        className={`px-2 py-1 rounded-full border ${
                          trendWindow === window
                            ? "border-cyan-500/40 text-cyan-300 bg-cyan-500/10"
                            : "border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        {window}d
                      </button>
                    ))}
                  </div>
                </div>
                {trendData.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">No jobs yet.</p>
                ) : (
                  <div className="grid grid-cols-7 gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    {trendData.map((item) => (
                      <div key={item.date} className="flex flex-col items-center gap-1">
                        <div className="h-20 w-full rounded-full bg-slate-200/70 dark:bg-slate-800 flex items-end">
                          <div
                            className="w-full rounded-full bg-cyan-500"
                            style={{ height: `${(item.count / maxTrend) * 100}%` }}
                          />
                        </div>
                        <span>{item.date.slice(5)}</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {statusDrilldown && (
                <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {statusDrilldown.replace(/_/g, " ")} jobs
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => setStatusDrilldown(null)}>
                      Clear
                    </Button>
                  </div>
                  {drilldownJobs.length === 0 ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400">No jobs in this status.</p>
                  ) : (
                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      {drilldownJobs.slice(0, 8).map((job) => (
                        <div key={job.id} className="flex items-center justify-between">
                          <span className="text-slate-900 dark:text-slate-50 font-medium">
                            {job.niche} {job.location ? `- ${job.location}` : ""}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {new Date(job.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">Recent runs</h3>
                {jobs.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">No jobs yet.</p>
                ) : (
                  <div className="space-y-3">
                    {jobs.slice(0, 6).map((job) => (
                      <div key={job.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-900 dark:text-slate-50 font-medium">
                            {job.niche} {job.location ? `- ${job.location}` : ""}
                          </span>
                        </div>
                        <span className="text-slate-500 dark:text-slate-400">
                          {new Date(job.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
