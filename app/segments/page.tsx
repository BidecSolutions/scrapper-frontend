"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { Segment } from "@/types/segments";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Layers, Loader2, Trash2, Edit2, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";

export default function SegmentsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  async function load() {
    try {
      setLoading(true);
      const data = await apiClient.getSegments();
      setSegments(data);
    } catch (err: any) {
      console.error("Error loading segments:", err);
      showToast({
        type: "error",
        title: "Failed to load segments",
        message: err?.response?.data?.detail || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Segments</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Organize leads into segments for targeted campaigns
          </p>
        </div>
        <Button
          onClick={() => router.push("/segments/new")}
          className="bg-cyan-500 hover:bg-cyan-400 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Segment
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search segments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filteredSegments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 border border-slate-800 px-6 py-10 flex flex-col items-center text-center"
        >
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/40 mb-4">
            <Layers className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold mb-1 text-slate-100">No segments yet</h2>
          <p className="text-xs text-slate-400 max-w-md mb-6">
            Create segments to group leads based on filters like location, score, or source.
          </p>
          <Button
            onClick={() => router.push("/segments/new")}
            className="bg-cyan-500 hover:bg-cyan-400 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Segment
          </Button>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSegments.map((segment) => (
            <motion.div
              key={segment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/segments/${segment.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    {segment.name}
                  </h3>
                  {segment.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {segment.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/segments/${segment.id}/edit`);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(segment.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Filters
                </span>
                <span>{formatDate(segment.created_at)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

