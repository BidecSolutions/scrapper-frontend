"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { DeliverabilityCard } from "@/components/dashboard/DeliverabilityCard";
import { LinkedInActivityCard } from "@/components/dashboard/LinkedInActivityCard";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { PipelineCard } from "@/components/dashboard/PipelineCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { ActivityInsightsMini } from "@/components/dashboard/ActivityInsightsMini";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, TrendingUp, Users, Target, Zap, Activity, BarChart3, Clock, Loader2, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { formatRelativeTime } from "@/lib/time";
import { StatusChip } from "@/components/jobs/StatusChip";
import { MetricCard } from "@/components/ui/metrics";

// Lazy load heavy components
const LazyPerformanceInsights = dynamic(() => import("@/components/dashboard/PerformanceInsights").then(mod => ({ default: mod.PerformanceInsights })), {
  loading: () => <div className="h-32 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-cyan-500" /></div>,
  ssr: false,
});

const LazyActivityFeed = dynamic(() => import("@/components/dashboard/ActivityFeed").then(mod => ({ default: mod.ActivityFeed })), {
  loading: () => <div className="h-32 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-cyan-500" /></div>,
  ssr: false,
});

interface DashboardStats {
  total_leads: number;
  leads_this_month: number;
  month_change: number;
  avg_lead_score: number;
  ai_enriched_pct: number;
  recent_jobs: Array<{
    id: number;
    niche: string;
    location: string | null;
    status: string;
    result_count: number;
    created_at: string;
  }>;
}

