"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormCard } from "@/components/ui/FormCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import {
  Sparkles,
  Layers,
  List as ListIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Settings,
} from "lucide-react";
import type { Segment } from "@/types/segments";
import type { List } from "@/types/lists";

type SourceType = "segment" | "list" | null;

export default function NewLookalikeJobPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  
  const [formData, setFormData] = useState({
    sourceType: null as SourceType,
    sourceSegmentId: null as number | null,
    sourceListId: null as number | null,
    minScore: 0.7,
    maxResults: 1000,
  });

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      setLoadingSources(true);
      const [segmentsData, listsData] = await Promise.all([
        apiClient.getSegments().catch(() => []),
        apiClient.getLists().catch(() => []),
      ]);
      setSegments(segmentsData);
      setLists(listsData);
    } catch (err) {
      console.error("Error loading sources:", err);
    } finally {
      setLoadingSources(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.sourceType) {
      setError("Please select a source (segment or list)");
      setLoading(false);
      return;
    }

    if (formData.sourceType === "segment" && !formData.sourceSegmentId) {
      setError("Please select a segment");
      setLoading(false);
      return;
    }

    if (formData.sourceType === "list" && !formData.sourceListId) {
      setError("Please select a list");
      setLoading(false);
      return;
    }

    try {
      const job = await apiClient.createLookalikeJob({
        source_segment_id: formData.sourceType === "segment" ? formData.sourceSegmentId! : undefined,
        source_list_id: formData.sourceType === "list" ? formData.sourceListId! : undefined,
        min_score: formData.minScore,
        max_results: formData.maxResults,
      });

      showToast({
        type: "success",
        title: "Lookalike job created",
        message: "The job is processing in the background. You'll be redirected to view results.",
        action: {
          label: "View job →",
          onClick: () => router.push(`/lookalike/jobs/${job.id}`),
        },
      });

      router.push(`/lookalike/jobs/${job.id}`);
    } catch (error: any) {
      console.error("Failed to create lookalike job:", error);
      
      let errorMessage = "Failed to create lookalike job. Please try again.";
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
        title="New Lookalike Job"
        description="Find similar leads based on your best-performing segments or lists"
        backUrl="/lookalike/jobs"
        icon={Sparkles}
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
          {/* Source Selection */}
          <FormCard
            title="Source Selection"
            description="Choose a segment or list to find similar leads"
            icon={Sparkles}
            delay={0.1}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { key: "segment" as SourceType, label: "Segment", icon: Layers, description: "Use a segment as the source" },
                { key: "list" as SourceType, label: "List", icon: ListIcon, description: "Use a list as the source" },
              ].map((option) => (
                <motion.div
                  key={option.key}
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => setFormData({
                    ...formData,
                    sourceType: option.key,
                    sourceSegmentId: option.key === "segment" ? formData.sourceSegmentId : null,
                    sourceListId: option.key === "list" ? formData.sourceListId : null,
                  })}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.sourceType === option.key
                      ? "border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-lg"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-cyan-300 dark:hover:border-cyan-700"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      formData.sourceType === option.key
                        ? "bg-cyan-500 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                    }`}>
                      <option.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="radio"
                          name="sourceType"
                          checked={formData.sourceType === option.key}
                          onChange={() => setFormData({
                            ...formData,
                            sourceType: option.key,
                            sourceSegmentId: option.key === "segment" ? formData.sourceSegmentId : null,
                            sourceListId: option.key === "list" ? formData.sourceListId : null,
                          })}
                          className="w-4 h-4 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className="font-semibold text-slate-900 dark:text-slate-50">{option.label}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{option.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {formData.sourceType === "segment" && (
                <motion.div
                  key="segment"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  {loadingSources ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/30">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading segments...
                    </div>
                  ) : segments.length === 0 ? (
                    <div className="text-sm text-slate-600 dark:text-slate-400 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
                      No segments available.{" "}
                      <button
                        type="button"
                        onClick={() => router.push("/segments/new")}
                        className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                      >
                        Create one first
                      </button>
                    </div>
                  ) : (
                    <Select
                      label="Select Segment"
                      required
                      value={formData.sourceSegmentId?.toString() || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, sourceSegmentId: parseInt(e.target.value) || null })
                      }
                      options={[
                        { value: "", label: "-- Select a segment --" },
                        ...segments.map((segment) => ({
                          value: segment.id.toString(),
                          label: segment.name,
                        })),
                      ]}
                    />
                  )}
                </motion.div>
              )}

              {formData.sourceType === "list" && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  {loadingSources ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/30">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading lists...
                    </div>
                  ) : lists.length === 0 ? (
                    <div className="text-sm text-slate-600 dark:text-slate-400 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
                      No lists available.{" "}
                      <button
                        type="button"
                        onClick={() => router.push("/lists/new")}
                        className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                      >
                        Create one first
                      </button>
                    </div>
                  ) : (
                    <Select
                      label="Select List"
                      required
                      value={formData.sourceListId?.toString() || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, sourceListId: parseInt(e.target.value) || null })
                      }
                      options={[
                        { value: "", label: "-- Select a list --" },
                        ...lists.map((list) => ({
                          value: list.id.toString(),
                          label: `${list.name} (${list.total_leads} leads)`,
                        })),
                      ]}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </FormCard>

          {/* Job Settings */}
          <FormCard
            title="Job Settings"
            description="Configure similarity threshold and result limits"
            icon={Settings}
            delay={0.2}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Minimum Similarity Score"
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={formData.minScore}
                onChange={(e) =>
                  setFormData({ ...formData, minScore: parseFloat(e.target.value) || 0.7 })
                }
                helperText={`Only include leads with similarity score ≥ ${formData.minScore} (0.0 - 1.0)`}
              />
              <Input
                label="Max Results"
                type="number"
                min={1}
                max={5000}
                value={formData.maxResults}
                onChange={(e) =>
                  setFormData({ ...formData, maxResults: parseInt(e.target.value) || 1000 })
                }
                helperText="Maximum number of lookalike leads to find (1 - 5000)"
              />
            </div>
          </FormCard>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl glass border border-cyan-200/50 dark:border-cyan-800/50 bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/20 dark:to-blue-950/20 p-6 shadow-xl"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-2 flex items-center gap-2">
                  How it works
                </h3>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {[
                    "AI analyzes patterns from your selected source (industry, size, tech, location)",
                    "Finds leads with similar characteristics across your workspace",
                    "Ranks results by similarity score (higher = more similar)",
                    "Results are saved and can be added to segments or lists",
                  ].map((item, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      className="flex items-start gap-2"
                    >
                      <span className="text-cyan-500 mt-0.5">•</span>
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-end pt-4"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                disabled={loading || !formData.sourceType || loadingSources}
                className="bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 hover:from-cyan-400 hover:via-blue-400 hover:to-cyan-400 text-white shadow-xl shadow-cyan-500/25 dark:shadow-cyan-500/40 text-base font-semibold px-8 py-6 min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin relative z-10" />
                    <span className="relative z-10">Creating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2 relative z-10" />
                    <span className="relative z-10">Create Lookalike Job</span>
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </motion.form>
      </main>
    </div>
  );
}
