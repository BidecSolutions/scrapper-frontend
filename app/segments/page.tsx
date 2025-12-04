"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { Segment } from "@/types/segments";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Layers, Loader2, Trash2, Edit2, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
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
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Segments"
        description="Organize leads into segments for targeted campaigns"
        icon={Layers}
        action={
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => router.push("/segments/new")}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Segment
            </Button>
          </motion.div>
        }
      />

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-6 pb-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Search */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-2xl"
          >
            <Input
              label="Search Segments"
              icon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              helperText={`${filteredSegments.length} segment${filteredSegments.length !== 1 ? "s" : ""} found`}
            />
          </motion.section>

          {/* Segments Grid */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-16"
              >
                <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mx-auto mb-4" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading segments...</p>
              </motion.div>
            ) : filteredSegments.length === 0 ? (
              <motion.section
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-12 text-center shadow-2xl"
              >
                <Layers className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
                  {searchQuery ? "No segments found" : "No segments yet"}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Create your first segment to organize leads"}
                </p>
                {!searchQuery && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => router.push("/segments/new")}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Segment
                    </Button>
                  </motion.div>
                )}
              </motion.section>
            ) : (
              <motion.section
                key="segments"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                {filteredSegments.map((segment, index) => (
                  <motion.div
                    key={segment.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl hover:shadow-2xl transition-all cursor-pointer group"
                    onClick={() => router.push(`/segments/${segment.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg">
                        <Layers className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/segments/${segment.id}/edit`);
                          }}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                        >
                          <Edit2 className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(segment.id);
                          }}
                          className="p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {segment.name}
                    </h3>
                    {segment.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                        {segment.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Users className="w-4 h-4" />
                        <span className="font-semibold text-slate-900 dark:text-slate-50">
                          {segment.total_leads || 0}
                        </span>
                        <span>leads</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(segment.created_at)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
