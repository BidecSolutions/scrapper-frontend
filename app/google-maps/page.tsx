"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormCard } from "@/components/ui/FormCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
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
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Google Maps Search"
        description="Search Google Maps for businesses and extract contact information"
        icon={Navigation}
        action={
          results.length > 0 && (
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
            </form>
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
                  Results ({results.length})
                </h2>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {results.map((business, index) => (
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
                      {business.rating && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-800 flex-shrink-0 ml-2">
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
                ))}
              </div>
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
