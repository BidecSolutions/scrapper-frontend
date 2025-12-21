"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Plus, Loader2, Search } from "lucide-react";
import { apiClient } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";

export default function RobotsPage() {
  const [robots, setRobots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "runs">("recent");
  const [recentOnly, setRecentOnly] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadRobots();
  }, []);

  const loadRobots = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getRobots();
      setRobots(data);
    } catch (error) {
      console.error("Failed to load robots:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const totalRuns = robots.reduce((sum, r) => sum + (r.runs_count || 0), 0);
  const now = Date.now();
  const last7DaysMs = 7 * 24 * 60 * 60 * 1000;
  const getLastActivity = (robot: any) => {
    const raw = robot.last_run_at || robot.updated_at || robot.created_at;
    return raw ? new Date(raw).getTime() : 0;
  };
  const activeLast7Days = robots.filter((robot) => now - getLastActivity(robot) <= last7DaysMs).length;
  const newThisWeek = robots.filter((robot) => {
    if (!robot.created_at) return false;
    return now - new Date(robot.created_at).getTime() <= last7DaysMs;
  }).length;
  const hasActivityTimestamps = robots.some((robot) => robot.last_run_at || robot.updated_at);
  const filteredRobots = robots
    .filter((robot) => {
      if (!query.trim()) return true;
      const haystack = `${robot.name || ""} ${robot.description || ""}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    })
    .filter((robot) => {
      if (!recentOnly) return true;
      if (!hasActivityTimestamps) {
        return (robot.runs_count || 0) > 0;
      }
      return now - getLastActivity(robot) <= last7DaysMs;
    })
    .sort((a, b) => {
      if (sortBy === "runs") {
        return (b.runs_count || 0) - (a.runs_count || 0);
      }
      return getLastActivity(b) - getLastActivity(a);
    });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800">
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
                Universal Robots
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                AI-powered web scrapers that extract custom data from any website.
              </p>
            </div>
            <Link href="/robots/new">
              <button className="inline-flex items-center rounded-lg bg-cyan-500 hover:bg-cyan-400 text-xs font-medium px-4 py-2 shadow-sm transition-colors">
                <Plus className="w-4 h-4 mr-1.5" />
                New Robot
              </button>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-6 pt-6 pb-10 space-y-4">
          <p className="text-[11px] text-slate-400">
            {robots.length} robots - {totalRuns} total runs this week
          </p>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
              <p className="text-[11px] text-slate-400">Total Robots</p>
              <p className="text-lg font-semibold text-slate-100">{robots.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
              <p className="text-[11px] text-slate-400">Total Runs</p>
              <p className="text-lg font-semibold text-slate-100">{totalRuns}</p>
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
              <p className="text-[11px] text-slate-400">Active in 7 Days</p>
              <p className="text-lg font-semibold text-slate-100">{activeLast7Days}</p>
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
              <p className="text-[11px] text-slate-400">New This Week</p>
              <p className="text-lg font-semibold text-slate-100">{newThisWeek}</p>
            </div>
          </section>

          <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Search robots"
                icon={Search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or description"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`text-[11px] font-medium px-3 py-2 rounded-lg border transition-colors ${
                  recentOnly
                    ? "border-cyan-400/60 text-cyan-200 bg-cyan-500/10"
                    : "border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
                onClick={() => setRecentOnly((prev) => !prev)}
                disabled={!hasActivityTimestamps && robots.length === 0}
              >
                Recent Activity
              </button>
              <button
                className={`text-[11px] font-medium px-3 py-2 rounded-lg border transition-colors ${
                  sortBy === "recent"
                    ? "border-cyan-400/60 text-cyan-200 bg-cyan-500/10"
                    : "border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
                onClick={() => setSortBy("recent")}
              >
                Sort: Recent
              </button>
              <button
                className={`text-[11px] font-medium px-3 py-2 rounded-lg border transition-colors ${
                  sortBy === "runs"
                    ? "border-cyan-400/60 text-cyan-200 bg-cyan-500/10"
                    : "border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
                onClick={() => setSortBy("runs")}
              >
                Sort: Runs
              </button>
            </div>
          </section>

          {filteredRobots.length === 0 ? (
            <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 text-xs text-slate-400 text-center">
              <Bot className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-100 mb-2 text-sm">
                {robots.length === 0 ? "No robots created yet" : "No robots match your filters"}
              </p>
              <p className="mb-4">
                {robots.length === 0
                  ? "Create your first AI-powered robot to extract custom data from websites"
                  : "Try clearing filters or updating your search query."}
              </p>
              {robots.length === 0 && (
                <Link href="/robots/new">
                  <button className="inline-flex items-center rounded-lg bg-cyan-500 hover:bg-cyan-400 text-xs font-medium px-4 py-2 shadow-sm transition-colors">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create Robot
                  </button>
                </Link>
              )}
            </section>
          ) : (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRobots.map((robot, idx) => (
                <motion.article
                  key={robot.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => router.push(`/robots/${robot.id}`)}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 hover:border-cyan-400/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="text-sm font-semibold line-clamp-2 text-slate-100">
                      {robot.name}
                    </h2>
                    <button
                      className="text-[11px] text-slate-400 hover:text-slate-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Add menu
                      }}
                    >
                      ...
                    </button>
                  </div>
                  {robot.description && (
                    <p className="text-[11px] text-slate-400 mb-4 line-clamp-2">
                      {robot.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{robot.runs_count || 0} runs</span>
                    <span>Created {new Date(robot.created_at).toLocaleDateString()}</span>
                  </div>
                  <button
                    className="mt-3 text-[11px] font-medium text-cyan-300 hover:text-cyan-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/robots/${robot.id}`);
                    }}
                  >
                    View Robot
                  </button>
                </motion.article>
              ))}
            </section>
          )}
        </main>
      </div>
  );
}

