"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import type { AdminActivityItem, ActivityType } from "@/types/adminActivity";
import { MetricCard } from "@/components/ui/metrics";
import { motion } from "framer-motion";

type ActivityTypeFilter = ActivityType | "all";

export default function AdminActivityPage() {
  const [items, setItems] = useState<AdminActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [actorUserId, setActorUserId] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [exporting, setExporting] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<Array<{ name: string; filters: Record<string, string> }>>([]);
  const [insightItems, setInsightItems] = useState<AdminActivityItem[]>([]);
  const [insightLoading, setInsightLoading] = useState(false);

  const formatDate = (date: Date) => date.toISOString().slice(0, 10);

  useEffect(() => {
    const stored = localStorage.getItem("admin_activity_presets");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPresets(parsed);
        }
      } catch {
        setPresets([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("admin_activity_presets", JSON.stringify(presets));
  }, [presets]);

  const metrics = useMemo(() => {
    const leadEvents = items.filter((a) => a.type.startsWith("lead_")).length;
    const emailEvents = items.filter((a) => a.type.startsWith("email_")).length;
    const campaignEvents = items.filter((a) => a.type.startsWith("campaign_")).length;
    const jobEvents = items.filter((a) => a.type.startsWith("job_")).length;
    return { total: items.length, leadEvents, emailEvents, campaignEvents, jobEvents };
  }, [items]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getAdminActivity({
        page,
        page_size: pageSize,
        workspace_id: workspaceId ? Number(workspaceId) : undefined,
        actor_user_id: actorUserId ? Number(actorUserId) : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        since: since || undefined,
        until: until || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err: any) {
      console.error("Error loading activity:", err);
      setError(err.response?.data?.detail || err.message || "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, workspaceId, actorUserId, typeFilter, since, until]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const loadInsights = async () => {
      setInsightLoading(true);
      try {
        const res = await apiClient.getAdminActivity({
          page: 1,
          page_size: 200,
          workspace_id: workspaceId ? Number(workspaceId) : undefined,
          actor_user_id: actorUserId ? Number(actorUserId) : undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
          since: since || undefined,
          until: until || undefined,
        });
        setInsightItems(res.items || []);
      } catch (err) {
        console.error("Failed to load admin activity insights:", err);
        setInsightItems([]);
      } finally {
        setInsightLoading(false);
      }
    };

    loadInsights();
  }, [workspaceId, actorUserId, typeFilter, since, until]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const adminInsightSummary = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const recent = insightItems.filter((item) => new Date(item.created_at).getTime() >= now - oneDay);
    const previous = insightItems.filter((item) => {
      const time = new Date(item.created_at).getTime();
      return time < now - oneDay && time >= now - 2 * oneDay;
    });

    const countByType = (itemsList: AdminActivityItem[]) =>
      itemsList.reduce<Record<string, number>>((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {});

    const recentCounts = countByType(recent);
    const previousCounts = countByType(previous);

    const anomalies = Object.keys(recentCounts)
      .map((type) => {
        const current = recentCounts[type] || 0;
        const prev = previousCounts[type] || 0;
        const delta = current - prev;
        const ratio = prev > 0 ? current / prev : null;
        const spike = prev === 0 ? current >= 5 : ratio !== null && ratio >= 1.6 && delta >= 3;
        return { type, current, prev, delta, spike };
      })
      .filter((entry) => entry.spike)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 4);

    return {
      recentCount: recent.length,
      previousCount: previous.length,
      delta: recent.length - previous.length,
      anomalies,
    };
  }, [insightItems]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const filters = {
      workspaceId,
      actorUserId,
      typeFilter,
      since,
      until,
    };
    setPresets((prev) => {
      const next = prev.filter((preset) => preset.name !== name);
      return [...next, { name, filters }];
    });
    setPresetName("");
  };

  const handleApplyPreset = (preset: { name: string; filters: Record<string, string> }) => {
    setWorkspaceId(preset.filters.workspaceId || "");
    setActorUserId(preset.filters.actorUserId || "");
    setTypeFilter((preset.filters.typeFilter as ActivityTypeFilter) || "all");
    setSince(preset.filters.since || "");
    setUntil(preset.filters.until || "");
    setPage(1);
  };

  const handleDeletePreset = (name: string) => {
    setPresets((prev) => prev.filter((preset) => preset.name !== name));
  };

  const applyQuickFilter = (days: number) => {
    const now = new Date();
    const sinceDate = days === 0 ? now : new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    setSince(formatDate(sinceDate));
    setUntil(formatDate(now));
    setPage(1);
  };

  const applyAnomalyFilter = (type: ActivityType) => {
    const now = new Date();
    const sinceDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    setTypeFilter(type);
    setSince(formatDate(sinceDate));
    setUntil(formatDate(now));
    setPage(1);
  };

  const handleExport = useCallback(async () => {
    try {
      setExporting(true);
      const blob = await apiClient.exportAdminActivityCsv({
        workspace_id: workspaceId ? Number(workspaceId) : undefined,
        actor_user_id: actorUserId ? Number(actorUserId) : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        since: since || undefined,
        until: until || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "admin_activity.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [workspaceId, actorUserId, typeFilter, since, until]);

  const handleQuickExport = useCallback(async (days: number) => {
    const now = new Date();
    const sinceDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const sinceValue = formatDate(sinceDate);
    const untilValue = formatDate(now);
    setSince(sinceValue);
    setUntil(untilValue);
    try {
      setExporting(true);
      const blob = await apiClient.exportAdminActivityCsv({
        workspace_id: workspaceId ? Number(workspaceId) : undefined,
        actor_user_id: actorUserId ? Number(actorUserId) : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        since: sinceValue,
        until: untilValue,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admin_activity_${days}d.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [actorUserId, typeFilter, workspaceId]);

  const typeOptions: ActivityTypeFilter[] = [
    "all",
    "lead_created",
    "lead_updated",
    "lead_score_updated",
    "email_found",
    "email_verified",
    "lead_added_to_list",
    "lead_removed_from_list",
    "campaign_created",
    "campaign_sent",
    "campaign_outcome_imported",
    "campaign_event",
    "task_created",
    "task_completed",
    "task_cancelled",
    "note_added",
    "playbook_run",
    "playbook_completed",
    "list_created",
    "list_marked_campaign_ready",
    "job_created",
    "job_completed",
    "job_failed",
    "integration_connected",
    "integration_disconnected",
    "workspace_created",
    "member_invited",
    "member_joined",
  ];

  function getActivityTypeColor(type: ActivityType): string {
    if (type.startsWith("lead_")) return "bg-blue-500/15 text-blue-300 border border-blue-400/60";
    if (type.startsWith("email_")) return "bg-cyan-500/15 text-cyan-300 border border-cyan-400/60";
    if (type.startsWith("campaign_")) return "bg-purple-500/15 text-purple-300 border border-purple-400/60";
    if (type.startsWith("job_")) return "bg-amber-500/15 text-amber-300 border border-amber-400/60";
    if (type.startsWith("task_")) return "bg-indigo-500/15 text-indigo-300 border border-indigo-400/60";
    if (type.startsWith("playbook_")) return "bg-emerald-500/15 text-emerald-300 border border-emerald-400/60";
    return "bg-slate-500/15 text-slate-300 border border-slate-400/60";
  }

  function formatActivityType(type: ActivityType): string {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function renderMeta(meta: any) {
    if (!meta || typeof meta !== "object") return "-";
    try {
      const keys = Object.keys(meta);
      if (keys.length === 0) return "-";
      const snippets = keys.slice(0, 2).map((k) => `${k}: ${String(meta[k])}`);
      return snippets.join(" | ");
    } catch {
      return "-";
    }
  }

  function formatRelativeTime(date: string): string {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Global Activity (Super Admin)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monitor all activity events across workspaces, users, and system actions.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            disabled={exporting}
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <div className="flex items-center gap-2">
            {[1, 7, 30].map((days) => (
              <button
                key={days}
                onClick={() => handleQuickExport(days)}
                className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 px-2.5 py-2 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                disabled={exporting}
              >
                Export {days}d
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-10 space-y-6">
        {error && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-4 py-3">
            <strong className="font-semibold">Error:</strong> {error}
          </div>
        )}

        {/* Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <MetricCard label="Total Events" value={metrics.total} />
          <MetricCard label="Lead Events" value={metrics.leadEvents} tone="info" />
          <MetricCard label="Email Events" value={metrics.emailEvents} tone="info" />
          <MetricCard label="Campaign Events" value={metrics.campaignEvents} tone="default" />
          <MetricCard label="Job Events" value={metrics.jobEvents} tone="info" />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricCard
            label="Last 24h"
            value={insightLoading ? "..." : adminInsightSummary.recentCount}
            tone="default"
          />
          <MetricCard
            label="Prev 24h"
            value={insightLoading ? "..." : adminInsightSummary.previousCount}
            tone="default"
          />
          <MetricCard
            label="24h Delta"
            value={insightLoading ? "..." : adminInsightSummary.delta}
            tone={adminInsightSummary.delta >= 0 ? "success" : "danger"}
          />
        </section>

        <section className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Anomaly alerts (last 24h vs prev)
          </div>
          {insightLoading ? (
            <div className="text-xs text-slate-500 dark:text-slate-400">Loading insights...</div>
          ) : adminInsightSummary.anomalies.length === 0 ? (
            <div className="text-xs text-slate-500 dark:text-slate-400">No spikes detected.</div>
          ) : (
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
              {adminInsightSummary.anomalies.map((entry) => (
                <div key={entry.type} className="flex items-center justify-between">
                  <span>{formatActivityType(entry.type as ActivityType)}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-rose-500">+{entry.delta}</span>
                    <button
                      onClick={() => applyAnomalyFilter(entry.type as ActivityType)}
                      className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:text-cyan-500"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Filters */}
        <section className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
            <input
              type="text"
              placeholder="Preset name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs w-40 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleSavePreset}
              className="inline-flex items-center rounded-xl bg-slate-900 text-white px-3 py-2 text-xs hover:bg-slate-800 transition-colors"
            >
              Save preset
            </button>
            <button
              type="button"
              onClick={() => {
                setWorkspaceId("");
                setActorUserId("");
                setTypeFilter("all");
                setSince("");
                setUntil("");
                setPage(1);
              }}
              className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              Clear filters
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => applyQuickFilter(0)}
                className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyQuickFilter(7)}
                className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                Last 7d
              </button>
              <button
                type="button"
                onClick={() => applyQuickFilter(30)}
                className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                Last 30d
              </button>
            </div>
            {presets.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {presets.map((preset) => (
                  <div key={preset.name} className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600"
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(preset.name)}
                      className="text-xs text-slate-400 hover:text-rose-500"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3 items-stretch sm:items-center">
            <input
              type="number"
              min={1}
              placeholder="Workspace ID"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs w-40 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="number"
              min={1}
              placeholder="User ID"
              value={actorUserId}
              onChange={(e) => setActorUserId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs w-40 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Since (YYYY-MM-DD)"
              value={since}
              onChange={(e) => setSince(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs w-44 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Until (YYYY-MM-DD)"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs w-44 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as ActivityTypeFilter);
                setPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
            >
              {typeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "all" ? "All types" : formatActivityType(opt as ActivityType)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-indigo-500 hover:bg-indigo-400 text-xs font-medium px-4 py-2 shadow-sm text-white transition-colors"
            >
              Apply filters
            </button>
          </form>
        </section>

        {/* Activity Table */}
        <section className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr className="text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 text-left font-medium">Time</th>
                  <th className="px-4 py-3 text-left font-medium">Workspace</th>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      Loading activity...
                    </td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-2xl">Chart</span>
                        <span>No activity found for this filter.</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  items.map((act) => (
                    <motion.tr
                      key={act.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/70 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="text-slate-900 dark:text-slate-50 font-medium">
                          {formatRelativeTime(act.created_at)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {new Date(act.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {act.workspace_id ? (
                          <span className="text-slate-900 dark:text-slate-50">#{act.workspace_id}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {act.actor_user_id ? (
                          <span className="text-slate-900 dark:text-slate-50">User #{act.actor_user_id}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${getActivityTypeColor(act.type)}`}>
                          {formatActivityType(act.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {renderMeta(act.meta)}
                      </td>
                    </motion.tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
            <span>
              Page {page} of {totalPages} - {total} events
            </span>
            <div className="space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
