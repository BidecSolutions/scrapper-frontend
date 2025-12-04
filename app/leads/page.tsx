"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiClient, type Lead } from "@/lib/api";
import { LeadDetailPanel } from "@/components/leads/LeadDetailPanel";
import { LeadRow as LeadRowComponent, ScorePill } from "@/components/leads/LeadRow";
import { Download, Search, ExternalLink, Users, Filter, X, Loader2 } from "lucide-react";
import { BulkActionsToolbar } from "@/components/leads/BulkActionsToolbar";
import { ScoreHeatBadge } from "@/components/leads/ScoreHeatBadge";
import { useToast } from "@/components/ui/Toast";
import { SavedViewsBar } from "@/components/saved-views/SavedViewsBar";
import { MetricCard } from "@/components/ui/metrics";
import type { SavedView } from "@/lib/api";

export default function LeadsPage() {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [minScore, setMinScore] = useState<number | null>(null);
  const [maxScore, setMaxScore] = useState<number | null>(null);

  useEffect(() => {
    // Debounce search to reduce API calls
    const timer = setTimeout(() => {
      loadLeads();
    }, searchQuery ? 500 : 100); // Longer debounce for search, shorter for filters

    return () => clearTimeout(timer);
  }, [searchQuery, sourceFilter, qualityFilter, minScore, maxScore]);

  const loadLeads = async (customFilters?: Record<string, any>) => {
    try {
      setLoading(true);
      const filters: Record<string, any> = customFilters || {};
      if (!customFilters) {
        if (searchQuery.trim()) {
          filters.search = searchQuery.trim();
        }
        if (sourceFilter) {
          filters.source = sourceFilter;
        }
        if (qualityFilter !== "all") {
          filters.quality = qualityFilter;
        }
        if (minScore !== null) {
          filters.min_score = minScore;
        }
        if (maxScore !== null) {
          filters.max_score = maxScore;
        }
      }
      const data = await apiClient.getLeads(undefined, filters);
      setLeads(data);
    } catch (error) {
      console.error("Failed to load leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyView = (view: SavedView) => {
    if (view.filters.search) {
      setSearchQuery(view.filters.search);
    } else {
      setSearchQuery("");
    }
    if (view.filters.source) {
      setSourceFilter(view.filters.source);
    } else {
      setSourceFilter(null);
    }
    if (view.filters.quality) {
      setQualityFilter(view.filters.quality as "all" | "high" | "medium" | "low");
    } else {
      setQualityFilter("all");
    }
    if (view.filters.min_score !== undefined) {
      setMinScore(view.filters.min_score);
    } else {
      setMinScore(null);
    }
    if (view.filters.max_score !== undefined) {
      setMaxScore(view.filters.max_score);
    } else {
      setMaxScore(null);
    }
    loadLeads(view.filters);
  };

  const handleExport = async (format: "csv" | "excel") => {
    if (leads.length === 0) {
      showToast({
        type: "error",
        title: "No leads to export",
        message: "Please wait for leads to load or create a job first.",
      });
      return;
    }

    try {
      setExporting(true);
      
      const filters: Record<string, any> = {};
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }
      
      const blob = await apiClient.exportLeads(format, filters);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `leads_${timestamp}.${format === "csv" ? "csv" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showToast({
        type: "success",
        title: "Export Successful",
        message: `Exported ${leads.length} leads as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      console.error("Failed to export leads:", error);
      const errorMessage = error?.response?.data?.detail || error?.message || "Failed to export leads. Please try again.";
      showToast({
        type: "error",
        title: "Export Failed",
        message: errorMessage,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsPanelOpen(true);
  };

  const stats = {
    high: leads.filter((l) => l.quality_label === "high").length,
    medium: leads.filter((l) => l.quality_label === "medium").length,
    low: leads.filter((l) => l.quality_label === "low").length,
    total: leads.length,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Leads"
        description="Browse and explore your enriched leads"
        icon={Users}
        action={
          <div className="flex gap-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("csv")}
                disabled={exporting || leads.length === 0}
                className="text-xs"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? "Exporting..." : "CSV"}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("excel")}
                disabled={exporting || leads.length === 0}
                className="text-xs"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? "Exporting..." : "Excel"}
              </Button>
            </motion.div>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-4 gap-4"
          >
            <MetricCard label="Total Leads" value={stats.total} icon={Users} />
            <MetricCard label="High Quality" value={stats.high} tone="success" />
            <MetricCard label="Medium Quality" value={stats.medium} tone="warning" />
            <MetricCard label="Low Quality" value={stats.low} tone="danger" />
          </motion.section>

          {/* Search and Filters */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-2xl"
          >
            <div className="space-y-4">
              <Input
                label="Search Leads"
                icon={Search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, website, city..."
                helperText="Search across all lead fields"
              />

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filters:
                </span>
                
                {/* Source Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Source:</span>
                  <div className="flex gap-2">
                    {["all", "linkedin_extension", "csv", "manual"].map((source) => (
                      <motion.button
                        key={source}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSourceFilter(source === "all" ? null : source)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                          (source === "all" && sourceFilter === null) || sourceFilter === source
                            ? "bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/40"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {source === "all" ? "All" : source === "linkedin_extension" ? "LinkedIn" : source === "csv" ? "CSV" : "Manual"}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Quality Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Quality:</span>
                  <div className="flex gap-2">
                    {["all", "high", "medium", "low"].map((quality) => (
                      <motion.button
                        key={quality}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setQualityFilter(quality as typeof qualityFilter)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                          qualityFilter === quality
                            ? quality === "high"
                              ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40"
                              : quality === "medium"
                              ? "bg-amber-500/20 text-amber-400 border-2 border-amber-500/40"
                              : quality === "low"
                              ? "bg-rose-500/20 text-rose-400 border-2 border-rose-500/40"
                              : "bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/40"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {quality.charAt(0).toUpperCase() + quality.slice(1)}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {(sourceFilter || qualityFilter !== "all" || minScore !== null || maxScore !== null) && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setSourceFilter(null);
                      setQualityFilter("all");
                      setMinScore(null);
                      setMaxScore(null);
                    }}
                    className="ml-auto px-3 py-1.5 text-xs rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear Filters
                  </motion.button>
                )}
              </div>
            </div>
          </motion.section>

          {/* Saved Views */}
          <SavedViewsBar
            pageType="leads"
            currentFilters={{
              search: searchQuery.trim() || undefined,
              source: sourceFilter || undefined,
              quality: qualityFilter !== "all" ? qualityFilter : undefined,
              min_score: minScore !== null ? minScore : undefined,
              max_score: maxScore !== null ? maxScore : undefined,
            }}
            onApplyView={handleApplyView}
          />

          {/* Bulk Actions */}
          {selectedLeads.size > 0 && (
            <BulkActionsToolbar
              selectedCount={selectedLeads.size}
              onClearSelection={() => setSelectedLeads(new Set())}
            />
          )}

          {/* Leads Table */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-r from-slate-50/50 to-white/50 dark:from-slate-900/50 dark:to-slate-800/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-500" />
                  Lead List ({stats.total})
                </h3>
                {selectedLeads.size > 0 && (
                  <span className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
                    {selectedLeads.size} selected
                  </span>
                )}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-12 text-center"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Loading leads...</p>
                </motion.div>
              ) : leads.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-12 text-center"
                >
                  <Users className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    No leads found
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {searchQuery || sourceFilter || qualityFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Create a scraping job to start collecting leads"}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="leads"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="divide-y divide-slate-200/50 dark:divide-slate-800/50"
                >
                  {leads.map((lead, index) => (
                    <motion.div
                      key={lead.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      whileHover={{ backgroundColor: "rgba(6, 182, 212, 0.05)" }}
                    >
                      <LeadRowComponent
                        lead={lead}
                        onClick={() => handleLeadClick(lead)}
                        selected={selectedLeads.has(lead.id)}
                        onSelect={(selected) => {
                          const newSet = new Set(selectedLeads);
                          if (selected) {
                            newSet.add(lead.id);
                          } else {
                            newSet.delete(lead.id);
                          }
                          setSelectedLeads(newSet);
                        }}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </div>
      </main>

      <LeadDetailPanel
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        lead={selectedLead}
      />
    </div>
  );
}
