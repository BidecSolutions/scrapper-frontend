"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import {
  Sparkles,
  Layers,
  List as ListIcon,
  ArrowLeft,
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

    // Validate source selection
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lookalike Jobs
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              New Lookalike Job
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Find similar leads based on your best-performing segments or lists
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-6 pb-10">
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

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Source Selection */}
          <section className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Source Selection</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Choose a segment or list to find similar leads</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Source Type Selection */}
              <div className="grid gap-3 md:grid-cols-2">
                <label className="group relative flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 cursor-pointer transition-all">
                  <input
                    type="radio"
                    name="sourceType"
                    checked={formData.sourceType === "segment"}
                    onChange={() => setFormData({ ...formData, sourceType: "segment", sourceListId: null })}
                    className="mt-0.5 w-5 h-5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-50">Segment</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Use a segment as the source</p>
                  </div>
                </label>

                <label className="group relative flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 cursor-pointer transition-all">
                  <input
                    type="radio"
                    name="sourceType"
                    checked={formData.sourceType === "list"}
                    onChange={() => setFormData({ ...formData, sourceType: "list", sourceSegmentId: null })}
                    className="mt-0.5 w-5 h-5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ListIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-50">List</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Use a list as the source</p>
                  </div>
                </label>
              </div>

              {/* Segment Selection */}
              {formData.sourceType === "segment" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Select Segment *
                  </label>
                  {loadingSources ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading segments...
                    </div>
                  ) : segments.length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400 p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      No segments available. <button type="button" onClick={() => router.push("/segments/new")} className="text-indigo-600 dark:text-indigo-400 hover:underline">Create one first</button>
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.sourceSegmentId || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, sourceSegmentId: parseInt(e.target.value) || null })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                    >
                      <option value="">-- Select a segment --</option>
                      {segments.map((segment) => (
                        <option key={segment.id} value={segment.id}>
                          {segment.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* List Selection */}
              {formData.sourceType === "list" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Select List *
                  </label>
                  {loadingSources ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading lists...
                    </div>
                  ) : lists.length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400 p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      No lists available. <button type="button" onClick={() => router.push("/lists/new")} className="text-indigo-600 dark:text-indigo-400 hover:underline">Create one first</button>
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.sourceListId || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, sourceListId: parseInt(e.target.value) || null })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                    >
                      <option value="">-- Select a list --</option>
                      {lists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name} ({list.total_leads} leads)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Job Settings */}
          <section className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/30">
                <Settings className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Job Settings</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Configure similarity threshold and result limits</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Minimum Similarity Score
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.minScore}
                  onChange={(e) =>
                    setFormData({ ...formData, minScore: parseFloat(e.target.value) || 0.7 })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Only include leads with similarity score ≥ {formData.minScore} (0.0 - 1.0)
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Max Results
                </label>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={formData.maxResults}
                  onChange={(e) =>
                    setFormData({ ...formData, maxResults: parseInt(e.target.value) || 1000 })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Maximum number of lookalike leads to find (1 - 5000)
                </p>
              </div>
            </div>
          </section>

          {/* Info Section */}
          <section className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-indigo-900 dark:text-indigo-200">
                <p className="font-semibold mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-indigo-800 dark:text-indigo-300">
                  <li>AI analyzes patterns from your selected source (industry, size, tech, location)</li>
                  <li>Finds leads with similar characteristics across your workspace</li>
                  <li>Ranks results by similarity score (higher = more similar)</li>
                  <li>Results are saved and can be added to segments or lists</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="submit"
              disabled={loading || !formData.sourceType || loadingSources}
              className="bg-indigo-500 hover:bg-indigo-400 text-white dark:text-slate-950 font-semibold min-w-[140px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Job
                </>
              )}
            </Button>
          </div>
        </motion.form>
      </main>
    </div>
  );
}

