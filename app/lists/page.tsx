"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api";
import type { List } from "@/types/lists";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, List as ListIcon, Loader2, Trash2, Edit2, Users, Search, CheckCircle2, Upload, Download } from "lucide-react";
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
  const [filterMode, setFilterMode] = useState<"all" | "campaign" | "new" | "large">("all");
  const [minLeads, setMinLeads] = useState<number | null>(null);
  const [savedQueries, setSavedQueries] = useState<Array<{ name: string; minLeads: number | null; search: string; mode: string }>>([]);
  const [queryName, setQueryName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
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
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("lists_saved_queries");
      const parsed = stored ? JSON.parse(stored) : [];
      setSavedQueries(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSavedQueries([]);
    }
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

  const filteredLists = lists.filter((list) => {
    if (!list.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (minLeads !== null && (list.total_leads || 0) < minLeads) {
      return false;
    }
    if (filterMode === "campaign") {
      return list.is_campaign_ready;
    }
    if (filterMode === "large") {
      return (list.total_leads || 0) >= 500;
    }
    if (filterMode === "new") {
      const createdAt = new Date(list.created_at).getTime();
      return Date.now() - createdAt <= 7 * 24 * 60 * 60 * 1000;
    }
    return true;
  });

  const handleSaveQuery = () => {
    if (!queryName.trim()) return;
    const next = [
      { name: queryName.trim(), minLeads, search: searchQuery, mode: filterMode },
      ...savedQueries,
    ].slice(0, 10);
    setSavedQueries(next);
    localStorage.setItem("lists_saved_queries", JSON.stringify(next));
    setQueryName("");
  };

  const handleApplyQuery = (query: { name: string; minLeads: number | null; search: string; mode: string }) => {
    setSearchQuery(query.search);
    setMinLeads(query.minLeads);
    setFilterMode(query.mode as typeof filterMode);
  };

  const handleExport = () => {
    const rows = [
      ["name", "total_leads", "campaign_ready", "created_at"],
      ...filteredLists.map((list) => [
        list.name,
        String(list.total_leads || 0),
        list.is_campaign_ready ? "yes" : "no",
        list.created_at,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lists_export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const parsed = lines.slice(0, 20);
      showToast({
        type: "success",
        title: "Import preview ready",
        message: `Parsed ${lines.length} rows. First rows: ${parsed.slice(0, 3).join(" | ")}`,
      });
    };
    reader.readAsText(file);
  };

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
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportFile}
              className="hidden"
            />
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => router.push("/lists/new")}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25"
              >
                <Plus className="w-4 h-4 mr-2" />
                New List
              </Button>
            </motion.div>
          </div>
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
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>Min leads:</span>
              <input
                type="number"
                min={0}
                value={minLeads ?? ""}
                onChange={(e) => setMinLeads(e.target.value ? Number(e.target.value) : null)}
                className="w-24 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-2 py-1"
              />
              <div className="ml-auto flex items-center gap-2">
                <input
                  value={queryName}
                  onChange={(e) => setQueryName(e.target.value)}
                  placeholder="Save query name"
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-2 py-1 text-xs"
                />
                <Button variant="outline" size="sm" onClick={handleSaveQuery}>
                  Save query
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { key: "all", label: "All lists" },
                { key: "campaign", label: "Campaign ready" },
                { key: "new", label: "New this week" },
                { key: "large", label: "Large lists" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFilterMode(filter.key as typeof filterMode)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
                    filterMode === filter.key
                      ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40"
                      : "bg-white/60 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-200/70 dark:border-slate-700/70 hover:border-cyan-400/60"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {savedQueries.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {savedQueries.map((query) => (
                  <button
                    key={query.name}
                    onClick={() => handleApplyQuery(query)}
                    className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    {query.name}
                  </button>
                ))}
              </div>
            )}
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
                {filteredLists.map((list, index) => {
                  const tags: string[] = [];
                  if (list.is_campaign_ready) tags.push("Campaign ready");
                  if ((list.total_leads || 0) >= 500) tags.push("Large");
                  const createdAt = new Date(list.created_at).getTime();
                  if (Date.now() - createdAt <= 7 * 24 * 60 * 60 * 1000) tags.push("New");
                  return (
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
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
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
                  );
                })}
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
