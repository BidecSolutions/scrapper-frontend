"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { List } from "@/types/lists";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, List as ListIcon, Loader2, Trash2, Edit2, Users, Search, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";

export default function ListsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  async function load() {
    try {
      setLoading(true);
      const data = await apiClient.getLists();
      setLists(data);
    } catch (err: any) {
      console.error("Error loading lists:", err);
      showToast({
        type: "error",
        title: "Failed to load lists",
        message: err?.response?.data?.detail || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (listId: number) => {
    if (!confirm("Are you sure you want to delete this list? This will not delete the leads, only the list itself.")) return;
    
    try {
      await apiClient.deleteList(listId);
      showToast({
        type: "success",
        title: "List deleted",
        message: "The list has been successfully deleted.",
      });
      load();
    } catch (err: any) {
      console.error("Error deleting list:", err);
      showToast({
        type: "error",
        title: "Failed to delete list",
        message: err?.response?.data?.detail || "Please try again",
      });
    }
  };

  const filteredLists = lists.filter((list) =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Lists</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Organize leads into lists for campaigns and outreach
          </p>
        </div>
        <Button
          onClick={() => router.push("/lists/new")}
          className="bg-cyan-500 hover:bg-cyan-400 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New List
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search lists..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filteredLists.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 border border-slate-800 px-6 py-10 flex flex-col items-center text-center"
        >
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/40 mb-4">
            <ListIcon className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold mb-1 text-slate-100">No lists yet</h2>
          <p className="text-xs text-slate-400 max-w-md mb-6">
            Create lists to organize leads for campaigns, outreach, or tracking purposes.
          </p>
          <Button
            onClick={() => router.push("/lists/new")}
            className="bg-cyan-500 hover:bg-cyan-400 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First List
          </Button>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLists.map((list) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/lists/${list.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {list.name}
                    </h3>
                    {list.is_campaign_ready && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  {list.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {list.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/lists/${list.id}/edit`);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(list.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {list.total_leads} {list.total_leads === 1 ? "lead" : "leads"}
                </span>
                <span>{formatDate(list.created_at)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

