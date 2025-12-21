"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { Segment } from "@/types/segments";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Layers, Loader2, Trash2, Edit2, Users, Search, Download, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";

function getSegmentScore(segment: Segment): number {
  const totalLeads = segment.total_leads || 0;
  const leadScore = Math.min(40, Math.round(Math.log10(totalLeads + 1) * 20));
  const createdAt = new Date(segment.created_at).getTime();
  const daysOld = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
  const recencyScore = daysOld <= 7 ? 20 : daysOld <= 30 ? 10 : 0;
  const filterCount = segment.filter_json ? Object.keys(segment.filter_json).length : 0;
  const filterScore = Math.min(20, filterCount * 4);
  return Math.min(100, 20 + leadScore + recencyScore + filterScore);
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs work";
}

export default function SegmentsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [minScoreFilter, setMinScoreFilter] = useState<number | null>(null);
  const [savedQueries, setSavedQueries] = useState<Array<{ name: string; minScore: number | null; search: string }>>([]);
  const [queryName, setQueryName] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getSegments();
      setSegments(data);
      setLoadError(null);
    } catch (err: any) {
      console.error("Error loading segments:", err);
      setLoadError(err?.response?.data?.detail || "Failed to load segments.");
      showToast({
        type: "error",
        title: "Failed to load segments",
        message: err?.response?.data?.detail || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("segments_saved_queries");
      const parsed = stored ? JSON.parse(stored) : [];
      setSavedQueries(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSavedQueries([]);
    }
  }, []);

  const handleDelete = async (segmentId: number) => {
    if (!confirm("Are you sure you want to delete this segment?")) return;
    
    try {
      await apiClient.deleteSegment(segmentId);
      showToast({
        type: "success",
        title: "Segment deleted",
        message: "The segment has been successfully deleted.",
      });
      load();
    } catch (err: any) {
      console.error("Error deleting segment:", err);
      showToast({
        type: "error",
        title: "Failed to delete segment",
        message: err?.response?.data?.detail || "Please try again",
      });
    }
  };

  const filteredSegments = segments.filter((segment) =>
    segment.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const scoredSegments = filteredSegments.map((segment) => ({
    segment,
    score: getSegmentScore(segment),
  }));
  const advancedFiltered = scoredSegments.filter(({ score }) =>
    minScoreFilter !== null ? score >= minScoreFilter : true
  );
  const avgScore =
    advancedFiltered.length > 0
      ? Math.round(advancedFiltered.reduce((sum, item) => sum + item.score, 0) / advancedFiltered.length)
      : 0;
  const strongSegments = advancedFiltered.filter((item) => item.score >= 80).length;
  const newSegments = advancedFiltered.filter(({ segment }) => {
    const createdAt = new Date(segment.created_at).getTime();
    return Date.now() - createdAt <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const topFilterKeys = segments
    .flatMap((segment) => Object.keys(segment.filter_json || {}))
    .reduce((acc: Record<string, number>, key) => {
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  const topFilters = Object.entries(topFilterKeys)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key]) => key.replace(/_/g, " "));

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

  const handleSaveQuery = () => {
    if (!queryName.trim()) return;
    const next = [
      { name: queryName.trim(), minScore: minScoreFilter, search: searchQuery },
      ...savedQueries,
    ].slice(0, 10);
    setSavedQueries(next);
    localStorage.setItem("segments_saved_queries", JSON.stringify(next));
    setQueryName("");
  };

  const handleApplyQuery = (query: { name: string; minScore: number | null; search: string }) => {
    setSearchQuery(query.search);
    setMinScoreFilter(query.minScore);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setMinScoreFilter(null);
  };

  const handleExportSegments = () => {
    if (advancedFiltered.length === 0) {
      showToast({
        type: "error",
        title: "No segments to export",
        message: "No segments match the current filters.",
      });
      return;
    }
    const headers = ["id", "name", "total_leads", "created_at", "score"];
    const rows = [
      headers,
      ...advancedFiltered.map(({ segment, score }) => [
        String(segment.id),
        segment.name || "",
        String(segment.total_leads || 0),
        segment.created_at || "",
        String(score),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `segments_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySegmentLinks = async () => {
    if (advancedFiltered.length === 0) {
      showToast({
        type: "info",
        title: "No segments to copy",
        message: "No segments match the current filters.",
      });
      return;
    }
    const baseUrl = window.location.origin;
    const links = advancedFiltered.map(({ segment }) => `${baseUrl}/segments/${segment.id}`);
    try {
      await navigator.clipboard.writeText(links.join("\n"));
      showToast({
        type: "success",
        title: "Links copied",
        message: `Copied ${links.length} segment links.`,
      });
    } catch {
      showToast({
        type: "error",
        title: "Copy failed",
        message: "Could not copy segment links.",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Segments"
        description="Organize leads into segments for targeted campaigns"
        icon={Layers}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCopySegmentLinks} disabled={advancedFiltered.length === 0}>
              <Copy className="w-4 h-4 mr-2" />
              Copy links
            </Button>
            <Button variant="outline" onClick={handleExportSegments} disabled={advancedFiltered.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => router.push("/segments/new")}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Segment
              </Button>
            </motion.div>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {loadError && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 flex items-center justify-between">
              <span>{loadError}</span>
              <Button variant="outline" size="sm" onClick={load}>
                Try again
              </Button>
            </div>
          )}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Avg. Quality Score</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{avgScore}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{strongSegments} strong segments</p>
            </div>
            <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">New This Week</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{newSegments}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{filteredSegments.length} total segments</p>
            </div>
            <div className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Top Filters</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {topFilters.length > 0 ? (
                  topFilters.map((key) => (
                    <span
                      key={key}
                      className="px-2 py-1 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                    >
                      {key}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">No filters available</span>
                )}
              </div>
            </div>
          </motion.section>

          {/* Search */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-2xl"
          >
            <Input
              label="Search Segments"
              icon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              helperText={`${advancedFiltered.length} segment${advancedFiltered.length !== 1 ? "s" : ""} found · Press / to focus`}
              data-global-search="true"
            />
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>Min score:</span>
              <input
                type="number"
                min={0}
                max={100}
                value={minScoreFilter ?? ""}
                onChange={(e) => setMinScoreFilter(e.target.value ? Number(e.target.value) : null)}
                className="w-24 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-2 py-1"
              />
              {(searchQuery || minScoreFilter !== null) && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-800 px-3 py-1 text-xs text-slate-600 dark:text-slate-300"
                >
                  <RefreshCw className="w-3 h-3" />
                  Clear filters
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <input
                  value={queryName}
                  onChange={(e) => setQueryName(e.target.value)}
                  placeholder="Save query name"
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-2 py-1 text-xs"
                />
                <Button variant="outline" size="sm" onClick={handleSaveQuery}>
                  Save query
                </Button>
              </div>
            </div>
            {savedQueries.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {savedQueries.map((query) => (
                  <button
                    key={query.name}
                    onClick={() => handleApplyQuery(query)}
                    className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    {query.name}
                  </button>
                ))}
              </div>
            )}
          </motion.section>

          {/* Segments Grid */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.section
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="rounded-3xl border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl animate-pulse"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
                    <div className="mt-4 h-4 w-2/3 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-slate-200/60 dark:bg-slate-800/60" />
                    <div className="mt-6 h-3 w-24 rounded bg-slate-200/60 dark:bg-slate-800/60" />
                    <div className="mt-2 h-3 w-32 rounded bg-slate-200/60 dark:bg-slate-800/60" />
                  </div>
                ))}
              </motion.section>
            ) : advancedFiltered.length === 0 ? (
              <motion.section
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-12 text-center shadow-2xl"
              >
                <Layers className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
                  {searchQuery ? "No segments found" : "No segments yet"}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Create your first segment to organize leads"}
                </p>
                {!searchQuery && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => router.push("/segments/new")}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Segment
                    </Button>
                  </motion.div>
                )}
              </motion.section>
            ) : (
              <motion.section
                key="segments"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                {advancedFiltered.map(({ segment, score }, index) => (
                  <motion.div
                    key={segment.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl hover:shadow-2xl transition-all cursor-pointer group"
                    onClick={() => router.push(`/segments/${segment.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg">
                        <Layers className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/segments/${segment.id}/edit`);
                          }}
                          aria-label="Edit segment"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                        >
                          <Edit2 className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(segment.id);
                          }}
                          aria-label="Delete segment"
                          className="p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {segment.name}
                    </h3>
                    {segment.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                        {segment.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                          Score {score}
                        </span>
                        <span>{getScoreLabel(score)}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {Object.keys(segment.filter_json || {}).length} filters
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Users className="w-4 h-4" />
                        <span className="font-semibold text-slate-900 dark:text-slate-50">
                          {segment.total_leads || 0}
                        </span>
                        <span>leads</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(segment.created_at)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
