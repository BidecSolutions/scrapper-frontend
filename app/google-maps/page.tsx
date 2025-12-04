"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api";
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
}

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
  });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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

    try {
      setLoading(true);
      setError(null);
      setResults([]);

      const response = await apiClient.searchGoogleMaps({
        query: searchParams.query,
        location: searchParams.location || undefined,
        max_results: searchParams.max_results,
        extract_emails: searchParams.extract_emails,
        headless: true,
      });

      if (response.success) {
        setResults(response.results);
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
      const errorMessage = err?.response?.data?.detail || err?.message || "Failed to search Google Maps";
      setError(errorMessage);
      showToast({
        type: "error",
        title: "Search failed",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
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
    if (results.length === 0) {
      showToast({
        type: "error",
        title: "No data",
        message: "No results to export",
      });
      return;
    }

    // Convert to CSV
    const headers = ["Name", "Address", "Phone", "Email", "Website", "Rating", "Reviews", "Category"];
    const csvRows = [
      headers.join(","),
      ...results.map((result) => {
        return [
          `"${result.name || ""}"`,
          `"${result.address || ""}"`,
          `"${result.phone || ""}"`,
          `"${result.email || ""}"`,
          `"${result.website || ""}"`,
          result.rating?.toString() || "",
          result.reviews?.toString() || "",
          `"${result.category || ""}"`,
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <Navigation className="w-6 h-6 text-blue-500" />
                Google Maps Search
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Search Google Maps for businesses and extract contact information
              </p>
            </div>
            {results.length > 0 && (
              <Button
                onClick={handleExport}
                className="bg-green-500 hover:bg-green-400 text-white dark:text-slate-950"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 md:px-8 pt-6 pb-10">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-4 py-3 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="font-semibold">Error:</strong> {error}
            </div>
          </motion.div>
        )}

        {/* Search Form */}
        <motion.form
          onSubmit={handleSearch}
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Search Parameters</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Enter your search query and location</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Search className="w-4 h-4" />
                  Search Query *
                </label>
                <input
                  type="text"
                  required
                  value={searchParams.query}
                  onChange={(e) =>
                    setSearchParams({ ...searchParams, query: e.target.value })
                  }
                  placeholder="e.g. orthopedic doctor, find doctor, restaurant"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4" />
                  Location
                </label>
                <input
                  type="text"
                  value={searchParams.location}
                  onChange={(e) =>
                    setSearchParams({ ...searchParams, location: e.target.value })
                  }
                  placeholder="e.g. New York, Los Angeles, CA"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Max Results
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={searchParams.max_results}
                  onChange={(e) =>
                    setSearchParams({
                      ...searchParams,
                      max_results: parseInt(e.target.value) || 20,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={searchParams.extract_emails}
                    onChange={(e) =>
                      setSearchParams({
                        ...searchParams,
                        extract_emails: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                  />
                  Extract Emails from Websites
                  <span className="text-xs text-slate-500">(slower)</span>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visit each business website to extract email addresses
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="submit"
                disabled={loading || !searchParams.query.trim()}
                className="bg-blue-500 hover:bg-blue-400 text-white dark:text-slate-950 font-semibold min-w-[140px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search Maps
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.form>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Searching Google Maps...
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                This may take a minute or two
              </p>
            </div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Results ({results.length})
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.map((business, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 hover:shadow-lg transition-shadow"
                >
                  {/* Business Name */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-500" />
                      {business.name || "Unknown Business"}
                    </h3>
                    {business.rating && (
                      <div className="flex items-center gap-1 text-xs bg-yellow-50 dark:bg-yellow-950/30 px-2 py-1 rounded-full">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{business.rating}</span>
                        {business.reviews && (
                          <span className="text-slate-500">({business.reviews})</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Category */}
                  {business.category && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                      {business.category}
                    </p>
                  )}

                  {/* Address */}
                  {business.address && (
                    <div className="flex items-start gap-2 mb-3 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-600 dark:text-slate-400 flex-1">
                        {business.address}
                      </span>
                      <button
                        onClick={() => handleCopy(business.address, index)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        title="Copy address"
                      >
                        {copiedIndex === index ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Contact Information */}
                  <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    {business.phone && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Phone className="w-4 h-4" />
                          <span>{business.phone}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(business.phone, index)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Copy phone"
                        >
                          <Copy className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                    )}

                    {business.email && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{business.email}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(business.email, index)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Copy email"
                        >
                          <Copy className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                    )}

                    {business.website && (
                      <div className="flex items-center justify-between text-sm">
                        <a
                          href={business.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline truncate"
                        >
                          <Globe className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Website</span>
                        </a>
                        <button
                          onClick={() => handleCopy(business.website, index)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Copy website"
                        >
                          <Copy className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {!loading && results.length === 0 && searchParams.query && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Navigation className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No results found. Try adjusting your search query or location.
            </p>
          </motion.div>
        )}

        {!loading && !searchParams.query && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enter a search query to find businesses on Google Maps
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}

