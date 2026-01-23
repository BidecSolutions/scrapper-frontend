"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormCard } from "@/components/ui/FormCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient, API_URL } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import {
  Search,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  Loader2,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  Building2,
  Navigation,
} from "lucide-react";

interface BusinessResult {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  rating?: number | null;
  reviews?: number | null;
  category?: string | null;
  open_status?: string | null;
}
type ScoredBusiness = BusinessResult & { score: number };

export default function GoogleMapsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BusinessResult[]>([]);
  const [searchParams, setSearchParams] = useState({
    query: "",
    location: "",
    max_results: 20,
    extract_emails: true,
    headless: false,
    aggressive_scroll: true,
  });
  const [filters, setFilters] = useState({
    emailOnly: false,
    phoneOnly: false,
    websiteOnly: false,
  });
  const [sortBy, setSortBy] = useState<"score" | "rating" | "reviews" | "name">("score");
  const [minScore, setMinScore] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [minReviews, setMinReviews] = useState(0);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [locationMatchOnly, setLocationMatchOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [recentSearches, setRecentSearches] = useState<
    Array<{ query: string; location: string }>
  >([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const prefsLoadedRef = useRef(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedCluster, setSelectedCluster] = useState("all");
  const [visibleCount, setVisibleCount] = useState(0);
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Extension imports
  const [importsLoading, setImportsLoading] = useState(false);
  const [recentImports, setRecentImports] = useState<
    Array<{
      id: number;
      name?: string | null;
      website?: string | null;
      address?: string | null;
      emails: string[];
      phones: string[];
      created_at?: string | null;
    }>
  >([]);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<number>>(new Set());
  const [enrichLoading, setEnrichLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("google_maps_recent");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed);
        }
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("google_maps_recent", JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    const stored = localStorage.getItem("google_maps_prefs");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed.searchParams) {
        setSearchParams((prev) => ({ ...prev, ...parsed.searchParams }));
      }
      if (parsed.filters) {
        setFilters((prev) => ({ ...prev, ...parsed.filters }));
      }
      if (parsed.sortBy) setSortBy(parsed.sortBy);
      if (typeof parsed.minScore === "number") setMinScore(parsed.minScore);
      if (typeof parsed.minRating === "number") setMinRating(parsed.minRating);
      if (typeof parsed.minReviews === "number") setMinReviews(parsed.minReviews);
      if (typeof parsed.openNowOnly === "boolean") setOpenNowOnly(parsed.openNowOnly);
      if (typeof parsed.locationMatchOnly === "boolean") setLocationMatchOnly(parsed.locationMatchOnly);
      if (parsed.categoryFilter) setCategoryFilter(parsed.categoryFilter);
      if (parsed.viewMode) setViewMode(parsed.viewMode);
      prefsLoadedRef.current = true;
    } catch {
      prefsLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!prefsLoadedRef.current) return;
    const payload = {
      searchParams: {
        query: searchParams.query,
        location: searchParams.location,
        max_results: searchParams.max_results,
        extract_emails: searchParams.extract_emails,
        headless: searchParams.headless,
        aggressive_scroll: searchParams.aggressive_scroll,
      },
      filters,
      sortBy,
      minScore,
      minRating,
      minReviews,
      openNowOnly,
      locationMatchOnly,
      categoryFilter,
      viewMode,
    };
    localStorage.setItem("google_maps_prefs", JSON.stringify(payload));
  }, [
    searchParams,
    filters,
    sortBy,
    minScore,
    minRating,
    minReviews,
    openNowOnly,
    locationMatchOnly,
    categoryFilter,
    viewMode,
  ]);

  const scoreBusiness = (item: BusinessResult) => {
    let score = 0;
    if (item.email) score += 30;
    if (item.website) score += 20;
    if (item.phone) score += 15;
    if (item.rating) score += Math.min(20, Math.round(item.rating * 4));
    if ((item.reviews || 0) >= 50) score += 10;
    return score;
  };

  const getAreaKey = (address?: string | null) => {
    if (!address) return "Unknown";
    const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
    }
    return parts[0] || "Unknown";
  };

  const scoredResults: ScoredBusiness[] = useMemo(
    () =>
      results.map((item) => ({
        ...item,
        score: scoreBusiness(item),
      })),
    [results]
  );

  const filteredResults = useMemo(() => {
    const locationMatch = searchParams.location.trim().toLowerCase();
    return scoredResults
      .filter((item) => {
        if (filters.emailOnly && !item.email) return false;
        if (filters.phoneOnly && !item.phone) return false;
        if (filters.websiteOnly && !item.website) return false;
        if (item.score < minScore) return false;
        if (minRating > 0 && (item.rating || 0) < minRating) return false;
        if (minReviews > 0 && (item.reviews || 0) < minReviews) return false;
        if (openNowOnly && item.open_status !== "open") return false;
        if (locationMatchOnly && locationMatch) {
          const address = (item.address || "").toLowerCase();
          if (!address.includes(locationMatch)) return false;
        }
        if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
        if (selectedCluster !== "all" && getAreaKey(item.address) !== selectedCluster) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "rating":
            return (b.rating || 0) - (a.rating || 0);
          case "reviews":
            return (b.reviews || 0) - (a.reviews || 0);
          case "name":
            return (a.name || "").localeCompare(b.name || "");
          case "score":
          default:
            return (b.score || 0) - (a.score || 0);
        }
      });
  }, [
    filters,
    minScore,
    minRating,
    minReviews,
    openNowOnly,
    locationMatchOnly,
    categoryFilter,
    selectedCluster,
    scoredResults,
    sortBy,
    searchParams.location,
  ]);

  const uniqueResults = useMemo(() => {
    const seen = new Set<string>();
    const deduped: ScoredBusiness[] = [];
    for (const item of filteredResults) {
      const key = `${(item.name || "").toLowerCase()}|${(item.address || "").toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }
    return deduped;
  }, [filteredResults]);

  useEffect(() => {
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    if (results.length === 0) {
      setVisibleCount(0);
      return;
    }
    setVisibleCount(0);
    streamTimerRef.current = setInterval(() => {
      setVisibleCount((prev) => {
        const next = prev + 3;
        if (next >= uniqueResults.length) {
          if (streamTimerRef.current) {
            clearInterval(streamTimerRef.current);
            streamTimerRef.current = null;
          }
          return uniqueResults.length;
        }
        return next;
      });
    }, 160);
    return () => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    };
  }, [results, uniqueResults.length]);

  const areaClusters = useMemo(() => {
    const clusters = new Map<string, number>();
    uniqueResults.forEach((item) => {
      const key = getAreaKey(item.address);
      clusters.set(key, (clusters.get(key) || 0) + 1);
    });
    return Array.from(clusters.entries()).sort((a, b) => b[1] - a[1]);
  }, [uniqueResults]);

  useEffect(() => {
    if (selectedCluster === "all") return;
    if (!areaClusters.some(([cluster]) => cluster === selectedCluster)) {
      setSelectedCluster("all");
    }
  }, [areaClusters, selectedCluster]);

  const displayResults = useMemo(() => {
    if (visibleCount <= 0) return [];
    return uniqueResults.slice(0, Math.min(visibleCount, uniqueResults.length));
  }, [uniqueResults, visibleCount]);

  const mapQuery = `${searchParams.query} ${searchParams.location}`.trim();
  const mapEmbedUrl = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
    : "about:blank";

  const categories = useMemo(() => {
    const values = new Set<string>();
    results.forEach((item) => {
      if (item.category) values.add(item.category);
    });
    return ["all", ...Array.from(values).sort()];
  }, [results]);

  const stats = {
    total: results.length,
    withEmail: results.filter((item) => item.email).length,
    withPhone: results.filter((item) => item.phone).length,
    withWebsite: results.filter((item) => item.website).length,
  };

  const handleCopyAllEmails = async () => {
    const emails = uniqueResults
      .map((item) => item.email)
      .filter((email): email is string => Boolean(email));
    if (emails.length === 0) {
      showToast({
        type: "info",
        title: "No emails",
        message: "No emails found in current results",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(emails.join("\n"));
      showToast({
        type: "success",
        title: "Copied",
        message: `Copied ${emails.length} emails`,
      });
    } catch {
      showToast({
        type: "error",
        title: "Copy failed",
        message: "Could not copy emails",
      });
    }
  };

  const updateRecentSearches = (query: string, location: string) => {
    const entry = { query, location };
    setRecentSearches((prev) => {
      const next = [entry, ...prev.filter((item) => item.query !== query || item.location !== location)];
      return next.slice(0, 5);
    });
  };

  const getMapsUrl = (item: BusinessResult) => {
    const parts = [item.name, item.address].filter(Boolean).join(" ");
    const query = encodeURIComponent(parts || "");
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const handleUseRecentSearch = (entry: { query: string; location: string }) => {
    setSearchParams((prev) => ({
      ...prev,
      query: entry.query,
      location: entry.location,
    }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchParams.query.trim()) {
      showToast({
        type: "error",
        title: "Query required",
        message: "Please enter a search query",
      });
      return;
    }

    let progressTimers: NodeJS.Timeout[] = [];
    let elapsedTimer: NodeJS.Timeout | null = null;
    try {
      setLoading(true);
      setError(null);
      setResults([]);
      setProgressStep(0);
      setElapsedSeconds(0);

      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();
      progressTimers.push(setTimeout(() => setProgressStep(1), 1200));
      progressTimers.push(setTimeout(() => setProgressStep(2), 3500));
      progressTimers.push(setTimeout(() => setProgressStep(3), 6500));

      elapsedTimer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      const response = await apiClient.searchGoogleMaps({
        query: searchParams.query,
        location: searchParams.location || undefined,
        max_results: searchParams.max_results,
        extract_emails: searchParams.extract_emails,
        headless: searchParams.headless,
        aggressive_scroll: searchParams.aggressive_scroll,
        signal: abortRef.current.signal,
      });

      if (response.success) {
        setResults(response.results);
        updateRecentSearches(searchParams.query.trim(), searchParams.location.trim());
        showToast({
          type: "success",
          title: "Search completed",
          message: `Found ${response.total_found} businesses`,
        });
      } else {
        throw new Error("Search failed");
      }
    } catch (err: any) {
      console.error("Search error:", err);
      if (err?.name === "CanceledError") {
        showToast({
          type: "info",
          title: "Search stopped",
          message: "Google Maps search was cancelled.",
        });
        return;
      }
      const errorMessage = err?.response?.data?.detail || err?.message || "Failed to search Google Maps";
      setError(errorMessage);
      showToast({
        type: "error",
        title: "Search failed",
        message: errorMessage,
      });
    } finally {
      progressTimers.forEach((timer) => clearTimeout(timer));
      if (elapsedTimer) clearInterval(elapsedTimer);
      setLoading(false);
      abortRef.current = null;
      setProgressStep(0);
      setElapsedSeconds(0);
    }
  };

  const handleStopSearch = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  const handleCopy = (text: string | null | undefined, index: number) => {
    if (!text) return;
    
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    showToast({
      type: "success",
      title: "Copied",
      message: "Copied to clipboard",
    });
    
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExport = () => {
    if (uniqueResults.length === 0) {
      showToast({
        type: "error",
        title: "No data",
        message: "No results to export",
      });
      return;
    }

    const headers = ["Name", "Address", "Phone", "Email", "Website", "Rating", "Reviews", "Category", "OpenStatus"];
    const csvRows = [
      headers.join(","),
      ...uniqueResults.map((result) => {
        return [
          `"${result.name || ""}"`,
          `"${result.address || ""}"`,
          `"${result.phone || ""}"`,
          `"${result.email || ""}"`,
          `"${result.website || ""}"`,
          result.rating?.toString() || "",
          result.reviews?.toString() || "",
          `"${result.category || ""}"`,
          `"${result.open_status || ""}"`,
        ].join(",");
      }),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `google-maps-results-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showToast({
      type: "success",
      title: "Exported",
      message: "Results exported to CSV",
    });
  };

  const loadRecentImports = async () => {
    setImportsLoading(true);
    try {
      const data = await apiClient.getGoogleMapsRecentImports(50);
      setRecentImports(data || []);
      setSelectedImportIds(new Set());
    } catch (e: any) {
      showToast({
        type: "error",
        title: "Failed to load imports",
        message: e?.response?.data?.detail || e?.message || "Could not load recent imports",
      });
    } finally {
      setImportsLoading(false);
    }
  };

  const enrichSelectedImports = async () => {
    const ids = Array.from(selectedImportIds);
    if (ids.length === 0) return;

    setEnrichLoading(true);
    try {
      const res = await apiClient.enrichGoogleMapsLeads(ids);
      showToast({
        type: "success",
        title: "Enrichment queued",
        message: `Queued: ${res.queued ?? 0}, Skipped: ${res.skipped ?? 0}`,
      });
    } catch (e: any) {
      showToast({
        type: "error",
        title: "Enrichment failed",
        message: e?.response?.data?.detail || e?.message || "Could not enqueue enrichment",
      });
    } finally {
      setEnrichLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Google Maps Search"
        description="Search Google Maps for businesses and extract contact information"
        icon={Navigation}
        action={
          uniqueResults.length > 0 && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleExport}
                className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white shadow-lg shadow-emerald-500/25"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </motion.div>
          )
        }
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-7xl mx-auto space-y-6">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400 px-5 py-4 flex items-start gap-3 shadow-lg"
              >
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="font-semibold">Error:</strong> {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Extension Imports */}
          <FormCard
            title="Extension Imports"
            description="Import leads from the Chrome extension, then enrich them with emails/phones/social."
            icon={Navigation}
          >
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => window.open(`${API_URL}/api/extension/download`, "_blank")}>
                  Download Chrome Extension
                </Button>
                <Button variant="outline" onClick={() => window.open(`${API_URL}/api/google-maps/imports/export/csv`, "_blank")}>
                  Download CSV
                </Button>
                <Button variant="outline" onClick={() => window.open(`${API_URL}/api/google-maps/imports/export/xlsx`, "_blank")}>
                  Download XLSX
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={loadRecentImports} disabled={importsLoading}>
                  {importsLoading ? "Loading..." : "Refresh"}
                </Button>
                <Button
                  onClick={enrichSelectedImports}
                  disabled={enrichLoading || selectedImportIds.size === 0}
                >
                  {enrichLoading ? "Enriching..." : `Enrich Selected (${selectedImportIds.size})`}
                </Button>
              </div>
            </div>

            {recentImports.length === 0 ? (
              <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                No recent imports yet. Use the Chrome extension {"→"} Import to Backend, then click Refresh.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {recentImports.map((lead) => {
                  const selected = selectedImportIds.has(lead.id);
                  const primaryEmail = lead.emails?.[0] || null;
                  const primaryPhone = lead.phones?.[0] || null;
                  return (
                    <div
                      key={lead.id}
                      className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/30 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Checkbox
                          checked={selected}
                          onChange={(e) => {
                            const next = new Set(selectedImportIds);
                            if ((e.target as HTMLInputElement).checked) next.add(lead.id);
                            else next.delete(lead.id);
                            setSelectedImportIds(next);
                          }}
                          label={lead.name || `Lead #${lead.id}`}
                          description={lead.address || "No address"}
                        />

                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Website
                          </a>
                        )}
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          Email: {primaryEmail || "—"}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          Phone: {primaryPhone || "—"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </FormCard>

          {/* Search Form */}
          <FormCard
            title="Search Parameters"
            description="Enter your search query and location"
            icon={Search}
          >
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Search Query"
                  icon={Search}
                  required
                  value={searchParams.query}
                  onChange={(e) => setSearchParams({ ...searchParams, query: e.target.value })}
                  placeholder="e.g. orthopedic doctor, find doctor, restaurant"
                  helperText="What type of business are you looking for?"
                />
                <Input
                  label="Location"
                  icon={MapPin}
                  value={searchParams.location}
                  onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                  placeholder="e.g. New York, Los Angeles, CA"
                  helperText="Optional: Filter results by location"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Max Results"
                  type="number"
                  min={1}
                  max={100}
                  value={searchParams.max_results}
                  onChange={(e) =>
                    setSearchParams({
                      ...searchParams,
                      max_results: parseInt(e.target.value) || 20,
                    })
                  }
                  helperText="Maximum number of businesses to find (1-100)"
                />
                <div className="flex items-center pt-8">
                  <Checkbox
                    label="Extract Emails from Websites"
                    description="Visit each business website to extract email addresses (slower)"
                    checked={searchParams.extract_emails}
                    onChange={(e) =>
                      setSearchParams({
                        ...searchParams,
                        extract_emails: e.target.checked,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <Checkbox
                  label="Headless mode (faster, less reliable)"
                  checked={searchParams.headless}
                  onChange={(e) =>
                    setSearchParams({
                      ...searchParams,
                      headless: e.target.checked,
                    })
                  }
                />
                <Checkbox
                  label="Auto-retry scroll for more results"
                  checked={searchParams.aggressive_scroll}
                  onChange={(e) =>
                    setSearchParams({
                      ...searchParams,
                      aggressive_scroll: e.target.checked,
                    })
                  }
                />
                {!searchParams.headless && (
                  <span>Browser window will open to fetch full results.</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Quick limits:</span>
                {[10, 20, 50, 100].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() =>
                      setSearchParams((prev) => ({ ...prev, max_results: count }))
                    }
                    className={`rounded-full border px-3 py-1 transition-colors ${
                      searchParams.max_results === count
                        ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                        : "border-slate-200 dark:border-slate-700 hover:text-slate-700"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={loading || !searchParams.query.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 hover:from-blue-400 hover:via-cyan-400 hover:to-blue-400 text-white shadow-xl shadow-blue-500/25 dark:shadow-blue-500/40 text-base font-semibold py-6 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin relative z-10" />
                      <span className="relative z-10">Searching Google Maps...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2 relative z-10" />
                      <span className="relative z-10">Search Maps</span>
                    </>
                  )}
                </Button>
              </motion.div>
              {loading && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                    <span>
                      {progressStep === 0 && "Launching browser..."}
                      {progressStep === 1 && "Searching Google Maps..."}
                      {progressStep === 2 && "Collecting results..."}
                      {progressStep === 3 && "Extracting details..."}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>Elapsed: {elapsedSeconds}s</span>
                    <Button type="button" variant="outline" onClick={handleStopSearch}>
                      Stop search
                    </Button>
                  </div>
                </div>
              )}
            </form>

            {recentSearches.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3">
                  Recent searches
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((entry, idx) => (
                    <button
                      key={`${entry.query}-${entry.location}-${idx}`}
                      onClick={() => handleUseRecentSearch(entry)}
                      className="rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-cyan-600"
                    >
                      {entry.query}
                      {entry.location ? ` - ${entry.location}` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </FormCard>

          {/* Loading State */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-12 text-center shadow-2xl"
            >
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-2">
                Searching Google Maps...
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This may take a minute or two
              </p>
            </motion.div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  Results ({uniqueResults.length})
                </h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`px-2 py-1 rounded-full ${
                        viewMode === "list"
                          ? "bg-cyan-500/20 text-cyan-500"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      List
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("map")}
                      className={`px-2 py-1 rounded-full ${
                        viewMode === "map"
                          ? "bg-cyan-500/20 text-cyan-500"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Map
                    </button>
                  </div>
                  <Button variant="outline" onClick={handleCopyAllEmails}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy emails
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>Total: {stats.total}</span>
                <span>With email: {stats.withEmail}</span>
                <span>With phone: {stats.withPhone}</span>
                <span>With website: {stats.withWebsite}</span>
                <span>Unique: {uniqueResults.length}</span>
                {visibleCount < uniqueResults.length && (
                  <span className="text-cyan-600 dark:text-cyan-400">
                    Streaming {Math.min(visibleCount, uniqueResults.length)} of {uniqueResults.length}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <Checkbox
                  label="Only with email"
                  checked={filters.emailOnly}
                  onChange={(e) => setFilters((prev) => ({ ...prev, emailOnly: e.target.checked }))}
                />
                <Checkbox
                  label="Only with phone"
                  checked={filters.phoneOnly}
                  onChange={(e) => setFilters((prev) => ({ ...prev, phoneOnly: e.target.checked }))}
                />
                <Checkbox
                  label="Only with website"
                  checked={filters.websiteOnly}
                  onChange={(e) => setFilters((prev) => ({ ...prev, websiteOnly: e.target.checked }))}
                />
                <Checkbox
                  label="Open now"
                  checked={openNowOnly}
                  onChange={(e) => setOpenNowOnly(e.target.checked)}
                />
                <Checkbox
                  label="Within location"
                  checked={locationMatchOnly}
                  onChange={(e) => setLocationMatchOnly(e.target.checked)}
                />
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Min score</span>
                  <Input
                    value={minScore.toString()}
                    onChange={(e) => setMinScore(Number(e.target.value || 0))}
                    className="w-20"
                    fullWidth={false}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Min rating</span>
                  <Input
                    value={minRating.toString()}
                    onChange={(e) => setMinRating(Number(e.target.value || 0))}
                    className="w-20"
                    fullWidth={false}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Min reviews</span>
                  <Input
                    value={minReviews.toString()}
                    onChange={(e) => setMinReviews(Number(e.target.value || 0))}
                    className="w-24"
                    fullWidth={false}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Category</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-2 py-1 text-xs text-slate-700 dark:text-slate-300"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category === "all" ? "All categories" : category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Sort by</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-2 py-1 text-xs text-slate-700 dark:text-slate-300"
                  >
                    <option value="score">Lead score</option>
                    <option value="rating">Rating</option>
                    <option value="reviews">Reviews</option>
                    <option value="name">Name</option>
                  </select>
                </div>
              </div>

              {viewMode === "map" && (
                <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
                  <div className="rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
                    <iframe
                      title="Google Maps"
                      src={mapEmbedUrl}
                      className="w-full h-[420px] bg-white"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <div className="rounded-3xl border border-slate-200/50 dark:border-slate-800/50 p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Area clusters</h3>
                      <button
                        type="button"
                        className="text-xs text-slate-500 hover:text-cyan-600"
                        onClick={() => setSelectedCluster("all")}
                      >
                        Reset
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {areaClusters.length === 0 && (
                        <span className="text-xs text-slate-500">No clusters yet.</span>
                      )}
                      {areaClusters.map(([cluster, count]) => (
                        <button
                          key={cluster}
                          type="button"
                          onClick={() => setSelectedCluster(cluster)}
                          className={`px-2.5 py-1 rounded-full text-xs border transition ${
                            selectedCluster === cluster
                              ? "border-cyan-500 text-cyan-600 bg-cyan-500/10"
                              : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {cluster} ({count})
                        </button>
                      ))}
                    </div>
                    <div className="relative h-40 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
                      {areaClusters.slice(0, 10).map(([cluster, count], idx) => (
                        <div
                          key={cluster}
                          className="absolute flex items-center justify-center rounded-full bg-cyan-500/80 text-white text-[10px] font-semibold shadow"
                          style={{
                            width: 18 + Math.min(count * 3, 24),
                            height: 18 + Math.min(count * 3, 24),
                            left: `${(idx * 17) % 80 + 10}%`,
                            top: `${(idx * 29) % 60 + 10}%`,
                          }}
                          title={`${cluster} (${count})`}
                        >
                          {count}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Clusters are grouped by address region (best-effort).
                    </p>
                  </div>
                </div>
              )}

              {viewMode === "list" && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {displayResults.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      No results match the current filters.
                    </div>
                  ) : (
                    displayResults.map((business, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl hover:shadow-2xl transition-all"
                      >
                        {/* Business Name & Rating */}
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2 flex-1">
                            <Building2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <span className="line-clamp-2">{business.name || "Unknown Business"}</span>
                          </h3>
                          <div className="flex items-center gap-2">
                            <div
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                business.score >= 70
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
                                  : business.score >= 45
                                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/40"
                                    : "bg-slate-500/15 text-slate-300 border border-slate-500/40"
                              }`}
                            >
                              Score {business.score}
                            </div>
                            {business.open_status && (
                              <div
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  business.open_status === "open"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
                                    : "bg-rose-500/15 text-rose-400 border border-rose-500/40"
                                }`}
                              >
                                {business.open_status === "open" ? "Open now" : "Closed"}
                              </div>
                            )}
                            {business.rating && (
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-800 flex-shrink-0">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                  {business.rating}
                                </span>
                                {business.reviews && (
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    ({business.reviews})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Category */}
                        {business.category && (
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-3 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 inline-block">
                            {business.category}
                          </p>
                        )}

                        {/* Address */}
                        {business.address && (
                          <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
                            <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                              {business.address}
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleCopy(business.address, index)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                              title="Copy address"
                            >
                              {copiedIndex === index ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4 text-slate-400" />
                              )}
                            </motion.button>
                          </div>
                        )}

                        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors mb-2">
                          <a
                            href={getMapsUrl(business)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline flex-1 min-w-0"
                          >
                            <Navigation className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Open in Maps</span>
                          </a>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleCopy(getMapsUrl(business), index)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex-shrink-0 ml-2"
                            title="Copy maps link"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                          </motion.button>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                          {business.phone && (
                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <Phone className="w-4 h-4 text-slate-500" />
                                <span>{business.phone}</span>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleCopy(business.phone, index)}
                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                                title="Copy phone"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                              </motion.button>
                            </div>
                          )}

                          {business.email && (
                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 flex-1 min-w-0">
                                <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                <span className="truncate">{business.email}</span>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleCopy(business.email, index)}
                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex-shrink-0 ml-2"
                                title="Copy email"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                              </motion.button>
                            </div>
                          )}

                          {business.website && (
                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                              <a
                                href={business.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline flex-1 min-w-0"
                              >
                                <Globe className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">Visit Website</span>
                              </a>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleCopy(business.website, index)}
                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex-shrink-0 ml-2"
                                title="Copy website"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

            </motion.section>
          )}

          {/* Empty States */}
          {!loading && results.length === 0 && searchParams.query && (
            <motion.section
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-12 text-center shadow-2xl"
            >
              <Navigation className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
                No results found
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Try adjusting your search query or location.
              </p>
            </motion.section>
          )}

          {!loading && !searchParams.query && (
            <motion.section
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-12 text-center shadow-2xl"
            >
              <Search className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
                Ready to Search
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Enter a search query to find businesses on Google Maps
              </p>
            </motion.section>
          )}
        </div>
      </main>
    </div>
  );
}
