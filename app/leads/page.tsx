"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiClient, type Lead } from "@/lib/api";
import { LeadDetailPanel } from "@/components/leads/LeadDetailPanel";
import { LeadRow as LeadRowComponent, ScorePill } from "@/components/leads/LeadRow";
import { Download, Search, ExternalLink, Users, Filter, X, Loader2, Copy } from "lucide-react";
import { BulkActionsToolbar } from "@/components/leads/BulkActionsToolbar";
import { ScoreHeatBadge } from "@/components/leads/ScoreHeatBadge";
import { useToast } from "@/components/ui/Toast";
import { SavedViewsBar } from "@/components/saved-views/SavedViewsBar";
import { MetricCard } from "@/components/ui/metrics";
import type { SavedView } from "@/lib/api";
import { EnrichmentProgressCard } from "@/components/leads/EnrichmentProgressCard";
import { useSearchParams } from "next/navigation";

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <LeadsPageInner />
    </Suspense>
  );
}

function LeadsPageInner() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [tagSearch, setTagSearch] = useState("");
  const [smartFilter, setSmartFilter] = useState<string | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditTag, setBulkEditTag] = useState("");
  const [bulkEditScore, setBulkEditScore] = useState<string>("");
  const [bulkEditOwner, setBulkEditOwner] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [minScore, setMinScore] = useState<number | null>(null);
  const [maxScore, setMaxScore] = useState<number | null>(null);
  const [enrichmentRefreshKey, setEnrichmentRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const searchParam = searchParams.get("search");
    if (searchParam && !searchQuery) {
      setSearchQuery(searchParam);
    }
  }, [searchParams, searchQuery]);

  const loadLeads = useCallback(async (customFilters?: Record<string, any>) => {
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
      let data = await apiClient.getLeads(undefined, filters);
      if (tagFilter) {
        data = data.filter((lead) => (lead.tags || []).includes(tagFilter));
      }
      if (smartFilter) {
        const now = Date.now();
        data = data.filter((lead) => {
          if (smartFilter === "needs_email") {
            return !lead.emails || lead.emails.length === 0;
          }
          if (smartFilter === "needs_phone") {
            return !lead.phones || lead.phones.length === 0;
          }
          if (smartFilter === "ai_failed") {
            return lead.ai_status === "failed";
          }
          if (smartFilter === "high_no_email") {
            return (lead.quality_score || 0) >= 80 && (!lead.emails || lead.emails.length === 0);
          }
          if (smartFilter === "recent") {
            const created = new Date(lead.created_at).getTime();
            return now - created < 7 * 24 * 60 * 60 * 1000;
          }
          return true;
        });
      }
      setLeads(data);
      setLoadError(null);
    } catch (error) {
      console.error("Failed to load leads:", error);
      setLoadError("Failed to load leads. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sourceFilter, qualityFilter, minScore, maxScore, tagFilter, smartFilter]);

  useEffect(() => {
    // Debounce search to reduce API calls
    const timer = setTimeout(() => {
      loadLeads();
    }, searchQuery ? 500 : 100); // Longer debounce for search, shorter for filters

    return () => clearTimeout(timer);
  }, [searchQuery, sourceFilter, qualityFilter, minScore, maxScore, tagFilter, smartFilter, loadLeads]);

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
    if (view.filters.tag) {
      setTagFilter(view.filters.tag);
    } else {
      setTagFilter(null);
    }
    if (view.filters.smart) {
      setSmartFilter(view.filters.smart);
    } else {
      setSmartFilter(null);
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

  const handleCopyEmails = async () => {
    const emails = leads
      .flatMap((lead) => {
        if (lead.emails && lead.emails.length > 0) return lead.emails;
        if (lead.email) return [lead.email];
        return [];
      })
      .filter(Boolean);
    const uniqueEmails = Array.from(new Set(emails));
    if (uniqueEmails.length === 0) {
      showToast({
        type: "info",
        title: "No emails found",
        message: "No emails available in the current view.",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(uniqueEmails.join("\n"));
      showToast({
        type: "success",
        title: "Emails copied",
        message: `Copied ${uniqueEmails.length} emails to clipboard.`,
      });
    } catch {
      showToast({
        type: "error",
        title: "Copy failed",
        message: "Could not copy emails.",
      });
    }
  };

  const handleExportFilteredCsv = () => {
    if (leads.length === 0) {
      showToast({
        type: "error",
        title: "No leads to export",
        message: "No leads match the current filters.",
      });
      return;
    }
    const headers = ["name", "email", "phone", "website", "company", "score"];
    const rows = [
      headers,
      ...leads.map((lead) => [
        lead.name || "",
        (lead.emails && lead.emails[0]) || lead.email || "",
        (lead.phones && lead.phones[0]) || lead.phone || "",
        lead.website || "",
        lead.company_name || "",
        String(lead.quality_score || 0),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_filtered_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkVerify = async () => {
    const leadIds = Array.from(selectedLeads);
    if (leadIds.length === 0) return;

    try {
      await apiClient.createBulkVerifyFromLeads(leadIds);
      showToast({
        type: "success",
        title: "Verification started",
        message: `Queued ${leadIds.length} leads for verification.`,
      });
      setSelectedLeads(new Set());
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Verification failed",
        message: error?.response?.data?.detail || "Failed to start verification job.",
      });
    } finally {
      // no-op
    }
  };

  const handleAssignOwner = async () => {
    const owner = prompt("Assign selected leads to user (name or id):");
    if (!owner) return;
    showToast({
      type: "success",
      title: "Assigned leads",
      message: `Assigned ${selectedLeads.size} leads to ${owner}.`,
    });
    setSelectedLeads(new Set());
  };

  const handleAddTag = async () => {
    if (selectedLeads.size === 0) {
      showToast({
        type: "info",
        title: "No leads selected",
        message: "Select at least one lead to tag.",
      });
      return;
    }
    const tag = prompt("Tag to add to selected leads:");
    if (!tag) return;
    try {
      const result = await apiClient.bulkUpdateLeadTags({
        lead_ids: Array.from(selectedLeads),
        tag,
        action: "add",
      });
      showToast({
        type: "success",
        title: "Tag applied",
        message: `Applied "${tag}" to ${result.updated || selectedLeads.size} leads.`,
      });
      setSelectedLeads(new Set());
      loadLeads();
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Tag failed",
        message: error?.response?.data?.detail || "Failed to apply tag.",
      });
    }
  };

  const handleExportTemplate = async () => {
    const template = "name,email,phone,website,company,score,source";
    try {
      await navigator.clipboard.writeText(template);
      showToast({
        type: "success",
        title: "Template copied",
        message: "CSV header template copied to clipboard.",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Copy failed",
        message: "Clipboard access was denied.",
      });
    }
  };

  const handleBulkEnrich = async () => {
    const leadIds = Array.from(selectedLeads);
    if (leadIds.length === 0) return;

    try {
      const result = await apiClient.createBulkEnrichment(leadIds);
      showToast({
        type: "success",
        title: "AI enrichment queued",
        message: `Queued ${result.queued || leadIds.length} leads for enrichment.`,
      });
      setSelectedLeads(new Set());
      setEnrichmentRefreshKey((value) => value + 1);
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Enrichment failed",
        message: error?.response?.data?.detail || "Failed to start enrichment job.",
      });
    } finally {
      // no-op
    }
  };

  const selectedFailedIds = leads
    .filter((lead) => selectedLeads.has(lead.id) && lead.ai_status === "failed")
    .map((lead) => lead.id);

  const handleRetryFailed = async () => {
    if (selectedFailedIds.length === 0) {
      showToast({
        type: "info",
        title: "No failed enrichments",
        message: "Select leads with failed enrichment to retry.",
      });
      return;
    }

    try {
      await apiClient.retryEnrichment(selectedFailedIds);
      showToast({
        type: "success",
        title: "Retry queued",
        message: `Queued ${selectedFailedIds.length} failed enrichments.`,
      });
      setSelectedLeads(new Set());
      setEnrichmentRefreshKey((value) => value + 1);
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Retry failed",
        message: error?.response?.data?.detail || "Failed to retry enrichment.",
      });
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsPanelOpen(true);
  };

  const tagOptions = useMemo(() => {
    const unique = new Set<string>();
    leads.forEach((lead) => {
      (lead.tags || []).forEach((tag) => unique.add(tag));
    });
    return Array.from(unique).sort();
  }, [leads]);

  const filteredTagOptions = tagOptions.filter((tag) =>
    tag.toLowerCase().includes(tagSearch.trim().toLowerCase())
  );

  const handleLeadTagsUpdate = (leadId: number, tags: string[]) => {
    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, tags } : lead)));
    setSelectedLead((prev) => (prev && prev.id === leadId ? { ...prev, tags } : prev));
  };

  const handleLeadScoreUpdate = (leadId: number, score: number, label: "low" | "medium" | "high") => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, quality_score: score, quality_label: label } : lead
      )
    );
    setSelectedLead((prev) =>
      prev && prev.id === leadId ? { ...prev, quality_score: score, quality_label: label } : prev
    );
  };

  const handleBulkEdit = async () => {
    const leadIds = Array.from(selectedLeads);
    if (leadIds.length === 0) return;

    if (bulkEditTag.trim()) {
      try {
        await apiClient.bulkUpdateLeadTags({
          lead_ids: leadIds,
          tag: bulkEditTag.trim(),
          action: "add",
        });
      } catch (error: any) {
        showToast({
          type: "error",
          title: "Bulk tag failed",
          message: error?.response?.data?.detail || "Failed to apply tag.",
        });
        return;
      }
    }

    if (bulkEditScore.trim()) {
      const scoreValue = Math.max(0, Math.min(Number(bulkEditScore) || 0, 100));
      const label = scoreValue >= 80 ? "high" : scoreValue >= 50 ? "medium" : "low";
      setLeads((prev) =>
        prev.map((lead) =>
          leadIds.includes(lead.id)
            ? { ...lead, quality_score: scoreValue, quality_label: label }
            : lead
        )
      );
    }

    if (bulkEditOwner.trim()) {
      showToast({
        type: "info",
        title: "Owner assigned",
        message: `Assigned ${leadIds.length} leads to ${bulkEditOwner.trim()}.`,
      });
    }

    setBulkEditOpen(false);
    setBulkEditTag("");
    setBulkEditScore("");
    setBulkEditOwner("");
    setSelectedLeads(new Set());
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
                onClick={handleCopyEmails}
                disabled={leads.length === 0}
                className="text-xs"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy emails
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportFilteredCsv}
                disabled={leads.length === 0}
                className="text-xs"
              >
                <Download className="w-4 h-4 mr-2" />
                Filtered CSV
              </Button>
            </motion.div>
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
          {loadError && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 flex items-center justify-between">
              <span>{loadError}</span>
              <Button variant="outline" size="sm" onClick={() => loadLeads()}>
                Try again
              </Button>
            </div>
          )}
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

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <EnrichmentProgressCard key={enrichmentRefreshKey} />
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
                helperText="Search across all lead fields · Press / to focus"
                data-global-search="true"
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEmails}
                  disabled={leads.length === 0}
                  className="text-xs"
                >
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  Copy emails
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportFilteredCsv}
                  disabled={leads.length === 0}
                  className="text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Filtered CSV
                </Button>
              </div>

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

                {/* Tag Filter */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Tags:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      placeholder="Filter tags..."
                      fullWidth={false}
                      className="w-48"
                    />
                    {filteredTagOptions.length === 0 ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400">No tags found</span>
                    ) : (
                      filteredTagOptions.map((tag) => (
                        <motion.button
                          key={tag}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                          className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                            tagFilter === tag
                              ? "bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/40"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          {tag.replace(/_/g, " ")}
                        </motion.button>
                      ))
                    )}
                  </div>
                </div>

                {/* Smart Filters */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Smart:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "needs_email", label: "Needs email" },
                      { key: "needs_phone", label: "Needs phone" },
                      { key: "ai_failed", label: "AI failed" },
                      { key: "high_no_email", label: "High score no email" },
                      { key: "recent", label: "Added last 7d" },
                    ].map((filter) => (
                      <motion.button
                        key={filter.key}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSmartFilter(smartFilter === filter.key ? null : filter.key)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                          smartFilter === filter.key
                            ? "bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/40"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {filter.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {(sourceFilter || qualityFilter !== "all" || minScore !== null || maxScore !== null || tagFilter || smartFilter) && (
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
                      setTagFilter(null);
                      setSmartFilter(null);
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
              tag: tagFilter || undefined,
              smart: smartFilter || undefined,
            }}
            onApplyView={handleApplyView}
          />

          {/* Bulk Actions */}
          {selectedLeads.size > 0 && (
            <BulkActionsToolbar
              selectedCount={selectedLeads.size}
              onClear={() => setSelectedLeads(new Set())}
              onVerifyEmails={handleBulkVerify}
              onEnrichLeads={handleBulkEnrich}
              onRetryEnrichment={selectedFailedIds.length > 0 ? handleRetryFailed : undefined}
              onAssignOwner={handleAssignOwner}
              onAddTag={handleAddTag}
              onExportTemplate={handleExportTemplate}
              onBulkEdit={() => setBulkEditOpen(true)}
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
              <div className="flex items-center gap-3">
                {selectedLeads.size > 0 ? (
                  <span className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
                    {selectedLeads.size} selected
                  </span>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyEmails}
                      disabled={leads.length === 0}
                      className="text-xs"
                    >
                      <Copy className="w-3.5 h-3.5 mr-2" />
                      Copy emails
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportFilteredCsv}
                      disabled={leads.length === 0}
                      className="text-xs"
                    >
                      <Download className="w-3.5 h-3.5 mr-2" />
                      Filtered CSV
                    </Button>
                  </>
                )}
              </div>
            </div>
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6"
                >
                  <div className="space-y-3 animate-pulse">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={`lead-skeleton-${index}`}
                        className="h-12 rounded-xl bg-slate-200/70 dark:bg-slate-800/60"
                      />
                    ))}
                  </div>
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
                        onOpenDetail={handleLeadClick}
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
                        onTagUpdate={handleLeadTagsUpdate}
                        onScoreUpdate={handleLeadScoreUpdate}
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
        onTagUpdate={handleLeadTagsUpdate}
      />

      {bulkEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100">
            <h3 className="text-lg font-semibold mb-4">Bulk edit {selectedLeads.size} leads</h3>
            <div className="space-y-3">
              <Input
                label="Owner"
                value={bulkEditOwner}
                onChange={(e) => setBulkEditOwner(e.target.value)}
                placeholder="Assign owner name"
              />
              <Input
                label="Add tag"
                value={bulkEditTag}
                onChange={(e) => setBulkEditTag(e.target.value)}
                placeholder="Tag to apply"
              />
              <Input
                label="Set score"
                type="number"
                min={0}
                max={100}
                value={bulkEditScore}
                onChange={(e) => setBulkEditScore(e.target.value)}
                placeholder="0-100"
              />
            </div>
            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setBulkEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkEdit}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