// Simplified animations for better performance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthStats, setHealthStats] = useState<any>(null);
  const [deliverability, setDeliverability] = useState<any>(null);
  const [seedingDemo, setSeedingDemo] = useState(false);

  const loadHealthStats = useCallback(async () => {
    try {
      const data = await apiClient.getHealthScoreStats();
      setHealthStats(data);
    } catch (error) {
      console.error("Failed to load health stats:", error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDeliverability = useCallback(async () => {
    try {
      const data = await apiClient.getDeliverabilityStats();
      setDeliverability(data);
    } catch (error) {
      console.error("Failed to load deliverability stats:", error);
    }
  }, []);

  const handleSeedDemo = useCallback(async () => {
    setSeedingDemo(true);
    try {
      await apiClient.seedDemoData();
      await Promise.all([loadStats(), loadHealthStats(), loadDeliverability()]);
    } catch (error) {
      console.error("Failed to seed demo data:", error);
    } finally {
      setSeedingDemo(false);
    }
  }, [loadStats, loadHealthStats, loadDeliverability]);

  useEffect(() => {
    // Load all API calls in parallel for faster loading
    Promise.all([loadStats(), loadHealthStats(), loadDeliverability()]).catch((error) => {
      console.error("Failed to load dashboard data:", error);
    });
  }, [loadStats, loadHealthStats, loadDeliverability]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatChange = (change: number) => {
    if (change === 0) return null;
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(0)}%`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 min-h-screen">
      {/* Modern Animated Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-20 glass border-b border-slate-200/50 dark:border-slate-800/50 shadow-lg"
      >
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-50 dark:via-slate-100 dark:to-slate-50 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              Overview of your lead generation, enrichment, and verification
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Link href="/jobs/new">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 hover:from-cyan-400 hover:via-blue-400 hover:to-cyan-400 text-sm font-semibold px-6 py-3 shadow-xl shadow-cyan-500/25 dark:shadow-cyan-500/40 transition-all text-white relative overflow-hidden group"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <Plus className="w-4 h-4 mr-2 relative z-10" />
                <span className="relative z-10">New Scrape Job</span>
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content with Staggered Animations */}
      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar px-6 pt-8 pb-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto space-y-8"
        >
          {/* KPIs - Enhanced with Icons */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.section
                key="loading"
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-2xl glass border border-slate-200/50 dark:border-slate-800/50 h-32 animate-pulse"
                  />
                ))}
              </motion.section>
            ) : stats ? (
              <motion.section
                key="stats"
                variants={itemVariants}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                <MetricCard
                  label="Total Leads"
                  value={formatNumber(stats.total_leads)}
                  icon={Users}
                  change={stats.month_change}
                />
                <MetricCard
                  label="This Month"
                  value={formatNumber(stats.leads_this_month)}
                  tone="info"
                  icon={TrendingUp}
                  change={stats.month_change}
                />
                <MetricCard
                  label="Avg Lead Score"
                  value={stats.avg_lead_score.toFixed(1)}
                  tone="success"
                  icon={Target}
                />
                <MetricCard
                  label="AI Enriched"
                  value={`${stats.ai_enriched_pct}%`}
                  tone="info"
                  icon={Zap}
                />
              </motion.section>
            ) : null}
          </AnimatePresence>

          {stats && stats.total_leads === 0 && (
            <motion.section
              variants={itemVariants}
              className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl"
            >
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
                  Get started in one click
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                  Seed demo data to explore jobs, leads, verification, robots, and lookalike results instantly.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleSeedDemo}
                  disabled={seedingDemo}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg"
                >
                  {seedingDemo ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Seeding demo data...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Seed Demo Data
                    </>
                  )}
                </Button>
                <Link href="/jobs/new">
                  <Button variant="outline">Create a Job</Button>
                </Link>
              </div>
            </motion.section>
          )}

          {/* Health Score Summary - Modern Card */}
          {healthStats && (
            <motion.section
              variants={itemVariants}
              className="relative rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-8 shadow-2xl overflow-hidden group"
            >
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2 mb-1">
                      <Target className="w-5 h-5 text-cyan-500" />
                      Data Health Overview
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Average health score across all leads
                    </p>
                  </div>
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="text-right"
                  >
                    <div className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                      {healthStats.average_score.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">out of 100</div>
                  </motion.div>
                </div>
                
                <div className="grid grid-cols-5 gap-4">
                  {Object.entries(healthStats.grade_distribution).map(([grade, count], index) => {
                    const gradeColors: Record<string, { bg: string; text: string }> = {
                      A: { bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
                      B: { bg: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
                      C: { bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
                      D: { bg: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
                      F: { bg: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
                    };
                    const color = gradeColors[grade] || { bg: "bg-slate-400", text: "text-slate-600" };
                    const percentage = ((count as number) / healthStats.total_leads) * 100;
                    
                    return (
                      <motion.div
                        key={grade}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="text-center"
                      >
                        <div className="relative h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ delay: 0.7 + index * 0.1, duration: 0.8 }}
                            className={`h-full ${color.bg} rounded-full`}
                          />
                        </div>
                        <div className={`text-sm font-bold ${color.text}`}>{grade}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{count as number}</div>
                      </motion.div>
                    );
                  })}
                </div>
                
                {healthStats.top_recommendations && healthStats.top_recommendations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-800/50"
                  >
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-500" />
                      Top Recommendations:
                    </p>
                    <ul className="space-y-2">
                      {healthStats.top_recommendations.slice(0, 3).map((rec: any, idx: number) => (
                        <motion.li
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.1 + idx * 0.1 }}
                          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                          {rec.action} <span className="text-xs text-slate-500">({rec.count} leads)</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </div>
            </motion.section>
          )}

          {deliverability && (
            <motion.section
              variants={itemVariants}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <MetricCard
                label="Verification Rate"
                value={`${deliverability.verification_rate}%`}
                tone="info"
                icon={CheckCircle2}
              />
              <MetricCard
                label="Valid Emails"
                value={formatNumber(deliverability.breakdown?.valid?.count || 0)}
                tone="success"
                icon={Mail}
              />
              <MetricCard
                label="Risky Emails"
                value={formatNumber(deliverability.breakdown?.risky?.count || 0)}
                tone="warning"
                icon={AlertCircle}
              />
            </motion.section>
          )}

          {/* Advanced Features Row 1: Trends & Quick Actions */}
          <motion.section
            variants={itemVariants}
            className="grid gap-6 lg:grid-cols-3"
          >
            {/* Leads Trend Chart */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="lg:col-span-2 rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-2xl h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2 mb-1">
                    <BarChart3 className="w-5 h-5 text-cyan-500" />
                    Leads Trend (Last 7 Days)
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Track your lead generation performance
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                    {stats ? formatNumber(stats.leads_this_month) : "0"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">This month</div>
                </div>
              </div>
              <div className="h-32 -mx-2">
                <TrendChart
                  data={[
                    { date: "Mon", value: 12 },
                    { date: "Tue", value: 19 },
                    { date: "Wed", value: 15 },
                    { date: "Thu", value: 25 },
                    { date: "Fri", value: 22 },
                    { date: "Sat", value: 18 },
                    { date: "Sun", value: stats?.leads_this_month || 0 },
                  ]}
                  color="cyan"
                />
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-2xl h-full flex flex-col"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-cyan-500" />
                Quick Actions
              </h3>
              <QuickActions />
            </motion.div>
          </motion.section>

          {/* Advanced Features Row 2: Activity & Insights */}
          <motion.section
            variants={itemVariants}
            className="grid gap-6 lg:grid-cols-2"
          >
            {/* Activity Feed */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-2xl h-full flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-500" />
                  Recent Activity
                </h3>
                <Link href="/activity">
                  <motion.button
                    whileHover={{ x: 4 }}
                    className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-semibold flex items-center gap-1"
                  >
                    View all
                    <span aria-hidden>→</span>
                  </motion.button>
                </Link>
              </div>
              <LazyActivityFeed />
              <div className="mt-4 border-t border-slate-200/50 dark:border-slate-800/60 pt-4">
                <ActivityInsightsMini />
              </div>
            </motion.div>

            {/* Performance Insights */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-2xl h-full flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-500" />
                  AI Insights
                </h3>
                <span className="text-xs px-2 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-medium">
                  Live
                </span>
              </div>
              <LazyPerformanceInsights />
            </motion.div>
          </motion.section>

          {/* Pipeline + Deliverability - Enhanced Grid */}
          <motion.section
            variants={itemVariants}
            className="grid gap-6 md:grid-cols-[2fr,1.4fr]"
          >
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <PipelineCard />
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <DeliverabilityCard />
            </motion.div>
          </motion.section>

          {/* LinkedIn capture & Getting started */}
          <motion.section
            variants={itemVariants}
            className="grid gap-6 md:grid-cols-2"
          >
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <LinkedInActivityCard />
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <OnboardingChecklist />
            </motion.div>
          </motion.section>

          {/* Recent Jobs - Modern Card Design */}
          <motion.section
            variants={itemVariants}
            className="rounded-3xl glass border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-5 border-b border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-r from-slate-50/50 to-white/50 dark:from-slate-900/50 dark:to-slate-800/50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-500" />
                  Recent Jobs
                </h2>
                <Link href="/jobs">
                  <motion.button
                    whileHover={{ x: 4 }}
                    className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-semibold flex items-center gap-1"
                  >
                    View all
                    <span aria-hidden>→</span>
                  </motion.button>
                </Link>
              </div>
            </div>
            
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  exit={{ opacity: 0 }}
                  className="p-6"
                >
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse"
                      />
                    ))}
                  </div>
                </motion.div>
              ) : stats && stats.recent_jobs.length > 0 ? (
                <motion.div
                  key="jobs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="divide-y divide-slate-200/50 dark:divide-slate-800/50"
                >
                  {stats.recent_jobs.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ backgroundColor: "rgba(6, 182, 212, 0.05)" }}
                    >
                      <Link
                        href={`/jobs/${job.id}`}
                        className="block px-6 py-5 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <motion.span
                                whileHover={{ scale: 1.05 }}
                                className="font-semibold text-slate-900 dark:text-slate-50 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate text-lg"
                              >
                                {job.niche}
                              </motion.span>
                              {job.location && (
                                <span className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                                  {job.location}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                              <span>{formatRelativeTime(job.created_at)}</span>
                              <span>-</span>
                              <span className="font-medium text-cyan-600 dark:text-cyan-400">{job.result_count} leads</span>
                            </div>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <StatusChip status={job.status as any} />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-12 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 mb-4"
                  >
                    <Plus className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                  </motion.div>
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    No recent jobs
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    Create your first scraping job to get started
                  </p>
                  <Link href="/jobs/new">
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-sm font-semibold px-6 py-3 text-white shadow-lg shadow-cyan-500/25 transition-all"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Job
                    </motion.button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </motion.div>
      </main>
    </div>
  );
}
