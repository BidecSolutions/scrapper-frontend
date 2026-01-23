"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Linkedin,
    MapPin,
    Briefcase,
    User,
    ExternalLink,
    Download,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Sparkles,
    ArrowRight,
    Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { ModernCard } from "@/components/ui/ModernCard";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface LinkedInProfile {
    full_name: string | null;
    headline: string | null;
    company_name: string | null;
    location: string | null;
    linkedin_url: string;
    success: boolean;
    error?: string | null;
}

export default function LinkedInScraperPage() {
    const { showToast } = useToast();
    const [query, setQuery] = useState("");
    const [maxResults, setMaxResults] = useState(10);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<LinkedInProfile[]>([]);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) {
            showToast({ title: "Please enter a search query", type: "error" });
            return;
        }

        setLoading(true);
        setSearched(true);
        setResults([]);

        try {
            const response = await apiClient.searchLinkedIn({
                query,
                max_results: maxResults,
                headless: true
            });

            if (response.success) {
                // Fix type mismatch by ensuring undefined becomes null or handled
                const sanitizedResults = response.results.map(r => ({
                    ...r,
                    full_name: r.full_name ?? null,
                    headline: r.headline ?? null,
                    company_name: r.company_name ?? null,
                    location: r.location ?? null,
                    error: r.error ?? null
                })) as LinkedInProfile[];

                setResults(sanitizedResults);
                showToast({ title: `Found ${response.results.length} profiles`, type: "success" });
            } else {
                showToast({ title: "Failed to search LinkedIn", type: "error" });
            }
        } catch (error: any) {
            console.error("Search error:", error);
            showToast({
                title: "Search failed",
                message: error.response?.data?.detail || "An error occurred during search",
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        if (results.length === 0) return;

        const headers = ["Full Name", "Headline", "Company", "Location", "LinkedIn URL"];
        const csvContent = [
            headers.join(","),
            ...results.map(r => [
                `"${r.full_name || ""}"`,
                `"${r.headline || ""}"`,
                `"${r.company_name || ""}"`,
                `"${r.location || ""}"`,
                `"${r.linkedin_url}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `linkedin_profiles_${query.replace(/\s+/g, "_")}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="sticky top-0 z-30 w-full border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Linkedin className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">LinkedIn Scraper</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Find and extract professional data</p>
                        </div>
                    </div>

                    {results.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={exportToCSV}
                            className="hidden sm:flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </Button>
                    )}
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
                {/* Search Section */}
                <section className="mb-12">
                    <ModernCard className="border-none shadow-2xl shadow-slate-200 dark:shadow-none bg-white dark:bg-slate-900 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
                        <div className="p-8 pb-10">
                            <div className="max-w-3xl mx-auto text-center mb-8">
                                <Badge variant="secondary" className="mb-4 px-3 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-none">
                                    <Sparkles className="w-3 h-3 mr-2" />
                                    AI-Powered X-Ray Search
                                </Badge>
                                <h2 className="text-3xl font-bold mb-4">Who are you looking for?</h2>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Enter a job title, domain, or keywords to find matching LinkedIn profiles.
                                    We'll use Google X-Ray search to bypass limits and extract detailed data.
                                </p>
                            </div>

                            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <Input
                                            placeholder="e.g. Software Engineer at Google, Marketing Manager in London..."
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            className="pl-10 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all rounded-xl"
                                        />
                                    </div>
                                    <div className="w-full sm:w-32">
                                        <Input
                                            type="number"
                                            min={1}
                                            max={50}
                                            value={maxResults}
                                            onChange={(e) => setMaxResults(parseInt(e.target.value))}
                                            className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl"
                                            placeholder="Limit"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 transition-all rounded-xl"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                Search
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <div className="mt-4 flex items-center justify-center gap-6 text-sm text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        No LinkedIn login required
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Bypass search limits
                                    </div>
                                </div>
                            </form>
                        </div>
                    </ModernCard>
                </section>

                {/* Results Section */}
                <section>
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-20"
                            >
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full border-4 border-blue-100 dark:border-slate-800 border-t-blue-600 animate-spin" />
                                    <Linkedin className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="mt-6 text-xl font-semibold">Scanning LinkedIn...</h3>
                                <p className="text-slate-500 mt-2">This may take a minute as we extract profile details.</p>
                            </motion.div>
                        ) : results.length > 0 ? (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                            >
                                {results.map((profile, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <ModernCard className="h-full hover:shadow-xl transition-shadow duration-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group">
                                            <div className="p-6">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-white dark:border-slate-700 shadow-sm">
                                                            <User className="w-7 h-7 text-slate-400" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-bold group-hover:text-blue-600 transition-colors">
                                                                {profile.full_name || "Unknown Name"}
                                                            </h4>
                                                            <p className="text-sm text-slate-500 line-clamp-1">{profile.headline}</p>
                                                        </div>
                                                    </div>
                                                    <a
                                                        href={profile.linkedin_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                                    >
                                                        <ExternalLink className="w-5 h-5" />
                                                    </a>
                                                </div>

                                                <div className="space-y-3 mt-6">
                                                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                                        <Briefcase className="w-4 h-4 text-blue-500" />
                                                        <span className="font-medium">{profile.company_name || "Not specified"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                                        <MapPin className="w-4 h-4 text-rose-500" />
                                                        <span>{profile.location || "Location unknown"}</span>
                                                    </div>
                                                </div>

                                                {!profile.success && (
                                                    <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                                                        <AlertCircle className="w-4 h-4" />
                                                        Partial data: {profile.error || "Could not extract full details"}
                                                    </div>
                                                )}
                                            </div>
                                        </ModernCard>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : searched ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-20"
                            >
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 mb-6">
                                    <Search className="w-10 h-10 text-slate-400" />
                                </div>
                                <h3 className="text-xl font-semibold">No profiles found</h3>
                                <p className="text-slate-500 mt-2 max-w-md mx-auto">
                                    We couldn't find any LinkedIn profiles matching "{query}".
                                    Try adjusting your search terms or increasing the limit.
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-8"
                                    onClick={() => setSearched(false)}
                                >
                                    Clear search
                                </Button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10"
                            >
                                <div className="text-center p-6">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-4">
                                        <Search className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <h4 className="font-bold mb-2">X-Ray Search</h4>
                                    <p className="text-sm text-slate-500">Search LinkedIn profiles via Google to bypass platform restrictions and limits.</p>
                                </div>
                                <div className="text-center p-6">
                                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center mx-auto mb-4">
                                        <Briefcase className="w-6 h-6 text-cyan-600" />
                                    </div>
                                    <h4 className="font-bold mb-2">Rich Data</h4>
                                    <p className="text-sm text-slate-500">Extract headlines, current companies, locations, and more directly from profile pages.</p>
                                </div>
                                <div className="text-center p-6">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                                        <Download className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <h4 className="font-bold mb-2">Export Ready</h4>
                                    <p className="text-sm text-slate-500">Download your findings as a clean CSV file for your CRM or outreach tools.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>
            </main>

            {/* Footer info */}
            <footer className="py-10 border-t bg-white dark:bg-slate-900">
                <div className="container mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-4">
                        <Info className="w-4 h-4" />
                        <span>This tool uses automated browsing to collect publicly available data.</span>
                    </div>
                    <p className="text-xs text-slate-500">© 2024 Lead Scraper Pro. Built for efficiency.</p>
                </div>
            </footer>
        </div>
    );
}
