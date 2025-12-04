"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { List } from "@/types/lists";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, List as ListIcon, Loader2, Trash2, Edit2, Users, Search, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
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
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHeader
        title="Lists"
        description="Organize leads into lists for campaigns and outreach"
        icon={ListIcon}
        action={
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => router.push("/lists/new")}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              New List
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
              label="Search Lists"
              icon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              helperText={`${filteredLists.length} list${filteredLists.length !== 1 ? "s" : ""} found`}
            />
          </motion.section>

          {/* Lists Grid */}
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
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading lists...</p>
              </motion.div>
            ) : filteredLists.length === 0 ? (
              <motion.section
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-12 text-center shadow-2xl"
              >
                <ListIcon className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
                  {searchQuery ? "No lists found" : "No lists yet"}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Create lists to organize leads for campaigns, outreach, or tracking purposes"}
                </p>
                {!searchQuery && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => router.push("/lists/new")}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First List
                    </Button>
                  </motion.div>
                )}
              </motion.section>
            ) : (
              <motion.section
                key="lists"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                {filteredLists.map((list, index) => (
                  <motion.div
                    key={list.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl hover:shadow-2xl transition-all cursor-pointer group"
                    onClick={() => router.push(`/lists/${list.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg">
                        <ListIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex gap-2">
                        {list.is_campaign_ready && (
                          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          </div>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/lists/${list.id}/edit`);
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
                            handleDelete(list.id);
                          }}
                          className="p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {list.name}
                    </h3>
                    {list.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                        {list.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Users className="w-4 h-4" />
                        <span className="font-semibold text-slate-900 dark:text-slate-50">
                          {list.total_leads || 0}
                        </span>
                        <span>leads</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(list.created_at)}
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
