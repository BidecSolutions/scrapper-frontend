"use client";

import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormCard } from "@/components/ui/FormCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import {
  Search,
  MapPin,
  Database,
  Settings,
  Mail,
  Phone,
  Globe,
  Users,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
} from "lucide-react";

export default function NewJobPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <NewJobPageInner />
    </Suspense>
  );
}

function NewJobPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    niche: "",
    location: "",
    max_results: 20,
    max_pages_per_site: 5,
    sources: {
      google_search: true,
      google_places: false,
      web_search: false,
      crawling: true,
    },
    extract: {
      emails: true,
      phones: true,
      website_content: false,
      services: true,
      social_links: true,
      social_numbers: true,
    },
  });

  useEffect(() => {
    const niche = searchParams?.get("niche");
    const location = searchParams?.get("location");
    if (niche || location) {
      setFormData((prev) => ({
        ...prev,
        niche: niche || prev.niche,
        location: location || prev.location,
      }));
    }
  }, [searchParams]);

  const presets = [
    {
      label: "Local services",
      niche: "dentist clinic",
      location: "New York",
      max_results: 50,
      max_pages_per_site: 5,
      sources: { google_search: true, google_places: true, web_search: false, crawling: true },
    },
    {
      label: "Restaurants",
      niche: "restaurant",
      location: "Dubai",
      max_results: 80,
      max_pages_per_site: 4,
      sources: { google_search: true, google_places: true, web_search: false, crawling: true },
    },
    {
      label: "SaaS leads",
      niche: "B2B SaaS",
      location: "",
      max_results: 120,
      max_pages_per_site: 6,
      sources: { google_search: true, google_places: false, web_search: true, crawling: true },
    },
  ];

  const estimatedMinutes = Math.max(1, Math.round(formData.max_results / 25));
  const estimatedCredits = Math.max(1, Math.round(formData.max_results * 0.6));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const sources: string[] = [];
      if (formData.sources.google_search) sources.push("google_search");
      if (formData.sources.google_places) sources.push("google_places");
      if (formData.sources.web_search) sources.push("web_search");
      if (formData.sources.crawling) sources.push("crawling");
      
      const job = await apiClient.createJob({
        niche: formData.niche,
        location: formData.location || undefined,
        max_results: formData.max_results,
        max_pages_per_site: formData.max_pages_per_site,
        sources: sources.length > 0 ? sources : undefined,
        extract: formData.extract,
      });

      showToast({
        type: "success",
        title: `Job "${formData.niche}${formData.location ? ` - ${formData.location}` : ""}" started`,
        message: "The job is running in the background. You'll be notified when it completes.",
        action: {
          label: "View progress",
          onClick: () => router.push(`/jobs/${job.id}`),
        },
      });

      // Redirect to job detail page to see live progress
      router.push(`/jobs/${job.id}`);
    } catch (error: any) {
      console.error("Failed to create job:", error);
      
      let errorMessage = "Failed to create job. Please try again.";
      if (error?.response?.data?.detail) {
        errorMessage = `Failed to create job: ${error.response.data.detail}`;
      } else if (error?.message) {
        errorMessage = `Failed to create job: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="New Scrape Job"
        description="Create a new lead scraping and enrichment job to discover and collect business information"
        backUrl="/jobs"
        icon={Zap}
      />

      <main className="max-w-5xl mx-auto px-6 pt-6 pb-12">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 rounded-2xl bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400 px-5 py-4 flex items-start gap-3 shadow-lg"
            >
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="font-semibold">Error:</strong> {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <FormCard
            title="Quick presets"
            description="Start with a recommended configuration"
            icon={Zap}
            delay={0.05}
          >
            <div className="grid gap-3 md:grid-cols-3">
              {presets.map((preset) => (
                <motion.button
                  type="button"
                  key={preset.label}
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      niche: preset.niche,
                      location: preset.location,
                      max_results: preset.max_results,
                      max_pages_per_site: preset.max_pages_per_site,
                      sources: { ...prev.sources, ...preset.sources },
                    }))
                  }
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 px-4 py-3 text-left hover:border-cyan-400/60 transition-colors"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{preset.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {preset.niche} {preset.location ? `- ${preset.location}` : ""}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    {preset.max_results} leads, {preset.max_pages_per_site} pages/site
                  </p>
                </motion.button>
              ))}
            </div>
          </FormCard>

          {/* Basic Information */}
          <FormCard
            title="Basic Information"
            description="Define what you're looking for"
            icon={Search}
            delay={0.1}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Niche"
                icon={Search}
                required
                value={formData.niche}
                onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                placeholder="e.g. dentist clinic, restaurant, hospital"
                helperText="The type of business or industry you want to find"
              />
              <Input
                label="Location"
                icon={MapPin}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Karachi, London, Dubai"
                helperText="Optional: Filter results by location"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Max Results"
                type="number"
                min={1}
                max={500}
                value={formData.max_results}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_results: parseInt(e.target.value) || 20,
                  })
                }
                helperText="Maximum number of leads to collect (1-500)"
              />
              <Input
                label="Max Pages Per Site"
                type="number"
                min={1}
                max={20}
                value={formData.max_pages_per_site}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_pages_per_site: parseInt(e.target.value) || 5,
                  })
                }
                helperText="How many pages to crawl per website (1-20)"
              />
            </div>
          </FormCard>

          {/* Data Sources */}
          <FormCard
            title="Data Sources"
            description="Select which sources to use for finding leads"
            icon={Database}
            delay={0.2}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20 transition-all cursor-pointer"
                onClick={() =>
                  setFormData({
                    ...formData,
                    sources: { ...formData.sources, google_search: !formData.sources.google_search },
                  })
                }
              >
                <Checkbox
                  label="Google Custom Search"
                  description="Search Google for business listings"
                  checked={formData.sources.google_search}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sources: { ...formData.sources, google_search: e.target.checked },
                    })
                  }
                />
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20 transition-all cursor-pointer"
                onClick={() =>
                  setFormData({
                    ...formData,
                    sources: { ...formData.sources, google_places: !formData.sources.google_places },
                  })
                }
              >
                <Checkbox
                  label="Google Places"
                  description="Requires Google Places API key"
                  checked={formData.sources.google_places}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sources: { ...formData.sources, google_places: e.target.checked },
                    })
                  }
                />
                <span className="ml-7 mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-medium">
                  API Key Required
                </span>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20 transition-all cursor-pointer"
                onClick={() =>
                  setFormData({
                    ...formData,
                    sources: { ...formData.sources, web_search: !formData.sources.web_search },
                  })
                }
              >
                <Checkbox
                  label="Web Search (Bing)"
                  description="Requires Bing Search API key"
                  checked={formData.sources.web_search}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sources: { ...formData.sources, web_search: e.target.checked },
                    })
                  }
                />
                <span className="ml-7 mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-medium">
                  API Key Required
                </span>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20 transition-all cursor-pointer"
                onClick={() =>
                  setFormData({
                    ...formData,
                    sources: { ...formData.sources, crawling: !formData.sources.crawling },
                  })
                }
              >
                <Checkbox
                  label="Website Crawling"
                  description="Crawl websites for additional data"
                  checked={formData.sources.crawling}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sources: { ...formData.sources, crawling: e.target.checked },
                    })
                  }
                />
                <span className="ml-7 mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium">
                  Enrichment
                </span>
              </motion.div>
            </div>
          </FormCard>

          {/* Data Extraction */}
          <FormCard
            title="What data to extract"
            description="Choose what information to collect from websites"
            icon={Sparkles}
            delay={0.3}
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { key: "emails", label: "Email addresses", icon: Mail, description: "Extract email addresses from websites" },
                { key: "phones", label: "Phone numbers", icon: Phone, description: "Find phone numbers and contact info" },
                { key: "services", label: "Services / Categories", icon: FileText, description: "Identify business services" },
                { key: "social_links", label: "Social media links", icon: Globe, description: "Find social media profiles" },
                { key: "social_numbers", label: "Contacts from social", icon: Users, description: "Extract contacts from social pages" },
                { key: "website_content", label: "Full website content", icon: FileText, description: "Extract all website text content" },
              ].map((item) => (
                <motion.div
                  key={item.key}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-all cursor-pointer"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      extract: { ...formData.extract, [item.key]: !formData.extract[item.key as keyof typeof formData.extract] },
                    })
                  }
                >
                  <Checkbox
                    label={item.label}
                    description={item.description}
                    checked={formData.extract[item.key as keyof typeof formData.extract] as boolean}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extract: { ...formData.extract, [item.key]: e.target.checked },
                      })
                    }
                  />
                </motion.div>
              ))}
            </div>
          </FormCard>

          <FormCard
            title="Estimated usage"
            description="Quick estimate based on your selections"
            icon={Settings}
            delay={0.35}
          >
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Estimated time</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
                  {estimatedMinutes} min
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Estimated credits</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
                  {estimatedCredits}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Sources selected</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
                  {Object.values(formData.sources).filter(Boolean).length}
                </p>
              </div>
            </div>
          </FormCard>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex gap-4 pt-4"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1"
            >
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 hover:from-cyan-400 hover:via-blue-400 hover:to-cyan-400 text-white shadow-xl shadow-cyan-500/25 dark:shadow-cyan-500/40 text-base font-semibold py-6 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin relative z-10" />
                    <span className="relative z-10">Creating Job...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2 relative z-10" />
                    <span className="relative z-10">Create Scrape Job</span>
                  </>
                )}
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
                className="px-8 py-6 text-base"
              >
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        </motion.form>
      </main>
    </div>
  );
}
