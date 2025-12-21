"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import type { WorkspaceActivityItem, ActivityType } from "@/types/workspaceActivity";

type ActivityTypeFilter = ActivityType | "all";

const typeLabelMap: Record<string, string> = {
  job_created: "Job created",
  job_completed: "Job completed",
  job_failed: "Job failed",
  lead_created: "Lead created",
  lead_updated: "Lead updated",
  lead_score_updated: "Lead score updated",
  email_found: "Email found",
  email_verified: "Email verified",
  campaign_created: "Campaign created",
  campaign_sent: "Campaign sent",
  campaign_outcome_imported: "Campaign outcomes imported",
  campaign_event: "Campaign event",
  playbook_run: "Playbook run",
  playbook_completed: "Playbook completed",
  list_created: "List created",
  list_marked_campaign_ready: "List ready",
  task_created: "Task created",
  task_completed: "Task completed",
  task_cancelled: "Task cancelled",
  note_added: "Note added",
  member_invited: "Member invited",
  member_joined: "Member joined",
  deal_created: "Deal created",
  deal_stage_changed: "Deal stage changed",
  deal_won: "Deal won",
  deal_lost: "Deal lost",
  deal_updated: "Deal updated",
};

export default function WorkspaceActivityPage() {
  const [items, setItems] = useState<WorkspaceActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>("all");
  const [loading, setLoading] = useState(false);
  const [actorUserId, setActorUserId] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"feed" | "insights">("feed");
  const [insightItems, setInsightItems] = useState<WorkspaceActivityItem[]>([]);
  const [insightLoading, setInsightLoading] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<Array<{ name: string; filters: Record<string, string> }>>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const stored = localStorage.getItem("activity_saved_filters");
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
    localStorage.setItem("activity_saved_filters", JSON.stringify(presets));
  }, [presets]);

  useEffect(() => {
    if (filtersInitialized) return;
    const urlType = searchParams.get("type");
    const urlActor = searchParams.get("actor_user_id");
    const urlSince = searchParams.get("since");
    const urlUntil = searchParams.get("until");
    if (urlType) setTypeFilter(urlType as ActivityTypeFilter);
    if (urlActor) setActorUserId(urlActor);
    if (urlSince) setSince(urlSince);
    if (urlUntil) setUntil(urlUntil);
    setFiltersInitialized(true);
  }, [filtersInitialized, searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getWorkspaceActivity({
        page,
        page_size: pageSize,
        type: typeFilter !== "all" ? typeFilter : undefined,
        actor_user_id: actorUserId ? Number(actorUserId) : undefined,
        since: since || undefined,
        until: until || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, typeFilter, actorUserId, since, until]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const loadInsights = async () => {
      if (activeTab !== "insights") return;
      setInsightLoading(true);
      try {
        const res = await apiClient.getWorkspaceActivity({
          page: 1,
          page_size: 200,
          type: typeFilter !== "all" ? typeFilter : undefined,
          actor_user_id: actorUserId ? Number(actorUserId) : undefined,
          since: since || undefined,
          until: until || undefined,
        });
        setInsightItems(res.items || []);
      } finally {
        setInsightLoading(false);
      }
    };

    loadInsights();
  }, [activeTab, typeFilter, actorUserId, since, until]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const insightSummary = useMemo(() => {
    if (insightItems.length === 0) return { grouped: [], anomalies: [] };
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const recent = insightItems.filter((item) => new Date(item.created_at).getTime() >= now - oneDay);
    const previous = insightItems.filter((item) => {
      const time = new Date(item.created_at).getTime();
      return time < now - oneDay && time >= now - 2 * oneDay;
    });

    const countByType = (data: WorkspaceActivityItem[]) =>
      data.reduce<Record<string, number>>((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {});

    const recentCounts = countByType(recent);
    const previousCounts = countByType(previous);

    const grouped = Object.entries(recentCounts)
      .map(([type, count]) => ({ type, count, prev: previousCounts[type] || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const anomalies = grouped
      .map((entry) => {
        const delta = entry.count - entry.prev;
        const ratio = entry.prev > 0 ? entry.count / entry.prev : null;
        const spike = entry.prev === 0 ? entry.count >= 5 : ratio !== null && ratio >= 1.6 && delta >= 3;
        return { ...entry, delta, spike };
      })
      .filter((entry) => entry.spike)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 4);

    return { grouped, anomalies };
  }, [insightItems]);

  const userSummary = useMemo(() => {
    if (insightItems.length === 0) return [];
    const counts = insightItems.reduce<Record<string, number>>((acc, item) => {
      const key = item.actor_user_id ? `User #${item.actor_user_id}` : "System";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [insightItems]);

  const typeOptions: ActivityTypeFilter[] = [
    "all",
    "lead_created",
    "lead_updated",
    "email_found",
    "email_verified",
    "lead_added_to_list",
    "lead_removed_from_list",
    "lead_score_updated",
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
    "member_invited",
    "member_joined",
    "deal_created",
    "deal_stage_changed",
    "deal_won",
    "deal_lost",
    "deal_updated",
  ];

  function renderMeta(meta: any) {
    if (!meta) return "-";
    try {
      const keys = Object.keys(meta);
      if (keys.length === 0) return "-";
      const snippets = keys.slice(0, 2).map((k) => `${k}: ${String(meta[k])}`);
      return snippets.join(" | ");
    } catch {
      return "-";
    }
  }

  async function handleExport() {
    try {
      setExporting(true);
      const blob = await apiClient.exportWorkspaceActivityCsv({
        type: typeFilter !== "all" ? typeFilter : undefined,
        actor_user_id: actorUserId ? Number(actorUserId) : undefined,
        since: since || undefined,
        until: until || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "activity.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportJson() {
    try {
      setExportingJson(true);
      const res = await apiClient.getWorkspaceActivity({
        page: 1,
        page_size: 1000,
        type: typeFilter !== "all" ? typeFilter : undefined,
        actor_user_id: actorUserId ? Number(actorUserId) : undefined,
        since: since || undefined,
        until: until || undefined,
      });
      const payload = JSON.stringify(res.items || [], null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "activity.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setExportingJson(false);
    }
  }

  const csvPreviewRows = useMemo(() => {
    const preview = items.slice(0, 5);
    return preview.map((act) => ({
      time: new Date(act.created_at).toISOString(),
      user: act.actor_user_id ? `User #${act.actor_user_id}` : "System",
      type: act.type,
      details: renderMeta(act.meta),
    }));
  }, [items]);

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const filters = {
      type: typeFilter,
      actor_user_id: actorUserId,
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
    setTypeFilter((preset.filters.type as ActivityTypeFilter) || "all");
    setActorUserId(preset.filters.actor_user_id || "");
    setSince(preset.filters.since || "");
    setUntil(preset.filters.until || "");
  };

  const handleDeletePreset = (name: string) => {
    setPresets((prev) => prev.filter((preset) => preset.name !== name));
  };

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (actorUserId) params.set("actor_user_id", actorUserId);
    if (since) params.set("since", since);
    if (until) params.set("until", until);
    const query = params.toString();
    return query ? `?${query}` : "";
  };

  const handleApplyFilters = () => {
    const query = buildQueryString();
    router.replace(`${pathname}${query}`);
  };

  const handleShareLink = async () => {
    const query = buildQueryString();
    const url = `${window.location.origin}${pathname}${query}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Share link copied to clipboard.");
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  function handleExportSummary() {
    if (insightItems.length === 0) return;
    const rows = ["section,label,count"];
    insightSummary.grouped.forEach((entry) => {
      rows.push(`type,${typeLabelMap[entry.type] || entry.type},${entry.count}`);
    });
    userSummary.forEach((entry) => {
      rows.push(`user,${entry.label},${entry.count}`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "activity_summary.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Workspace Activity</h1>
          <div className="inline-flex items-center gap-2 text-sm">
            <button
              onClick={() => setActiveTab("feed")}
              className={`rounded-full px-3 py-1.5 border text-xs font-semibold ${
                activeTab === "feed"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Feed
            </button>
            <button
              onClick={() => setActiveTab("insights")}
              className={`rounded-full px-3 py-1.5 border text-xs font-semibold ${
                activeTab === "insights"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Insights
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
            disabled={exporting}
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <button
            onClick={handleExportJson}
            className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
            disabled={exportingJson}
          >
            {exportingJson ? "Exporting..." : "Export JSON"}
          </button>
          <button
            onClick={handleShareLink}
            className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
          >
            Share link
          </button>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ActivityTypeFilter)}
            className="border rounded px-3 py-2 text-sm"
          >
            {typeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "all" ? "All types" : opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <input
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          placeholder="Preset name"
          className="border rounded px-3 py-2"
        />
        <button
          onClick={handleSavePreset}
          className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
        >
          Save preset
        </button>
        <button
          onClick={() => {
            setTypeFilter("all");
            setActorUserId("");
            setSince("");
            setUntil("");
          }}
          className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
        >
          Clear filters
        </button>
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <div key={preset.name} className="inline-flex items-center gap-2 border rounded-full px-3 py-1">
                <button onClick={() => handleApplyPreset(preset)}>{preset.name}</button>
                <button onClick={() => handleDeletePreset(preset.name)} className="text-slate-400">
                  x
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={handleApplyFilters}
          className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
        >
          Apply filters
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <input
          value={actorUserId}
          onChange={(e) => setActorUserId(e.target.value)}
          placeholder="Actor user ID"
          className="border rounded px-3 py-2"
        />
        <input
          value={since}
          onChange={(e) => setSince(e.target.value)}
          placeholder="Since (YYYY-MM-DD)"
          className="border rounded px-3 py-2"
        />
        <input
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          placeholder="Until (YYYY-MM-DD)"
          className="border rounded px-3 py-2"
        />
      </div>

      {activeTab === "insights" && (
        <div className="border rounded-md p-4 bg-white">
          {insightLoading ? (
            <div className="text-sm text-gray-500">Loading insights.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-700">Insight summary</div>
                <button
                  onClick={handleExportSummary}
                  className="border rounded px-3 py-1.5 text-xs hover:bg-gray-50"
                >
                  Export summary
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {insightSummary.grouped.map((entry) => (
                  <div key={entry.type} className="border rounded-md p-3 bg-gray-50">
                    <div className="text-xs text-gray-500">{typeLabelMap[entry.type] || entry.type}</div>
                    <div className="text-xl font-semibold text-gray-900">{entry.count}</div>
                    <div className={`text-xs ${entry.count - entry.prev >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {entry.count === entry.prev
                        ? "No change vs prev 24h"
                        : `${entry.count - entry.prev > 0 ? "+" : ""}${entry.count - entry.prev} vs prev 24h`}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border rounded-md p-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">Anomaly signals</div>
                {insightSummary.anomalies.length === 0 ? (
                  <div className="text-xs text-gray-500">No spikes detected in the last 24 hours.</div>
                ) : (
                  <div className="space-y-1 text-xs text-gray-600">
                    {insightSummary.anomalies.map((entry) => (
                      <div key={entry.type} className="flex items-center justify-between">
                        <span>{typeLabelMap[entry.type] || entry.type}</span>
                        <span className="font-semibold text-rose-600">+{entry.delta} vs prev 24h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border rounded-md p-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">Activity volume by type</div>
                {insightSummary.grouped.length === 0 ? (
                  <div className="text-xs text-gray-500">No activity in this window.</div>
                ) : (
                  <div className="space-y-2 text-xs text-gray-600">
                    {(() => {
                      const maxCount = Math.max(...insightSummary.grouped.map((entry) => entry.count), 1);
                      return insightSummary.grouped.map((entry) => (
                        <div key={`chart-${entry.type}`} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span>{typeLabelMap[entry.type] || entry.type}</span>
                            <span className="text-gray-700 font-semibold">{entry.count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full bg-purple-500"
                              style={{ width: `${Math.round((entry.count / maxCount) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              <div className="border rounded-md p-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">Top actors</div>
                {userSummary.length === 0 ? (
                  <div className="text-xs text-gray-500">No actor activity in this window.</div>
                ) : (
                  <div className="space-y-1 text-xs text-gray-600">
                    {(() => {
                      const maxCount = Math.max(...userSummary.map((entry) => entry.count), 1);
                      return userSummary.map((entry) => (
                        <div key={entry.label} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span>{entry.label}</span>
                            <span className="font-semibold text-gray-700">{entry.count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full bg-amber-500"
                              style={{ width: `${Math.round((entry.count / maxCount) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-gray-400">
                Insight mode uses the latest 200 events with current filters.
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "feed" && (
        <div className="space-y-4">
          <div className="border rounded-md bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-700">CSV preview (first 5 rows)</div>
              <span className="text-xs text-gray-500">Time, User, Type, Details</span>
            </div>
            {csvPreviewRows.length === 0 ? (
              <div className="text-xs text-gray-500">No rows to preview.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Time</th>
                      <th className="px-3 py-2 text-left font-medium">User</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-left font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreviewRows.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2 text-gray-600">{row.time}</td>
                        <td className="px-3 py-2 text-gray-600">{row.user}</td>
                        <td className="px-3 py-2 text-gray-600">{row.type}</td>
                        <td className="px-3 py-2 text-gray-600">{row.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Time</th>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No activity yet.
                    </td>
                  </tr>
                )}
                {!loading &&
                  items.map((act) => (
                    <tr key={act.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {new Date(act.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {act.actor_user_id ? `User #${act.actor_user_id}` : "System"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded bg-gray-100 text-xs">
                          {act.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{renderMeta(act.meta)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "feed" && totalPages > 1 && (
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            Page {page} of {totalPages} - {total} events
          </span>
          <div className="space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border rounded px-3 py-1 disabled:opacity-50 hover:bg-gray-50"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border rounded px-3 py-1 disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

